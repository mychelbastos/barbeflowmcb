import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[CHECK-OVERDUE] Starting overdue subscription check...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Find all past_due subscriptions with failed_at set
    const { data: pastDueSubs, error } = await supabase
      .from('customer_subscriptions')
      .select('id, failed_at, tenant_id, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
      .eq('status', 'past_due')
      .not('failed_at', 'is', null);

    if (error) {
      console.error('Error fetching past_due subscriptions:', error);
      return new Response(JSON.stringify({ error: 'Query failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!pastDueSubs || pastDueSubs.length === 0) {
      console.log('[CHECK-OVERDUE] No past_due subscriptions found');
      return new Response(JSON.stringify({ processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[CHECK-OVERDUE] Found ${pastDueSubs.length} past_due subscriptions`);

    // Cache tenant grace hours
    const tenantGraceCache: Record<string, number> = {};
    let suspendedCount = 0;
    let warningCount = 0;

    for (const sub of pastDueSubs) {
      // Get grace hours for this tenant
      if (!(sub.tenant_id in tenantGraceCache)) {
        const { data: tenant } = await supabase
          .from('tenants')
          .select('settings')
          .eq('id', sub.tenant_id)
          .single();
        tenantGraceCache[sub.tenant_id] = (tenant?.settings as any)?.subscription_grace_hours ?? 48;
      }

      const graceHours = tenantGraceCache[sub.tenant_id];
      const failedAt = new Date(sub.failed_at);
      const now = new Date();
      const hoursElapsed = (now.getTime() - failedAt.getTime()) / (1000 * 60 * 60);
      const hoursRemaining = graceHours - hoursElapsed;

      console.log(`[CHECK-OVERDUE] Sub ${sub.id}: failed ${hoursElapsed.toFixed(1)}h ago, grace: ${graceHours}h, remaining: ${hoursRemaining.toFixed(1)}h`);

      // Grace period expired → suspend
      if (hoursElapsed >= graceHours) {
        console.log(`[SUSPEND] Subscription ${sub.id} grace period expired, suspending`);

        await supabase.from('customer_subscriptions').update({
          status: 'suspended',
          updated_at: now.toISOString(),
        }).eq('id', sub.id);

        suspendedCount++;

        // WhatsApp: blocked notification
        await sendNotification(supabase, sub, 'subscription_suspended', (customer: any, plan: any, tenantName: string) => {
          return `🚫 *Assinatura Suspensa*\n\nOlá ${customer.name}!\n\nSua assinatura do plano *${plan.name}* foi suspensa por falta de pagamento.\n\nOs benefícios da assinatura estão temporariamente indisponíveis.\n\nPara reativar, regularize seu pagamento ou entre em contato conosco.\n\n${tenantName}`;
        });
      }
      // Warning: less than 6 hours remaining
      else if (hoursRemaining <= 6 && hoursRemaining > 0) {
        warningCount++;

        await sendNotification(supabase, sub, 'subscription_near_block', (customer: any, plan: any, tenantName: string) => {
          const hoursLeft = Math.ceil(hoursRemaining);
          return `⏰ *Atenção: Assinatura será suspensa em breve*\n\nOlá ${customer.name}!\n\nSeu pagamento do plano *${plan.name}* ainda não foi processado.\n\nSua assinatura será suspensa em *${hoursLeft} hora${hoursLeft > 1 ? 's' : ''}*.\n\nPor favor, verifique seu método de pagamento urgentemente.\n\n${tenantName}`;
        });
      }
    }

    console.log(`[CHECK-OVERDUE] Done. Suspended: ${suspendedCount}, Warnings: ${warningCount}`);

    return new Response(JSON.stringify({
      processed: pastDueSubs.length,
      suspended: suspendedCount,
      warnings: warningCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in check-overdue-subscriptions:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function sendNotification(
  supabase: any,
  sub: any,
  eventType: string,
  buildMessage: (customer: any, plan: any, tenantName: string) => string
) {
  try {
    const customer = sub.customer;
    const plan = sub.plan;
    const tenantName = plan?.tenant?.name || 'modoGESTOR';
    const tenantSlug = plan?.tenant?.slug || '';

    if (!customer?.phone || !plan) return;

    const { data: whatsappConn } = await supabase
      .from('whatsapp_connections')
      .select('evolution_instance_name, whatsapp_connected')
      .eq('tenant_id', sub.tenant_id)
      .eq('whatsapp_connected', true)
      .maybeSingle();

    if (!whatsappConn) return;

    let phone = customer.phone.replace(/\D/g, '');
    if (!phone.startsWith('55')) phone = '55' + phone;

    const message = buildMessage(customer, plan, tenantName);

    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (n8nWebhookUrl) {
      const resp = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: eventType,
          phone,
          message,
          evolution_instance: whatsappConn.evolution_instance_name,
          tenant_id: sub.tenant_id,
          tenant_slug: tenantSlug,
        }),
      });
      console.log(`WhatsApp ${eventType} notification sent, status:`, resp.status);
    }
  } catch (err) {
    console.error(`Error sending ${eventType} notification:`, err);
  }
}
