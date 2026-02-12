import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function canonicalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, plan_id, customer_name, customer_phone, customer_email } = await req.json();

    if (!tenant_id || !plan_id || !customer_name || !customer_phone || !customer_email) {
      return new Response(JSON.stringify({ error: 'tenant_id, plan_id, customer_name, customer_phone and customer_email are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- Find or create customer ---
    const canonical = canonicalPhone(customer_phone);

    const { data: existingCustomers } = await supabase
      .from('customers')
      .select('id, phone')
      .eq('tenant_id', tenant_id);

    let customerId: string;
    const matched = (existingCustomers || []).find((c: any) => canonicalPhone(c.phone) === canonical);

    if (matched) {
      customerId = matched.id;
      await supabase.from('customers').update({
        name: customer_name.trim(),
        email: customer_email,
      }).eq('id', customerId);
      console.log('Matched existing customer:', customerId);
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({ tenant_id, name: customer_name.trim(), phone: canonical, email: customer_email })
        .select('id')
        .single();
      if (custErr) {
        console.error('Error creating customer:', custErr);
        return new Response(JSON.stringify({ error: 'Failed to create customer', details: custErr.message }), {
          status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      customerId = newCust.id;
      console.log('Created new customer:', customerId);
    }

    // --- Fetch plan with services and tenant ---
    const { data: plan, error: planErr } = await supabase
      .from('subscription_plans')
      .select('*, tenant:tenants(name, slug)')
      .eq('id', plan_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (planErr || !plan) {
      console.error('Plan not found:', planErr);
      return new Response(JSON.stringify({ error: 'Plan not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Create pending subscription ---
    const { data: subscription, error: subErr } = await supabase
      .from('customer_subscriptions')
      .insert({
        customer_id: customerId,
        plan_id,
        tenant_id,
        status: 'pending',
      })
      .select()
      .single();

    if (subErr) {
      console.error('Error creating subscription:', subErr);
      return new Response(JSON.stringify({ error: 'Failed to create subscription', details: subErr.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Created pending subscription:', subscription.id);

    // --- Get MP connection ---
    const { data: mpConn, error: mpError } = await supabase
      .from('mercadopago_connections')
      .select('access_token')
      .eq('tenant_id', tenant_id)
      .single();

    if (mpError || !mpConn) {
      return new Response(JSON.stringify({ error: 'Mercado Pago not connected' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://barbeflowmcb.lovable.app';
    const tenantSlug = plan.tenant?.slug || '';

    const mpBody = {
      reason: `${plan.name} - ${plan.tenant?.name || 'BarberFlow'}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
      },
      payer_email: customer_email,
      back_url: `${frontBaseUrl}/${tenantSlug}/subscription/callback`,
      external_reference: subscription.id,
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

    // Update subscription with MP data
    await supabase
      .from('customer_subscriptions')
      .update({
        mp_preapproval_id: mpData.id,
        checkout_url: mpData.init_point,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscription.id);

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
