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
    const { tenant_id, plan_id, customer_name, customer_phone, customer_email, card_token_id } = await req.json();

    // Validação campo a campo
    const missingFields = [];
    if (!tenant_id) missingFields.push('tenant_id');
    if (!plan_id) missingFields.push('plan_id');
    if (!customer_name) missingFields.push('customer_name');
    if (!customer_phone) missingFields.push('customer_phone');
    if (!customer_email) missingFields.push('customer_email');

    if (missingFields.length > 0) {
      console.error('Missing fields:', missingFields);
      return new Response(JSON.stringify({ 
        error: `Campos obrigatórios faltando: ${missingFields.join(', ')}` 
      }), {
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
    console.log('Looking for MP connection for tenant:', tenant_id);
    const { data: mpConn, error: mpError } = await supabase
      .from('mercadopago_connections')
      .select('access_token, token_expires_at')
      .eq('tenant_id', tenant_id)
      .single();

    if (mpError || !mpConn) {
      console.error('MP connection error:', mpError, 'tenant_id:', tenant_id);
      return new Response(JSON.stringify({ 
        error: 'Mercado Pago não está conectado. Conecte nas configurações.' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!mpConn.access_token) {
      console.error('MP access_token is empty for tenant:', tenant_id);
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago inválido. Reconecte nas configurações.' 
      }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (mpConn.token_expires_at && new Date(mpConn.token_expires_at) < new Date()) {
      console.error('MP access_token expired for tenant:', tenant_id, 'expires_at:', mpConn.token_expires_at);
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago expirado. Reconecte nas configurações.' 
      }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://www.barberflow.store';
    const tenantSlug = plan.tenant?.slug || '';

    const backUrl = `${frontBaseUrl}/${tenantSlug}/subscription/callback`;

    const mpBody: any = {
      reason: `${plan.name} - ${plan.tenant?.name || 'modoGESTOR'}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: plan.price_cents / 100,
        currency_id: "BRL",
      },
      payer_email: customer_email,
      external_reference: subscription.id,
      back_url: backUrl,
    };

    // If card_token_id is provided, authorize immediately (in-site payment)
    if (card_token_id) {
      mpBody.card_token_id = card_token_id;
      mpBody.status = "authorized";
      console.log('Using in-site card payment with token');
    } else {
      mpBody.status = "pending";
    }

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

    if (mpResponse.status === 401) {
      console.error('MP returned 401 - token expired or invalid:', JSON.stringify(mpData));
      return new Response(JSON.stringify({ 
        error: 'Token do Mercado Pago expirado. Reconecte nas configurações.' 
      }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!mpResponse.ok) {
      console.error('MP preapproval error:', JSON.stringify(mpData));
      return new Response(JSON.stringify({ error: 'Failed to create subscription in MP', details: mpData }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('MP preapproval created:', mpData.id, 'status:', mpData.status);

    // Update subscription with MP data
    const updateData: any = {
      mp_preapproval_id: mpData.id,
      updated_at: new Date().toISOString(),
    };

    // If authorized via card token, mark as active immediately
    if (card_token_id && mpData.status === 'authorized') {
      updateData.status = 'active';
      updateData.started_at = new Date().toISOString();
      console.log('Subscription activated immediately via card token');
    } else {
      updateData.checkout_url = mpData.init_point;
    }

    await supabase
      .from('customer_subscriptions')
      .update(updateData)
      .eq('id', subscription.id);

    // Send WhatsApp notification if subscription was activated
    if (card_token_id && mpData.status === 'authorized') {
      try {
        const { data: whatsappConn } = await supabase
          .from('whatsapp_connections')
          .select('evolution_instance_name, whatsapp_connected')
          .eq('tenant_id', tenant_id)
          .eq('whatsapp_connected', true)
          .maybeSingle();

        if (whatsappConn) {
          const validityEnd = new Date();
          validityEnd.setDate(validityEnd.getDate() + 30);
          const formattedEnd = validityEnd.toLocaleDateString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          });
          const formattedPrice = `R$ ${(plan.price_cents / 100).toFixed(2)}`;

          const message = `✅ *Assinatura Ativada!*\n\nOlá ${customer_name}!\n\nSua assinatura foi ativada com sucesso.\n\n📋 *Plano:* ${plan.name}\n💰 *Valor:* ${formattedPrice}/mês\n📅 *Válida até:* ${formattedEnd}\n\nSua assinatura será renovada automaticamente a cada 30 dias.\n\n${plan.tenant?.name || 'modoGESTOR'} agradece! 🙏`;

          let phone = canonical;
          if (!phone.startsWith('55')) phone = '55' + phone;

          const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
          if (n8nWebhookUrl) {
            const n8nPayload = {
              type: 'subscription_activated',
              phone,
              message,
              evolution_instance: whatsappConn.evolution_instance_name,
              tenant_id,
              tenant_slug: tenantSlug,
              customer: { name: customer_name, phone: customer_phone },
              tenant: { name: plan.tenant?.name || 'modoGESTOR', slug: tenantSlug },
            };

            const n8nResp = await fetch(n8nWebhookUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(n8nPayload),
            });
            console.log('WhatsApp subscription notification sent, status:', n8nResp.status);
          } else {
            console.log('N8N_WEBHOOK_URL not configured, skipping WhatsApp notification');
          }
        } else {
          console.log('No WhatsApp connection for tenant, skipping notification');
        }
      } catch (notifErr) {
        console.error('Error sending subscription WhatsApp notification:', notifErr);
        // Don't fail the subscription creation if notification fails
      }
    }

    return new Response(JSON.stringify({
      success: true,
      checkout_url: card_token_id ? null : mpData.init_point,
      mp_preapproval_id: mpData.id,
      status: mpData.status,
      activated: card_token_id && mpData.status === 'authorized',
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
