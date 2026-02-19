import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getValidMpToken } from "../_shared/mp-token.ts";
import { getCommissionRate } from "../_shared/commission.ts";

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
    const { 
      booking_id, 
      token, 
      payment_method_id, 
      payer,
      payment_type, // 'card' or 'pix'
      customer_package_id, // optional: for package purchases
      package_amount_cents, // optional: override amount for packages
    } = await req.json();
    
    console.log('Processing payment for booking:', booking_id, 'type:', payment_type, 'package:', customer_package_id);

    if (!booking_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: booking_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For card payments, token and payment_method_id are required
    if (payment_type === 'card' && (!token || !payment_method_id)) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields for card payment: token, payment_method_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get booking with tenant, service, and customer data
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
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get valid MP token (auto-refreshes if needed)
    const mpToken = await getValidMpToken(supabase, booking.tenant_id);

    if (!mpToken) {
      console.error('MP connection not found or token invalid for tenant:', booking.tenant_id);
      return new Response(
        JSON.stringify({ error: 'Mercado Pago not connected or token expired' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate amount
    const settings = booking.tenant?.settings || {};
    const servicePriceCents = booking.service?.price_cents || 0;
    const requirePrepayment = settings.require_prepayment || false;
    const prepaymentPercentage = settings.prepayment_percentage || 0;
    
    let amountCents = servicePriceCents;
    // If it's a package purchase, use the package amount
    if (package_amount_cents && customer_package_id) {
      amountCents = package_amount_cents;
    } else if (requirePrepayment && prepaymentPercentage > 0 && prepaymentPercentage < 100) {
      amountCents = Math.round(servicePriceCents * prepaymentPercentage / 100);
    }

    // --- Platform commission (marketplace fee) ---
    const commissionRate = await getCommissionRate(supabase, booking.tenant_id);
    const transactionAmount = amountCents / 100;
    const applicationFee = Math.round(transactionAmount * commissionRate * 100) / 100;
    console.log(`Platform commission: ${commissionRate * 100}% = R$${applicationFee} on R$${transactionAmount}`);

    // Check/create payment record
    let paymentRecord;
    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('booking_id', booking_id)
      .single();

    if (existingPayment) {
      paymentRecord = existingPayment;
    } else {
      const { data: newPayment, error: createError } = await supabase
        .from('payments')
        .insert({
          tenant_id: booking.tenant_id,
          booking_id: booking_id,
          amount_cents: amountCents,
          status: 'pending',
          provider: 'mercadopago',
          currency: 'BRL',
          customer_package_id: customer_package_id || null,
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating payment:', createError);
        return new Response(
          JSON.stringify({ error: 'Failed to create payment record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      paymentRecord = newPayment;
    }

    // Build payment body based on type
    let mpPaymentBody: any;
    const description = `${booking.service?.name || 'Serviço'} - ${booking.tenant?.name || 'Estabelecimento'}`;

    const webhookUrl = Deno.env.get('MP_WEBHOOK_URL');
    const statementDescriptor = (booking.tenant?.name || 'modoGESTOR').substring(0, 22);
    const customerFirstName = booking.customer?.name?.split(' ')[0] || 'Cliente';
    const customerLastName = booking.customer?.name?.split(' ').slice(1).join(' ') || '';

    const itemsArray = [
      {
        id: booking.service?.id || booking.service_id,
        title: booking.service?.name || 'Serviço',
        description: `Agendamento em ${booking.tenant?.name || 'Estabelecimento'}`,
        quantity: 1,
        unit_price: amountCents / 100,
        category_id: 'services',
      },
    ];

    if (payment_type === 'pix') {
      // PIX payment
      console.log('Creating PIX payment...');
      mpPaymentBody = {
        transaction_amount: amountCents / 100,
        description: description,
        payment_method_id: 'pix',
        ...(applicationFee > 0 ? { application_fee: applicationFee } : {}),
        statement_descriptor: statementDescriptor,
        notification_url: webhookUrl || undefined,
        additional_info: {
          items: itemsArray,
        },
        payer: {
          email: payer?.email || booking.customer?.email || 'cliente@example.com',
          first_name: customerFirstName,
          last_name: customerLastName,
          identification: payer?.identification || undefined,
        },
        external_reference: paymentRecord.id,
        metadata: {
          booking_id: booking_id,
          payment_id: paymentRecord.id,
          tenant_id: booking.tenant_id,
        },
      };
    } else {
      // Card payment (credit card à vista)
      console.log('Creating card payment...');
      mpPaymentBody = {
        transaction_amount: amountCents / 100,
        token: token,
        description: description,
        installments: 1,
        payment_method_id: payment_method_id,
        ...(applicationFee > 0 ? { application_fee: applicationFee } : {}),
        statement_descriptor: statementDescriptor,
        notification_url: webhookUrl || undefined,
        additional_info: {
          items: itemsArray,
        },
        payer: {
          email: payer?.email || booking.customer?.email || 'cliente@example.com',
          first_name: customerFirstName,
          last_name: customerLastName,
          identification: payer?.identification || undefined,
        },
        external_reference: paymentRecord.id,
        metadata: {
          booking_id: booking_id,
          payment_id: paymentRecord.id,
          tenant_id: booking.tenant_id,
        },
      };
    }

    console.log('MP Payment body:', JSON.stringify(mpPaymentBody, null, 2));

    const mpResponse = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpToken.access_token}`,
        'X-Idempotency-Key': `${booking_id}-${payment_type}-${Date.now()}`,
      },
      body: JSON.stringify(mpPaymentBody),
    });

    const mpResult = await mpResponse.json();
    console.log('MP Response:', JSON.stringify(mpResult, null, 2));

    if (!mpResponse.ok) {
      console.error('MP payment error:', mpResult);
      
      // Update payment status to failed
      await supabase
        .from('payments')
        .update({ 
          status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', paymentRecord.id);

      return new Response(
        JSON.stringify({ 
          error: 'Payment processing failed',
          mp_error: mpResult,
          status: 'rejected'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Map MP status to our status
    let paymentStatus = 'pending';
    let bookingStatus = booking.status;
    
    switch (mpResult.status) {
      case 'approved':
        paymentStatus = 'paid';
        bookingStatus = 'confirmed';
        break;
      case 'pending':
      case 'in_process':
        paymentStatus = 'pending';
        break;
      case 'rejected':
      case 'cancelled':
        paymentStatus = 'failed';
        break;
    }

    // Update payment record
    await supabase
      .from('payments')
      .update({
        status: paymentStatus,
        external_id: mpResult.id?.toString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.id);

    // Update booking status if payment approved
    if (bookingStatus !== booking.status) {
      await supabase
        .from('bookings')
        .update({ 
          status: bookingStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', booking_id);
    }

    console.log('Payment processed successfully:', mpResult.id, 'Status:', mpResult.status);

    // Record platform fee if applicable
    if (mpResult.status === 'approved' && applicationFee > 0) {
      await supabase.from('platform_fees').insert({
        tenant_id: booking.tenant_id,
        payment_id: paymentRecord.id,
        mp_payment_id: mpResult.id?.toString(),
        transaction_amount_cents: amountCents,
        commission_rate: commissionRate,
        fee_amount_cents: Math.round(applicationFee * 100),
        status: 'collected',
      });
    }

    // Build response with PIX data if applicable
    const response: any = {
      success: true,
      payment_id: paymentRecord.id,
      mp_payment_id: mpResult.id,
      status: mpResult.status,
      status_detail: mpResult.status_detail,
    };

    // Include PIX data if available
    if (payment_type === 'pix' && mpResult.point_of_interaction?.transaction_data) {
      const txData = mpResult.point_of_interaction.transaction_data;
      response.pix = {
        qr_code: txData.qr_code,
        qr_code_base64: txData.qr_code_base64,
        ticket_url: txData.ticket_url,
      };
      response.expires_at = mpResult.date_of_expiration;
    }

    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-process-payment:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
