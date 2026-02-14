import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getAllValidMpTokens } from "../_shared/mp-token.ts";
import { sendSubscriptionNotification, formatBRL } from "../_shared/whatsapp-notify.ts";

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

    const validTokens = await getAllValidMpTokens(supabase);

    if (!validTokens.length) {
      console.error('No valid MP connections found');
      return new Response(
        JSON.stringify({ error: 'No connections' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const connections = validTokens.map(t => ({ tenant_id: t.tenant_id, access_token: t.access_token }));

    // SUBSCRIPTION PREAPPROVAL NOTIFICATIONS
    if (type === 'subscription_preapproval' && data?.id) {
      return await handleSubscriptionPreapproval(supabase, data.id, connections);
    }

    // SUBSCRIPTION AUTHORIZED PAYMENT
    if (type === 'subscription_authorized_payment' && data?.id) {
      return await handleSubscriptionPayment(supabase, data.id, connections);
    }

    // PAYMENT NOTIFICATIONS (existing logic)
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
      id: mpPaymentData.id, status: mpPaymentData.status,
      external_reference: mpPaymentData.external_reference, metadata: mpPaymentData.metadata,
    }));

    let paymentId = mpPaymentData.metadata?.payment_id || mpPaymentData.external_reference;
    if (!paymentId) {
      console.error('No payment_id found in metadata or external_reference');
      return new Response(JSON.stringify({ error: 'No internal payment reference' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let { data: payment, error: paymentError } = await supabase
      .from('payments').select('*, booking:bookings(*)').eq('id', paymentId).maybeSingle();

    let customerPackageId: string | null = null;

    if (!payment) {
      const { data: paymentByBooking } = await supabase
        .from('payments').select('*, booking:bookings(*)')
        .eq('booking_id', paymentId).order('created_at', { ascending: false }).limit(1).maybeSingle();
      if (paymentByBooking) { payment = paymentByBooking; paymentId = paymentByBooking.id; }
    }

    if (!payment) {
      console.error('Internal payment not found:', paymentId);
      return new Response(JSON.stringify({ error: 'Internal payment not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const previousStatus = payment.status;
    let newStatus: string;
    switch (mpPaymentData.status) {
      case 'approved': newStatus = 'paid'; break;
      case 'pending': case 'in_process': case 'authorized': newStatus = 'pending'; break;
      case 'rejected': newStatus = 'failed'; break;
      case 'cancelled': case 'refunded': case 'charged_back': newStatus = 'cancelled'; break;
      default: newStatus = 'pending';
    }

    console.log(`Payment ${paymentId}: ${previousStatus} -> ${newStatus}`);
    customerPackageId = payment.customer_package_id || null;

    await supabase.from('payments').update({
      status: newStatus, external_id: mpPaymentId.toString(), updated_at: new Date().toISOString(),
    }).eq('id', paymentId);

    if (newStatus === 'paid' && previousStatus !== 'paid') {
      const { data: currentBooking } = await supabase
        .from('bookings').select('id, status, starts_at, ends_at, staff_id, tenant_id')
        .eq('id', payment.booking_id).single();

      if (!currentBooking) {
        console.error('Booking not found for payment');
      } else if (currentBooking.status === 'expired') {
        const { data: conflictingBookings } = await supabase
          .from('bookings').select('id').eq('tenant_id', currentBooking.tenant_id)
          .eq('staff_id', currentBooking.staff_id)
          .in('status', ['confirmed', 'pending', 'pending_payment', 'completed'])
          .or(`and(starts_at.lt.${currentBooking.ends_at},ends_at.gt.${currentBooking.starts_at})`);

        if (conflictingBookings && conflictingBookings.length > 0) {
          await supabase.from('payments').update({ status: 'refund_required', updated_at: new Date().toISOString() }).eq('id', paymentId);
        } else {
          await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', payment.booking_id);
        }
      } else {
        const { error: bookingError } = await supabase.from('bookings').update({ status: 'confirmed' }).eq('id', payment.booking_id);
        if (!bookingError) {
          try {
            await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}` },
              body: JSON.stringify({ type: 'payment_received', booking_id: payment.booking_id, tenant_id: payment.tenant_id }),
            });
          } catch (notifError) { console.error('Error sending WhatsApp notification:', notifError); }
        }
      }

      // Cash entry (idempotent)
      const { data: existingEntry } = await supabase.from('cash_entries').select('id')
        .eq('tenant_id', payment.tenant_id).eq('source', 'booking')
        .ilike('notes', `%booking:${payment.booking_id}%`).maybeSingle();
      if (!existingEntry) {
        await supabase.from('cash_entries').insert({
          tenant_id: payment.tenant_id, staff_id: payment.booking?.staff_id || null,
          amount_cents: payment.amount_cents, kind: 'income', source: 'booking',
          notes: `booking:${payment.booking_id} | MP payment: ${mpPaymentId}`, occurred_at: new Date().toISOString(),
        });
      }
      if (customerPackageId) {
        await supabase.from('customer_packages').update({ payment_status: 'confirmed' }).eq('id', customerPackageId);
      }
    }

    return new Response(JSON.stringify({ received: true, status: newStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mp-webhook:', error);
    return new Response(JSON.stringify({ error: 'Erro interno' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// =============================================
// SUBSCRIPTION PREAPPROVAL HANDLER
// =============================================
async function handleSubscriptionPreapproval(supabase: any, mpPreapprovalId: string, connections: any[]) {
  console.log('Processing subscription notification:', mpPreapprovalId);

  let mpSubData: any = null;
  for (const conn of connections) {
    try {
      const mpResponse = await fetch(`https://api.mercadopago.com/preapproval/${mpPreapprovalId}`, {
        headers: { 'Authorization': `Bearer ${conn.access_token}` },
      });
      if (mpResponse.ok) { mpSubData = await mpResponse.json(); break; }
    } catch (e) { console.log('Connection failed for tenant:', conn.tenant_id); }
  }

  if (!mpSubData) {
    return new Response(JSON.stringify({ error: 'Subscription not found in MP' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  console.log('MP preapproval data:', JSON.stringify({
    id: mpSubData.id, status: mpSubData.status,
    external_reference: mpSubData.external_reference, payer_id: mpSubData.payer_id,
  }));

  const { data: subscription } = await supabase
    .from('customer_subscriptions')
    .select('*, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
    .or(`mp_preapproval_id.eq.${mpPreapprovalId},id.eq.${mpSubData.external_reference || 'none'}`)
    .maybeSingle();

  if (!subscription) {
    console.error('Internal subscription not found for preapproval:', mpPreapprovalId);
    return new Response(JSON.stringify({ error: 'Internal subscription not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let newStatus: string;
  switch (mpSubData.status) {
    case 'authorized': newStatus = 'active'; break;
    case 'pending': newStatus = 'pending'; break;
    case 'paused': newStatus = 'paused'; break;
    case 'cancelled': newStatus = 'cancelled'; break;
    default: newStatus = subscription.status;
  }

  // ⛔ GUARD: cancelled is a TERMINAL state
  if (subscription.status === 'cancelled' && newStatus !== 'cancelled') {
    console.log(`[GUARD] Ignored webhook event (${mpSubData.status}) for cancelled subscription ${subscription.id}. Cancelled is terminal.`);
    return new Response(JSON.stringify({ received: true, ignored: true, reason: 'cancelled_is_terminal' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const updateData: any = {
    status: newStatus, mp_preapproval_id: mpPreapprovalId,
    mp_payer_id: mpSubData.payer_id?.toString() || null, updated_at: new Date().toISOString(),
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
    updateData.failed_at = null;
    await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
  }

  // Recovery: past_due/suspended → active
  if (newStatus === 'active' && (subscription.status === 'past_due' || subscription.status === 'suspended')) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);
    updateData.current_period_start = now.toISOString();
    updateData.current_period_end = periodEnd.toISOString();
    updateData.next_payment_date = mpSubData.next_payment_date || periodEnd.toISOString();
    updateData.failed_at = null;
    await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
    console.log(`[RECOVERY] Subscription ${subscription.id} recovered from ${subscription.status} to active`);

    const customer = subscription.customer;
    const plan = subscription.plan;
    await sendSubscriptionNotification(supabase, subscription, 'subscription_recovered',
      `✅ *Pagamento Regularizado!*\n\nOlá ${customer.name}!\n\nSeu pagamento do plano *${plan.name}* foi processado com sucesso.\n\nSua assinatura está ativa novamente e você já pode agendar normalmente.\n\n${plan?.tenant?.name || 'modoGESTOR'} agradece! 🙏`
    );
  }

  if (newStatus === 'cancelled') {
    updateData.cancelled_at = new Date().toISOString();
    updateData.cancellation_reason = 'mp_automatic';

    // 🆕 Notify customer about MP auto-cancellation
    const customer = subscription.customer;
    const plan = subscription.plan;
    const tenantName = plan?.tenant?.name || 'modoGESTOR';
    await sendSubscriptionNotification(supabase, subscription, 'subscription_cancelled_auto',
      `🚫 *Assinatura Cancelada Automaticamente*\n\nOlá ${customer?.name}!\n\nSua assinatura do plano *${plan?.name}* foi cancelada pelo sistema de pagamento por falta de regularização.\n\nPara voltar a usar os benefícios, será necessário contratar uma nova assinatura.\n\nEntre em contato conosco se precisar de ajuda.\n\n${tenantName}`,
      `mp_auto_cancel_${subscription.id}`
    );
  }

  await supabase.from('customer_subscriptions').update(updateData).eq('id', subscription.id);

  // New activation notification
  if (newStatus === 'active' && subscription.status !== 'active' && subscription.status !== 'past_due' && subscription.status !== 'suspended') {
    const customer = subscription.customer;
    const plan = subscription.plan;
    const tenantName = plan?.tenant?.name || 'modoGESTOR';
    const validityEnd = new Date();
    validityEnd.setDate(validityEnd.getDate() + 30);
    const formattedEnd = validityEnd.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
    const formattedPrice = formatBRL(plan.price_cents);

    await sendSubscriptionNotification(supabase, subscription, 'subscription_activated',
      `✅ *Assinatura Ativada!*\n\nOlá ${customer.name}!\n\nSua assinatura foi ativada com sucesso.\n\n📋 *Plano:* ${plan.name}\n💰 *Valor:* ${formattedPrice}/mês\n📅 *Válida até:* ${formattedEnd}\n\nSua assinatura será renovada automaticamente a cada 30 dias.\n\n${tenantName} agradece! 🙏`
    );
  }

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
      if (mpResponse.ok) { mpPaymentData = await mpResponse.json(); usedConnection = conn; break; }
    } catch (e) { console.log('Connection failed for tenant:', conn.tenant_id); }
  }

  if (!mpPaymentData || !usedConnection) {
    return new Response(JSON.stringify({ error: 'Payment not found' }), {
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const preapprovalId = mpPaymentData.metadata?.preapproval_id || mpPaymentData.point_of_interaction?.subscription_id || mpPaymentData.preapproval_id;
  let subscription: any = null;

  if (preapprovalId) {
    const { data } = await supabase.from('customer_subscriptions')
      .select('*, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
      .eq('mp_preapproval_id', preapprovalId).maybeSingle();
    subscription = data;
  }

  if (!subscription) {
    const { data } = await supabase.from('customer_subscriptions')
      .select('*, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
      .eq('mp_preapproval_id', mpPaymentData.metadata?.preapproval_id || '').maybeSingle();
    subscription = data;
  }

  if (!subscription) {
    console.log('No subscription found for payment, may be a regular payment');
    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // ⛔ GUARD: cancelled is a TERMINAL state
  if (subscription.status === 'cancelled') {
    console.log(`[GUARD] Ignored payment event for cancelled subscription ${subscription.id}. Cancelled is terminal.`);
    const { data: existingPayment } = await supabase.from('subscription_payments').select('id')
      .eq('mp_payment_id', mpPaymentId.toString()).maybeSingle();
    if (!existingPayment) {
      await supabase.from('subscription_payments').insert({
        subscription_id: subscription.id, tenant_id: subscription.tenant_id,
        amount_cents: Math.round((mpPaymentData.transaction_amount || 0) * 100),
        status: mpPaymentData.status === 'approved' ? 'paid' : 'failed',
        mp_payment_id: mpPaymentId.toString(),
        period_start: new Date().toISOString().split('T')[0], period_end: new Date().toISOString().split('T')[0],
        paid_at: mpPaymentData.status === 'approved' ? new Date().toISOString() : null,
      });
    }
    return new Response(JSON.stringify({ received: true, ignored: true, reason: 'cancelled_is_terminal' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // PAYMENT APPROVED → Renew or Recover
  if (mpPaymentData.status === 'approved') {
    const { data: existingPayment } = await supabase.from('subscription_payments').select('id')
      .eq('mp_payment_id', mpPaymentId.toString()).maybeSingle();

    if (!existingPayment) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      await supabase.from('subscription_payments').insert({
        subscription_id: subscription.id, tenant_id: subscription.tenant_id,
        amount_cents: Math.round(mpPaymentData.transaction_amount * 100), status: 'paid',
        mp_payment_id: mpPaymentId.toString(),
        period_start: now.toISOString().split('T')[0], period_end: periodEnd.toISOString().split('T')[0],
        paid_at: new Date().toISOString(),
      });

      await supabase.from('cash_entries').insert({
        tenant_id: subscription.tenant_id,
        amount_cents: Math.round(mpPaymentData.transaction_amount * 100),
        kind: 'income', source: 'subscription',
        notes: `subscription:${subscription.id} | MP payment: ${mpPaymentId}`,
        occurred_at: new Date().toISOString(),
      });

      const previousStatus = subscription.status;
      await supabase.from('customer_subscriptions').update({
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
        status: 'active', failed_at: null, updated_at: new Date().toISOString(),
      }).eq('id', subscription.id);
      await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);

      const customer = subscription.customer;
      const plan = subscription.plan;
      const tenantName = plan?.tenant?.name || 'modoGESTOR';

      if (previousStatus === 'past_due' || previousStatus === 'suspended') {
        console.log(`[RECOVERY] Subscription ${subscription.id} recovered from ${previousStatus} via payment`);
        await sendSubscriptionNotification(supabase, subscription, 'subscription_recovered',
          `✅ *Pagamento Regularizado!*\n\nOlá ${customer.name}!\n\nSeu pagamento do plano *${plan.name}* foi processado com sucesso.\n\nSua assinatura está ativa novamente e você já pode agendar normalmente.\n\n${tenantName} agradece! 🙏`
        );
      } else {
        const amountPaid = mpPaymentData.transaction_amount;
        const validityEnd = new Date();
        validityEnd.setDate(validityEnd.getDate() + 30);
        const formattedEnd = validityEnd.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric' });
        await sendSubscriptionNotification(supabase, subscription, 'subscription_renewed',
          `🔄 *Assinatura Renovada!*\n\nOlá ${customer.name}!\n\nSua assinatura do plano *${plan.name}* foi renovada automaticamente.\n\n💰 *Valor cobrado:* R$ ${amountPaid.toFixed(2)}\n📅 *Nova validade:* ${formattedEnd}\n\nContinue agendando normalmente pelo nosso link.\n\n${tenantName} agradece! 🙏`
        );
      }
    }
  }

  // PAYMENT REJECTED/FAILED → Mark past_due
  if (mpPaymentData.status === 'rejected' || mpPaymentData.status === 'cancelled') {
    if (subscription.status === 'active') {
      const now = new Date();
      console.log(`[PAYMENT_FAILED] Subscription ${subscription.id} marking as past_due`);

      await supabase.from('customer_subscriptions').update({
        status: 'past_due', failed_at: now.toISOString(), updated_at: now.toISOString(),
      }).eq('id', subscription.id);

      const { data: existingPayment } = await supabase.from('subscription_payments').select('id')
        .eq('mp_payment_id', mpPaymentId.toString()).maybeSingle();
      if (!existingPayment) {
        await supabase.from('subscription_payments').insert({
          subscription_id: subscription.id, tenant_id: subscription.tenant_id,
          amount_cents: Math.round((mpPaymentData.transaction_amount || 0) * 100), status: 'failed',
          mp_payment_id: mpPaymentId.toString(),
          period_start: now.toISOString().split('T')[0], period_end: now.toISOString().split('T')[0],
        });
      }

      const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', subscription.tenant_id).single();
      const graceHours = (tenant?.settings as any)?.subscription_grace_hours ?? 48;
      const customer = subscription.customer;
      const plan = subscription.plan;
      const tenantName = plan?.tenant?.name || 'modoGESTOR';

      await sendSubscriptionNotification(supabase, subscription, 'subscription_payment_failed',
        `⚠️ *Falha no Pagamento*\n\nOlá ${customer.name}!\n\nNão conseguimos processar o pagamento da sua assinatura *${plan.name}*.\n\nSua assinatura continuará ativa por mais *${graceHours} horas*. Após esse prazo, o acesso aos benefícios será suspenso.\n\nPor favor, verifique seu método de pagamento.\n\n${tenantName}`
      );
    }
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
    .from('subscription_plan_services').select('service_id, sessions_per_cycle').eq('plan_id', planId);
  if (!planServices?.length) return;
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];
  for (const ps of planServices) {
    await supabase.from('subscription_usage').upsert({
      subscription_id: subscriptionId, service_id: ps.service_id,
      period_start: periodStartStr, period_end: periodEndStr,
      sessions_used: 0, sessions_limit: ps.sessions_per_cycle, booking_ids: [],
    }, { onConflict: 'subscription_id,service_id,period_start' });
  }
}
