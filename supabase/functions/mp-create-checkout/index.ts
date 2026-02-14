import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidMpToken } from "../_shared/mp-token.ts";

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
    const { booking_id } = await req.json();
    
    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'booking_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch booking with related data
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        tenant:tenants(*),
        service:services(*),
        customer:customers(*)
      `)
      .eq('id', booking_id)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Agendamento não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tenant = booking.tenant;
    const service = booking.service;
    const settings = tenant.settings || {};

    // Check if online payment is enabled
    if (!settings.allow_online_payment) {
      return new Response(
        JSON.stringify({ error: 'Pagamento online não está habilitado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid MP token for this tenant (auto-refreshes if needed)
    const mpToken = await getValidMpToken(supabase, tenant.id);

    if (!mpToken) {
      console.error('MP connection not found or token invalid for tenant:', tenant.id);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não conectado ou token expirado' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount
    let amountCents = service.price_cents;
    if (settings.require_prepayment && settings.prepayment_percentage > 0 && settings.prepayment_percentage < 100) {
      amountCents = Math.round(service.price_cents * (settings.prepayment_percentage / 100));
    }

    // Check if payment already exists for this booking
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('provider', 'mercadopago')
      .maybeSingle();

    let paymentId: string;

    if (existingPayment) {
      // Update existing payment
      paymentId = existingPayment.id;
      await supabase
        .from('payments')
        .update({
          amount_cents: amountCents,
          status: 'pending',
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);
    } else {
      // Create new payment record
      const { data: newPayment, error: paymentError } = await supabase
        .from('payments')
        .insert({
          tenant_id: tenant.id,
          booking_id: booking_id,
          provider: 'mercadopago',
          amount_cents: amountCents,
          currency: 'BRL',
          status: 'pending',
        })
        .select('id')
        .single();

      if (paymentError || !newPayment) {
        console.error('Error creating payment:', paymentError);
        return new Response(
          JSON.stringify({ error: 'Erro ao criar registro de pagamento' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      paymentId = newPayment.id;
    }

    // Build back URLs
    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://lovable.dev';
    const webhookUrl = Deno.env.get('MP_WEBHOOK_URL');
    
    const backUrl = `${frontBaseUrl}/${tenant.slug}/pagamento/retorno?booking_id=${booking_id}&payment_id=${paymentId}`;

    // Create Mercado Pago preference
    const preferencePayload = {
      items: [
        {
          id: service.id,
          title: `${service.name} - ${tenant.name}`,
          description: `Agendamento em ${tenant.name}`,
          quantity: 1,
          currency_id: 'BRL',
          unit_price: amountCents / 100,
        },
      ],
      payer: {
        name: booking.customer?.name || '',
        phone: booking.customer?.phone ? {
          number: booking.customer.phone.replace(/\D/g, ''),
        } : undefined,
        email: booking.customer?.email || undefined,
      },
      back_urls: {
        success: backUrl,
        pending: backUrl,
        failure: backUrl,
      },
      auto_return: 'approved',
      external_reference: paymentId,
      metadata: {
        booking_id,
        tenant_id: tenant.id,
        payment_id: paymentId,
      },
      notification_url: webhookUrl,
      statement_descriptor: tenant.name.substring(0, 22),
    };

    console.log('Creating MP preference for payment:', paymentId);

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferencePayload),
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('MP preference creation failed:', mpResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Erro ao criar checkout no Mercado Pago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const preference = await mpResponse.json();
    console.log('MP preference created:', preference.id);

    // Update payment with external_id (preference_id) and checkout_url
    const { error: updateError } = await supabase
      .from('payments')
      .update({
        external_id: preference.id,
        checkout_url: preference.init_point,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h expiry
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment with preference:', updateError);
    }

    // Update booking status to pending if require_prepayment is true
    if (settings.require_prepayment) {
      await supabase
        .from('bookings')
        .update({ status: 'pending' })
        .eq('id', booking_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checkout_url: preference.init_point,
        payment_id: paymentId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-create-checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
