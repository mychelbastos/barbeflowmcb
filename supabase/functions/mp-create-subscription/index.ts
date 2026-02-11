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
    const { subscription_id } = await req.json();
    if (!subscription_id) {
      return new Response(JSON.stringify({ error: 'subscription_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch subscription with plan, customer, tenant
    const { data: subscription, error: subError } = await supabase
      .from('customer_subscriptions')
      .select('*, plan:subscription_plans(*), customer:customers(*), tenant:tenants(name, slug)')
      .eq('id', subscription_id)
      .single();

    if (subError || !subscription) {
      console.error('Subscription not found:', subError);
      return new Response(JSON.stringify({ error: 'Subscription not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (subscription.status !== 'pending') {
      return new Response(JSON.stringify({ error: 'Subscription is not pending' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate customer email
    if (!subscription.customer?.email) {
      return new Response(JSON.stringify({ error: 'Customer email is required for subscriptions' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get MP connection
    const { data: mpConn, error: mpError } = await supabase
      .from('mercadopago_connections')
      .select('access_token')
      .eq('tenant_id', subscription.tenant_id)
      .single();

    if (mpError || !mpConn) {
      return new Response(JSON.stringify({ error: 'Mercado Pago not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://barbeflowmcb.lovable.app';
    const tenantSlug = subscription.tenant?.slug || '';

    const mpBody = {
      reason: `${subscription.plan.name} - ${subscription.tenant?.name || 'BarberFlow'}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: subscription.plan.price_cents / 100,
        currency_id: "BRL",
      },
      payer_email: subscription.customer.email,
      back_url: `${frontBaseUrl}/${tenantSlug}/subscription/callback`,
      external_reference: subscription_id,
      status: "pending",
    };

    console.log('Creating MP preapproval:', JSON.stringify(mpBody));

    const mpResponse = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpConn.access_token}`,
      },
      body: JSON.stringify(mpBody),
    });

    const mpData = await mpResponse.json();

    if (!mpResponse.ok) {
      console.error('MP preapproval error:', JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: 'Failed to create subscription in MP', details: mpData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('MP preapproval created:', mpData.id, 'init_point:', mpData.init_point);

    // Update our subscription with MP data
    const { error: updateError } = await supabase
      .from('customer_subscriptions')
      .update({
        mp_preapproval_id: mpData.id,
        checkout_url: mpData.init_point,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription_id);

    if (updateError) {
      console.error('Error updating subscription:', updateError);
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: mpData.init_point,
      mp_preapproval_id: mpData.id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in mp-create-subscription:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
