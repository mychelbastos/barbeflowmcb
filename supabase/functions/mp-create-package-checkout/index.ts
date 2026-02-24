import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidMpToken } from "../_shared/mp-token.ts";
import { getCommissionRate } from "../_shared/commission.ts";

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tenant_id,
      package_id,
      customer_name,
      customer_phone,
      customer_email,
      customer_cpf,
    } = await req.json();

    if (!tenant_id || !package_id || !customer_name || !customer_phone || !customer_email || !customer_cpf) {
      return new Response(
        JSON.stringify({ error: 'Campos obrigatórios: tenant_id, package_id, customer_name, customer_phone, customer_email, customer_cpf' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // 1. Buscar pacote
    const { data: pkg, error: pkgErr } = await supabase
      .from('service_packages')
      .select('*')
      .eq('id', package_id)
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();

    if (pkgErr || !pkg) {
      return new Response(
        JSON.stringify({ error: 'Pacote não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Buscar tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants').select('*').eq('id', tenant_id).single();

    if (tenantErr || !tenant) {
      return new Response(
        JSON.stringify({ error: 'Estabelecimento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 3. Buscar ou criar cliente
    const canonical = canonicalPhone(customer_phone);
    const variants = [canonical];
    if (canonical.length === 11) variants.push(canonical.slice(0, 2) + canonical.slice(3));
    if (canonical.length === 10) variants.push(canonical.slice(0, 2) + '9' + canonical.slice(2));

    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, name, email')
      .eq('tenant_id', tenant_id)
      .or(variants.map(p => `phone.eq.${p}`).join(','))
      .limit(1)
      .maybeSingle();

    let customerId: string;

    if (existingCustomer) {
      customerId = existingCustomer.id;
      if (customer_email && !existingCustomer.email) {
        await supabase.from('customers').update({ email: customer_email }).eq('id', customerId);
      }
    } else {
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          name: customer_name.trim(),
          phone: canonical,
          email: customer_email.trim(),
        })
        .select('id')
        .single();

      if (custErr || !newCust) {
        return new Response(
          JSON.stringify({ error: 'Erro ao criar cliente' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      customerId = newCust.id;
    }

    // 4. Buscar serviços do pacote
    const { data: pkgSvcs } = await supabase
      .from('package_services')
      .select('service_id, sessions_count')
      .eq('package_id', package_id);

    const totalSessions = (pkgSvcs || []).reduce((sum: number, s: any) => sum + s.sessions_count, 0);

    // 5. Criar customer_packages com status pending
    const { data: customerPkg, error: cpErr } = await supabase
      .from('customer_packages')
      .insert({
        customer_id: customerId,
        package_id,
        tenant_id,
        sessions_total: totalSessions,
        sessions_used: 0,
        status: 'active',
        payment_status: 'pending',
      })
      .select('id')
      .single();

    if (cpErr || !customerPkg) {
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro do pacote' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5b. Criar customer_package_services
    if (pkgSvcs && pkgSvcs.length > 0) {
      await supabase.from('customer_package_services').insert(
        pkgSvcs.map((ps: any) => ({
          customer_package_id: customerPkg.id,
          service_id: ps.service_id,
          sessions_total: ps.sessions_count,
          sessions_used: 0,
        }))
      );
    }

    // 6. Obter token do MP
    const mpToken = await getValidMpToken(supabase, tenant_id);
    if (!mpToken) {
      return new Response(
        JSON.stringify({
          success: true,
          customer_package_id: customerPkg.id,
          payment_method: 'local',
          message: 'Pacote criado. Pagamento online não disponível — pague no local.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 7. Calcular comissão da plataforma
    const commissionRate = await getCommissionRate(supabase, tenant_id);
    const transactionAmount = pkg.price_cents / 100;
    const marketplaceFee = Math.round(transactionAmount * commissionRate * 100) / 100;

    // 8. Criar registro de payment
    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .insert({
        tenant_id,
        booking_id: null,
        provider: 'mercadopago',
        amount_cents: pkg.price_cents,
        currency: 'BRL',
        status: 'pending',
        customer_package_id: customerPkg.id,
      })
      .select('id')
      .single();

    if (payErr || !payment) {
      console.error('Error creating payment:', payErr);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar registro de pagamento' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 9. Criar preference no Mercado Pago
    let frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://www.modogestor.com.br';
    if (!frontBaseUrl.startsWith('http')) frontBaseUrl = `https://${frontBaseUrl}`;
    const webhookUrl = Deno.env.get('MP_WEBHOOK_URL');

    const backUrl = `${frontBaseUrl}/${tenant.slug}/pacote/retorno?customer_package_id=${customerPkg.id}&payment_id=${payment.id}`;

    const preferencePayload: any = {
      items: [{
        id: package_id,
        title: `${pkg.name} - ${tenant.name}`,
        description: `Pacote com ${totalSessions} sessões`,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: transactionAmount,
        category_id: 'services',
      }],
      payer: {
        name: customer_name.trim(),
        email: customer_email.trim(),
        phone: { number: canonical },
        identification: {
          type: 'CPF',
          number: customer_cpf.replace(/\D/g, ''),
        },
      },
      back_urls: {
        success: backUrl,
        pending: backUrl,
        failure: backUrl,
      },
      auto_return: 'approved',
      external_reference: payment.id,
      metadata: {
        payment_id: payment.id,
        tenant_id,
        customer_package_id: customerPkg.id,
      },
      statement_descriptor: tenant.name.substring(0, 22),
    };

    if (marketplaceFee > 0) {
      preferencePayload.marketplace_fee = marketplaceFee;
    }
    if (webhookUrl) {
      preferencePayload.notification_url = webhookUrl;
    }

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken.access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'MercadoPago DX-Nodejs/2.11.0',
        'x-product-id': 'BC32BHVTRPP001U8NHJ0',
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errText = await mpResponse.text();
      console.error('MP preference error:', mpResponse.status, errText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar checkout no Mercado Pago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();

    // 10. Atualizar payment com dados do MP
    await supabase.from('payments').update({
      external_id: preference.id,
      checkout_url: preference.init_point,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }).eq('id', payment.id);

    // 11. Registrar comissão
    if (marketplaceFee > 0) {
      await supabase.from('platform_fees').insert({
        tenant_id,
        payment_id: payment.id,
        transaction_amount_cents: pkg.price_cents,
        commission_rate: commissionRate,
        fee_amount_cents: Math.round(marketplaceFee * 100),
        status: 'pending',
      });
    }

    console.log(`Package checkout created: pkg=${package_id}, payment=${payment.id}, preference=${preference.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: preference.init_point,
        customer_package_id: customerPkg.id,
        payment_id: payment.id,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-create-package-checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
