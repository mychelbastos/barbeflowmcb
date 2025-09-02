import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? ''
);

interface CreateBookingRequest {
  tenant_id: string;
  service_id: string;
  staff_id?: string; // Make optional since we can auto-assign staff
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  starts_at: string;
  notes?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      tenant_id,
      service_id,
      staff_id,
      customer_name,
      customer_phone,
      customer_email,
      starts_at,
      notes
    }: CreateBookingRequest = await req.json();

    console.log('Create booking request:', {
      tenant_id,
      service_id,
      staff_id,
      customer_name,
      customer_phone,
      starts_at
    });

    // Validate required fields
    if (!tenant_id || !service_id || !customer_name || !customer_phone || !starts_at) {
      console.error('Missing required fields:', {
        tenant_id: !!tenant_id,
        service_id: !!service_id, 
        staff_id: !!staff_id,
        customer_name: !!customer_name,
        customer_phone: !!customer_phone,
        starts_at: !!starts_at
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: tenant_id, service_id, customer_name, customer_phone, starts_at' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate phone format (basic Brazilian phone validation) - be more flexible
    const phoneRegex = /^\(\d{2}\)\s?\d{4,5}-?\d{4}$/;
    if (!phoneRegex.test(customer_phone)) {
      console.error('Invalid phone format:', customer_phone, 'Expected format: (XX) XXXXX-XXXX');
      return new Response(
        JSON.stringify({ error: `Invalid phone format: "${customer_phone}". Use: (XX) XXXXX-XXXX` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no staff_id provided, find an available staff member for this service
    let finalStaffId = staff_id;
    if (!staff_id) {
      console.log('No staff specified, finding available staff for service:', service_id);
      const { data: availableStaff, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', tenant_id)
        .eq('active', true)
        .limit(1)
        .single();
        
      if (staffError || !availableStaff) {
        console.error('No available staff found:', staffError);
        return new Response(
          JSON.stringify({ error: 'Nenhum profissional disponível encontrado' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      finalStaffId = availableStaff.id;
      console.log('Using staff:', availableStaff.name, '(ID:', finalStaffId, ')');
    }

    // Start a transaction-like operation by checking conflicts first
    const startsAtDate = new Date(starts_at);
    
    // Get service duration to calculate end time
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('duration_minutes, name')
      .eq('id', service_id)
      .eq('tenant_id', tenant_id)
      .eq('active', true)
      .single();

    if (serviceError || !service) {
      console.error('Service not found:', serviceError);
      return new Response(
        JSON.stringify({ error: 'Service not found or inactive' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const endsAtDate = new Date(startsAtDate.getTime() + (service.duration_minutes * 60 * 1000));
    const ends_at = endsAtDate.toISOString();

    // Get tenant settings for buffer time
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenant_id)
      .single();

    const settings = tenant?.settings || {};
    const bufferTime = settings.buffer_time || 10; // minutes

    // Check for conflicts with existing bookings (with buffer)
    const bufferedStart = new Date(startsAtDate.getTime() - (bufferTime * 60 * 1000));
    const bufferedEnd = new Date(endsAtDate.getTime() + (bufferTime * 60 * 1000));

    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id, starts_at, ends_at')
      .eq('tenant_id', tenant_id)
      .eq('staff_id', finalStaffId)
      .in('status', ['confirmed', 'pending'])
      .or(`and(starts_at.lt.${bufferedEnd.toISOString()},ends_at.gt.${bufferedStart.toISOString()})`);

    if (conflictError) {
      console.error('Error checking conflicts:', conflictError);
      return new Response(
        JSON.stringify({ error: 'Error checking booking conflicts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      console.log('Booking conflict detected:', conflictingBookings);
      return new Response(
        JSON.stringify({ 
          error: 'Horário não disponível. Já existe um agendamento neste período.',
          conflicting_bookings: conflictingBookings 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for blocks
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, starts_at, ends_at, reason')
      .eq('tenant_id', tenant_id)
      .or(`staff_id.eq.${finalStaffId},staff_id.is.null`)
      .or(`and(starts_at.lt.${ends_at},ends_at.gt.${starts_at})`);

    if (blocksError) {
      console.error('Error checking blocks:', blocksError);
      return new Response(
        JSON.stringify({ error: 'Error checking schedule blocks' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (blocks && blocks.length > 0) {
      console.log('Schedule block detected:', blocks);
      return new Response(
        JSON.stringify({ 
          error: 'Horário bloqueado para agendamentos.',
          blocks: blocks 
        }),
        { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find or create customer
    let customer_id: string;
    
    // First try to find existing customer by phone
    const { data: existingCustomer, error: customerSearchError } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('phone', customer_phone)
      .single();

    if (customerSearchError && customerSearchError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error searching customer:', customerSearchError);
      return new Response(
        JSON.stringify({ error: 'Error searching customer database' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (existingCustomer) {
      customer_id = existingCustomer.id;
      console.log('Using existing customer:', customer_id);
    } else {
      // Create new customer
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          name: customer_name,
          phone: customer_phone,
          email: customer_email
        })
        .select('id')
        .single();

      if (customerCreateError || !newCustomer) {
        console.error('Error creating customer:', customerCreateError);
        return new Response(
          JSON.stringify({ error: 'Error creating customer record' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      customer_id = newCustomer.id;
      console.log('Created new customer:', customer_id);
    }

    // Create the booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id,
        service_id,
        staff_id: finalStaffId,
        customer_id,
        starts_at,
        ends_at,
        status: 'confirmed',
        notes,
        created_via: 'public'
      })
      .select(`
        *,
        service:services(name, price_cents),
        staff:staff(name),
        customer:customers(name, phone, email)
      `)
      .single();

    if (bookingError || !booking) {
      console.error('Error creating booking:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Error creating booking record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Booking created successfully:', booking.id);

    return new Response(
      JSON.stringify({ 
        success: true,
        booking: booking,
        message: 'Agendamento criado com sucesso!'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-booking:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});