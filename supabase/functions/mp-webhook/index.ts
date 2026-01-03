import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('Webhook received:', JSON.stringify(body));

    const { type, data, action } = body;

    // We're interested in payment notifications
    if (type !== 'payment' || !data?.id) {
      console.log('Ignoring non-payment notification:', type);
      return new Response(
        JSON.stringify({ received: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const mpPaymentId = data.id;
    console.log('Processing payment notification:', mpPaymentId, 'action:', action);

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get payment details from Mercado Pago
    // First, we need to find which tenant this payment belongs to
    // We'll use the external_reference (which is our payment_id)
    
    // But first we need to get the payment details from MP to get the external_reference
    // We need to find the right access_token - let's query all connections and try each
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

    let mpPaymentData: any = null;
    let usedConnection: any = null;

    // Try each connection to find the payment
    for (const conn of connections) {
      try {
        const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${mpPaymentId}`, {
          headers: {
            'Authorization': `Bearer ${conn.access_token}`,
          },
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

    // Find our internal payment using external_reference (our payment_id) or metadata
    const paymentId = mpPaymentData.external_reference || mpPaymentData.metadata?.payment_id;
    
    if (!paymentId) {
      console.error('No payment_id found in external_reference or metadata');
      return new Response(
        JSON.stringify({ error: 'No internal payment reference' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get our payment record
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('*, booking:bookings(*)')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('Internal payment not found:', paymentId, paymentError);
      return new Response(
        JSON.stringify({ error: 'Internal payment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const previousStatus = payment.status;

    // Map MP status to our status
    let newStatus: string;
    switch (mpPaymentData.status) {
      case 'approved':
        newStatus = 'paid';
        break;
      case 'pending':
      case 'in_process':
      case 'authorized':
        newStatus = 'pending';
        break;
      case 'rejected':
        newStatus = 'failed';
        break;
      case 'cancelled':
      case 'refunded':
      case 'charged_back':
        newStatus = 'cancelled';
        break;
      default:
        newStatus = 'pending';
    }

    console.log(`Payment ${paymentId}: ${previousStatus} -> ${newStatus}`);

    // Update payment record with MP payment_id in external_id
    const { error: updatePaymentError } = await supabase
      .from('payments')
      .update({
        status: newStatus,
        external_id: mpPaymentId.toString(), // Store MP payment_id for reference
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentId);

    if (updatePaymentError) {
      console.error('Error updating payment:', updatePaymentError);
    }

    // If payment is now paid, check if booking is still valid and update accordingly
    if (newStatus === 'paid' && previousStatus !== 'paid') {
      console.log('Payment approved, checking booking status');
      
      // Get the current booking status
      const { data: currentBooking, error: bookingFetchError } = await supabase
        .from('bookings')
        .select('id, status, starts_at, ends_at, staff_id, tenant_id')
        .eq('id', payment.booking_id)
        .single();
      
      if (bookingFetchError || !currentBooking) {
        console.error('Error fetching booking:', bookingFetchError);
      } else if (currentBooking.status === 'expired') {
        // Booking expired - need to check if time slot is still available
        console.log('Booking was expired, checking availability');
        
        const { data: conflictingBookings } = await supabase
          .from('bookings')
          .select('id')
          .eq('tenant_id', currentBooking.tenant_id)
          .eq('staff_id', currentBooking.staff_id)
          .in('status', ['confirmed', 'pending', 'pending_payment', 'completed'])
          .or(`and(starts_at.lt.${currentBooking.ends_at},ends_at.gt.${currentBooking.starts_at})`);
        
        if (conflictingBookings && conflictingBookings.length > 0) {
          // Time slot is no longer available - refund would be needed
          console.log('Time slot no longer available, booking cannot be restored');
          // Update payment status to indicate issue
          await supabase
            .from('payments')
            .update({ 
              status: 'refund_required',
              updated_at: new Date().toISOString()
            })
            .eq('id', paymentId);
          
          // Note: Actual refund would need to be handled separately
        } else {
          // Time slot still available - restore the booking
          console.log('Time slot available, restoring booking');
          const { error: bookingError } = await supabase
            .from('bookings')
            .update({ status: 'confirmed' })
            .eq('id', payment.booking_id);

          if (bookingError) {
            console.error('Error updating booking:', bookingError);
          }
        }
      } else {
        // Normal flow - booking is pending_payment, confirm it
        console.log('Confirming booking');
        const { error: bookingError } = await supabase
          .from('bookings')
          .update({ status: 'confirmed' })
          .eq('id', payment.booking_id);

        if (bookingError) {
          console.error('Error updating booking:', bookingError);
        } else {
          // Send WhatsApp notification for payment received
          try {
            const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
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
            } else {
              console.log('WhatsApp notification sent for payment confirmation');
            }
          } catch (notifError) {
            console.error('Error sending WhatsApp notification:', notifError);
          }
        }
      }

      // Check if cash entry already exists for this booking (idempotency)
      const { data: existingEntry } = await supabase
        .from('cash_entries')
        .select('id')
        .eq('tenant_id', payment.tenant_id)
        .eq('source', 'booking')
        .ilike('notes', `%booking:${payment.booking_id}%`)
        .maybeSingle();

      if (!existingEntry) {
        // Create cash entry
        const { error: cashError } = await supabase
          .from('cash_entries')
          .insert({
            tenant_id: payment.tenant_id,
            staff_id: payment.booking?.staff_id || null,
            amount_cents: payment.amount_cents,
            kind: 'income',
            source: 'booking',
            notes: `booking:${payment.booking_id} | MP payment: ${mpPaymentId}`,
            occurred_at: new Date().toISOString(),
          });

        if (cashError) {
          console.error('Error creating cash entry:', cashError);
        } else {
          console.log('Cash entry created for booking:', payment.booking_id);
        }
      } else {
        console.log('Cash entry already exists for booking:', payment.booking_id);
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
