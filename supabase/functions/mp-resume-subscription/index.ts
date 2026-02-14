import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidMpToken } from "../_shared/mp-token.ts";
import { sendSubscriptionNotification, formatBRL } from "../_shared/whatsapp-notify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription_id } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: 'subscription_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('id, mp_preapproval_id, tenant_id, status, plan_id, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (subscription.status !== 'paused') {
      return new Response(JSON.stringify({ error: `Apenas assinaturas pausadas podem ser reativadas. Status atual: ${subscription.status}` }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (subscription.mp_preapproval_id) {
      const mpToken = await getValidMpToken(supabase, subscription.tenant_id);
      if (!mpToken) {
        return new Response(JSON.stringify({ error: 'Mercado Pago não está conectado ou token expirado.' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const mpResponse = await fetch(
        `https://api.mercadopago.com/preapproval/${subscription.mp_preapproval_id}`,
        { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken.access_token}` },
          body: JSON.stringify({ status: 'authorized' }) }
      );
      const mpData = await mpResponse.json();
      if (!mpResponse.ok) {
        console.error('MP resume error:', JSON.stringify(mpData));
        return new Response(JSON.stringify({ error: mpData?.message || 'Mercado Pago não permitiu a reativação.', details: mpData }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      const updateData: any = {
        status: 'active', updated_at: now.toISOString(),
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      };
      if (mpData.next_payment_date) updateData.next_payment_date = mpData.next_payment_date;
      await supabase.from('customer_subscriptions').update(updateData).eq('id', subscription.id);
      await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
    } else {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      await supabase.from('customer_subscriptions').update({
        status: 'active', updated_at: now.toISOString(),
        current_period_start: now.toISOString(), current_period_end: periodEnd.toISOString(),
      }).eq('id', subscription.id);
      await initializeUsage(supabase, subscription.id, subscription.plan_id, now, periodEnd);
    }

    // WhatsApp notification via shared helper
    const customer = subscription.customer as any;
    const plan = subscription.plan as any;
    const tenantName = plan?.tenant?.name || 'modoGESTOR';

    if (customer?.phone && plan) {
      await sendSubscriptionNotification(supabase, subscription, 'subscription_resumed',
        `▶️ *Assinatura Reativada!*\n\nOlá ${customer.name}!\n\nSua assinatura do plano *${plan.name}* foi reativada com sucesso.\n\n💰 *Valor:* ${formatBRL(plan.price_cents)}/mês\n\nA cobrança automática foi retomada. Continue agendando normalmente.\n\n${tenantName} agradece! 🙏`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mp-resume-subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

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
