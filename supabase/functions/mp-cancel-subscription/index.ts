import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidMpToken } from "../_shared/mp-token.ts";
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
      .select('id, mp_preapproval_id, tenant_id, status, customer:customers(name, phone), plan:subscription_plans(name, price_cents, tenant:tenants(name, slug))')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (subscription.mp_preapproval_id) {
      const mpToken = await getValidMpToken(supabase, subscription.tenant_id);
      if (mpToken) {
        const mpResponse = await fetch(
          `https://api.mercadopago.com/preapproval/${subscription.mp_preapproval_id}`,
          { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${mpToken.access_token}` },
            body: JSON.stringify({ status: 'cancelled' }) }
        );
        if (!mpResponse.ok) console.error('MP cancel error:', await mpResponse.text());
      } else {
        console.error('Could not get valid MP token for cancel, tenant:', subscription.tenant_id);
      }
    }

    const { error: updateError } = await supabase
      .from('customer_subscriptions')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', subscription_id);

    if (updateError) {
      return new Response(JSON.stringify({ error: 'Failed to update subscription' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // WhatsApp notification via shared helper
    const customer = subscription.customer as any;
    const plan = subscription.plan as any;
    const tenantName = plan?.tenant?.name || 'modoGESTOR';

    if (customer?.phone && plan) {
      await sendSubscriptionNotification(supabase, subscription, 'subscription_cancelled',
        `❌ *Assinatura Cancelada*\n\nOlá ${customer.name}!\n\nSua assinatura do plano *${plan.name}* foi cancelada.\n\nSe desejar, você pode assinar novamente a qualquer momento pelo nosso link de agendamento.\n\n${tenantName} agradece pela preferência! 🙏`
      );
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mp-cancel-subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
