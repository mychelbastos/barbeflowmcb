import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    const { type, data, action } = body;

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Shared: fetch all MP connections upfront
    const { data: connections, error: connError } = await supabase
      .from('mercadopago_connections')
      .select('tenant_id, access_token');

    if (connError || !connections?.length) {
      console.error('No MP connections found');
      return new Response(
        JSON.stringify({ error: 'No connections' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =============================================
    // SUBSCRIPTION PREAPPROVAL NOTIFICATIONS
    // =============================================
    if (type === 'subscription_preapproval' && data?.id) {
      return await handleSubscriptionPreapproval(supabase, data.id, connections);
    }

    // =============================================
    // SUBSCRIPTION AUTHORIZED PAYMENT
    // =============================================
    if (type === 'subscription_authorized_payment' && data?.id) {
      return await handleSubscriptionPayment(supabase, data.id, connections);
    }

    // =============================================
    // PAYMENT NOTIFICATIONS (existing logic)
    // =============================================
    if (type !== 'payment' || !data?.id) {
      console.log('Ignoring notification type:', type);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpPaymentId = data.id;
    console.log('Processing payment notification:', mpPaymentId, 'action:', action);

    let mpPaymentData: any = null;
    let usedConnection: any = null;

    for (const conn of connections) {
      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
          headers: { 'Authorization': `Bearer ${conn.access_token}` },
        });
        if (mpResponse.ok) {
          mpPaymentData = await mpResponse.json();
          usedConnection = conn;
          break;
        }
      } catch (e) {
        console.log('Connection failed for tenant:', conn.tenant_id);
      }
    }

    if (!mpPaymentData) {
      console.error('Could not fetch payment from MP:', mpPaymentId);
      return new Response(
        JSON.stringify({ error: 'Payment not found in MP' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('MP payment data:', JSON.stringify({
      id: mpPaymentData.id,
      status: mpPaymentData.status,
      external_reference: mpPaymentData.external_reference,
      metadata: mpPaymentData.metadata,
    }));

    let paymentId = mpPaymentData.metadata?.payment_id || mpPaymentData.external_reference;
    
    if (!paymentId) {
      console.error('No payment_id found in metadata or external_reference');
      return new Response(
        JSON.stringify({ error: 'No internal payment reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    let { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('id', paymentId)
      .maybeSingle();

    let customerPackageId: string | null = null;
    
    if (!payment) {
      console.log('Payment not found by id, trying by booking_id:', paymentId);
      const { data: paymentByBooking } = await supabase
        .from('payments')
        .select('*, booking:bookings(*)')
        .eq('booking_id', paymentId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (paymentByBooking) {
        payment = paymentByBooking;
        paymentId = paymentByBooking.id;
        console.log('Found payment by booking_id:', paymentId);
      }
    }

    if (!payment) {
      console.error('Internal payment not found:', paymentId);
      return new Response(
        JSON.stringify({ error: 'Internal payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousStatus = payment.status;

    let newStatus: string;
    switch (mpPaymentData.status) {
      case 'approved': newStatus = 'paid'; break;
      case 'pending':
      case 'in_process':
      case 'authorized': newStatus = 'pending'; break;
      case 'rejected': newStatus = 'failed'; break;
      case 'cancelled':
      case 'refunded':
      case 'charged_back': newStatus = 'cancelled'; break;
      default: newStatus = 'pending';
    }

    console.log(`Payment ${paymentId}: ${previousStatus} -> ${newStatus}`);

    customerPackageId = payment.customer_package_id || null;

    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        external_id: mpPaymentId.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError);
    }

    if (newStatus === 'paid' && previousStatus !== 'paid') {
      console.log('Payment approved, checking booking status');
      
      const { data: currentBooking } = await supabase
        .from('bookings')
        .select('id, status, starts_at, ends_at, staff_id, tenant_id')
        .eq('id', payment.booking_id)
        .single();
      
      if (!currentBooking) {
        console.error('Booking not found for payment');
      } else if (currentBooking.status === 'expired') {
        console.log('Booking was expired, checking availability');
        
        const { data: conflictingBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', currentBooking.tenant_id)
          .eq('staff_id', currentBooking.staff_id)
          .in('status', ['confirmed', 'pending', 'pending_payment', 'completed'])
          .or(`and(starts_at.lt.${currentBooking.ends_at},ends_at.gt.${currentBooking.starts_at})`);
        
        if (conflictingBookings && conflictingBookings.length > 0) {
          console.log('Time slot no longer available');
          await supabase.from('payments').update({ 
            status: 'refund_required',
            updated_at: new Date().toISOString()
          }).eq('id', paymentId);
        } else {
          console.log('Time slot available, restoring booking');
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', payment.booking_id);
        }
      } else {
        console.log('Confirming booking');
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.booking_id);

        if (!bookingError) {
          try {
            const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
              },
              body: JSON.stringify({
                type: 'payment_received',
                booking_id: payment.booking_id,
                tenant_id: payment.tenant_id,
              }),
            });
            if (!notificationResponse.ok) {
              console.error('Failed to send WhatsApp notification:', await notificationResponse.text());
            }
          } catch (notifError) {
            console.error('Error sending WhatsApp notification:', notifError);
          }
        }
      }

      // Cash entry (idempotent)
      const { data: existingEntry } = await supabase
        .from('cash_entries')
        .select('id')
        .eq('tenant_id', payment.tenant_id)
        .eq('source', 'booking')
        .ilike('notes', `%booking:${payment.booking_id}%`)
        .maybeSingle();

      if (!existingEntry) {
        await supabase.from('cash_entries').insert({
          tenant_id: payment.tenant_id,
          staff_id: payment.booking?.staff_id || null,
          amount_cents: payment.amount_cents,
          kind: 'income',
          source: 'booking',
          notes: `booking:${payment.booking_id} | MP payment: ${mpPaymentId}`,
          occurred_at: new Date().toISOString(),
        });
      }

      if (customerPackageId) {
        await supabase.from('customer_packages')
          .update({ payment_status: 'confirmed' })
          .eq('id', customerPackageId);
      }
    }

    return new Response(
      JSON.stringify({ received: true, status: newStatus }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// =============================================
// SUBSCRIPTION PREAPPROVAL HANDLER
// =============================================
async function handleSubscriptionPreapproval(supabase: any, mpPreapprovalId: string, connections: any[]) {
  console.log('Processing subscription notification:', mpPreapprovalId);

  let mpSubData: any = null;
  let usedConnection: any = null;

  for (const conn of connections) {
    try {
      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${mpPreapprovalId}`,
        { headers: { 'Authorization': `Bearer ${conn.access_token}` } }
      );
      if (mpResponse.ok) {
        mpSubData = await mpResponse.json();
        usedConnection = conn;
        break;
      }
    } catch (e) {
      console.log('Connection failed for tenant:', conn.tenant_id);
    }
  }

  if (!mpSubData) {
    return new Response(JSON.stringify({ error: 'Subscription not found in MP' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('MP preapproval data:', JSON.stringify({
    id: mpSubData.id,
    status: mpSubData.status,
    external_reference: mpSubData.external_reference,
    payer_id: mpSubData.payer_id,
  }));

  // Find internal subscription
  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('*')
    .or(`mp_preapproval_id.eq.${mpPreapprovalId},id.eq.${mpSubData.external_reference || 'none'}`)
    .maybeSingle();

  if (!subscription) {
    console.error('Internal subscription not found for preapproval:', mpPreapprovalId);
    return new Response(JSON.stringify({ error: 'Internal subscription not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Map MP status
  let newStatus: string;
  switch (mpSubData.status) {
    case 'authorized': newStatus = 'active'; break;
    case 'pending': newStatus = 'pending'; break;
    case 'paused': newStatus = 'paused'; break;
    case 'cancelled': newStatus = 'cancelled'; break;
    default: newStatus = subscription.status;
  }

  const updateData: any = {
    status: newStatus,
    mp_preapproval_id: mpPreapprovalId,
    mp_payer_id: mpSubData.payer_id?.toString() || null,
    updated_at: new Date().toISOString(),
  };

  // If newly activated
  if (newStatus === 'active' && subscription.status !== 'active') {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    updateData.started_at = now.toISOString();
    updateData.current_period_start = now.toISOString();
    updateData.current_period_end = periodEnd.toISOString();
    updateData.next_payment_date = mpSubData.next_payment_date || periodEnd.toISOString();

    // Initialize subscription_usage
    await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
  }

  if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
  }

  await supabase.from('customer_subscriptions').update(updateData).eq('id', subscription.id);

  return new Response(JSON.stringify({ received: true, status: newStatus }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================
// SUBSCRIPTION PAYMENT HANDLER
// =============================================
async function handleSubscriptionPayment(supabase: any, mpPaymentId: string, connections: any[]) {
  console.log('Processing subscription payment:', mpPaymentId);

  let mpPaymentData: any = null;
  let usedConnection: any = null;

  for (const conn of connections) {
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
        headers: { 'Authorization': `Bearer ${conn.access_token}` },
      });
      if (mpResponse.ok) {
        mpPaymentData = await mpResponse.json();
        usedConnection = conn;
        break;
      }
    } catch (e) {
      console.log('Connection failed for tenant:', conn.tenant_id);
    }
  }

  if (!mpPaymentData || !usedConnection) {
    return new Response(JSON.stringify({ error: 'Payment not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Find subscription by preapproval_id from the payment metadata
  const preapprovalId = mpPaymentData.metadata?.preapproval_id || mpPaymentData.point_of_interaction?.subscription_id;
  
  let subscription: any = null;
  if (preapprovalId) {
    const { data } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('mp_preapproval_id', preapprovalId)
      .maybeSingle();
    subscription = data;
  }

  if (!subscription) {
    // Try via external_reference
    const { data } = await supabase
      .from('customer_subscriptions')
      .select('*')
      .eq('mp_preapproval_id', mpPaymentData.metadata?.preapproval_id || '')
      .maybeSingle();
    subscription = data;
  }

  if (!subscription) {
    console.log('No subscription found for payment, may be a regular payment');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Record subscription payment (idempotent)
  const { data: existingPayment } = await supabase
    .from('subscription_payments')
    .select('id')
    .eq('mp_payment_id', mpPaymentId.toString())
    .maybeSingle();

  if (!existingPayment && mpPaymentData.status === 'approved') {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await supabase.from('subscription_payments').insert({
      subscription_id: subscription.id,
      tenant_id: subscription.tenant_id,
      amount_cents: Math.round(mpPaymentData.transaction_amount * 100),
      status: 'paid',
      mp_payment_id: mpPaymentId.toString(),
      period_start: now.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      paid_at: new Date().toISOString(),
    });

    // Create cash_entry
    await supabase.from('cash_entries').insert({
      tenant_id: subscription.tenant_id,
      amount_cents: Math.round(mpPaymentData.transaction_amount * 100),
      kind: 'income',
      source: 'subscription',
      notes: `subscription:${subscription.id} | MP payment: ${mpPaymentId}`,
      occurred_at: new Date().toISOString(),
    });

    // Update subscription period and reset usage
    const updateData: any = {
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
      status: 'active',
      updated_at: new Date().toISOString(),
    };

    await supabase.from('customer_subscriptions').update(updateData).eq('id', subscription.id);

    // Reset usage for new cycle
    await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// =============================================
// INITIALIZE USAGE RECORDS
// =============================================
async function initializeUsage(supabase: any, subscriptionId: string, planId: string, periodStart: Date, periodEnd: Date) {
  const { data: planServices } = await supabase
    .from('subscription_plan_services')
    .select('service_id, sessions_per_cycle')
    .eq('plan_id', planId);

  if (!planServices?.length) return;

  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];

  for (const ps of planServices) {
    await supabase.from('subscription_usage').upsert({
      subscription_id: subscriptionId,
      service_id: ps.service_id,
      period_start: periodStartStr,
      period_end: periodEndStr,
      sessions_used: 0,
      sessions_limit: ps.sessions_per_cycle,
      booking_ids: [],
    }, {
      onConflict: 'subscription_id,service_id,period_start',
    });
  }
}
