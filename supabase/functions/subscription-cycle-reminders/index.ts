import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendSubscriptionNotification } from "../_shared/whatsapp-notify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CYCLE-REMINDERS] Starting subscription cycle reminders...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Fetch all active subscriptions with a current_period_end set
    const { data: activeSubs, error } = await supabase
      .from('customer_subscriptions')
      .select('id, tenant_id, customer_id, current_period_end, customer:customers(name, phone), plan:subscription_plans(name, price_cents, billing_cycle, tenant:tenants(name, slug, settings))')
      .eq('status', 'active')
      .not('current_period_end', 'is', null);

    if (error) {
      console.error('Error fetching active subscriptions:', error);
      return new Response(JSON.stringify({ error: 'Query failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!activeSubs || activeSubs.length === 0) {
      console.log('[CYCLE-REMINDERS] No active subscriptions found');
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[CYCLE-REMINDERS] Found ${activeSubs.length} active subscriptions`);

    let sentCount = 0;
    const now = new Date();
    // Use São Paulo timezone for "today"
    const todayStr = now.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' }); // YYYY-MM-DD

    for (const sub of activeSubs) {
      const plan = sub.plan as any;
      const customer = sub.customer as any;
      const tenantSettings = plan?.tenant?.settings || {};

      // Check if cycle reminders are enabled for this tenant (default: enabled)
      const cycleRemindersEnabled = tenantSettings.cycle_reminders_enabled !== false;
      if (!cycleRemindersEnabled) continue;

      // Get configured reminder days (default: [3, 1, 0])
      const reminderDays: number[] = tenantSettings.cycle_reminder_days || [3, 1, 0];

      if (!sub.current_period_end || !customer?.phone || !plan) continue;

      const periodEnd = new Date(sub.current_period_end);
      const periodEndStr = periodEnd.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

      // Calculate days until end
      const todayDate = new Date(todayStr);
      const endDate = new Date(periodEndStr);
      const diffMs = endDate.getTime() - todayDate.getTime();
      const daysUntilEnd = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Check if today matches any reminder day
      if (!reminderDays.includes(daysUntilEnd)) continue;

      const tenantName = plan?.tenant?.name || 'modoGESTOR';
      const formattedEnd = periodEnd.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', year: 'numeric',
      });

      let message: string;
      let eventType: string;

      if (daysUntilEnd === 0) {
        eventType = 'cycle_ends_today';
        message = `📅 *Seu ciclo termina hoje*\n\nOlá ${customer.name}!\n\nO ciclo da sua assinatura *${plan.name}* encerra hoje (${formattedEnd}).\n\nA renovação será processada automaticamente.\n\n${tenantName}`;
      } else if (daysUntilEnd === 1) {
        eventType = 'cycle_ends_tomorrow';
        message = `📅 *Sua assinatura termina amanhã*\n\nOlá ${customer.name}!\n\nO ciclo da sua assinatura *${plan.name}* encerra amanhã (${formattedEnd}).\n\nA renovação será processada automaticamente.\n\n${tenantName}`;
      } else {
        eventType = `cycle_ends_${daysUntilEnd}d`;
        message = `📅 *Faltam ${daysUntilEnd} dias para o fim do seu ciclo*\n\nOlá ${customer.name}!\n\nSua assinatura *${plan.name}* encerra em ${formattedEnd}.\n\nA renovação será processada automaticamente.\n\n${tenantName}`;
      }

      // Dedup: one reminder per subscription per period_end per day-type
      const dedupKey = `cycle_${sub.id}_${periodEndStr}_${daysUntilEnd}d`;

      const sent = await sendSubscriptionNotification(supabase, sub, eventType, message, dedupKey);
      if (sent) sentCount++;
    }

    console.log(`[CYCLE-REMINDERS] Done. Processed: ${activeSubs.length}, Sent: ${sentCount}`);

    return new Response(JSON.stringify({
      processed: activeSubs.length, sent: sentCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in subscription-cycle-reminders:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
