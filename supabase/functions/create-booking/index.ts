import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

// Initialize Supabase client with service-role key for admin operations
const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Error types for standardized error handling
enum ErrorType {
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND', 
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  TIME_CONFLICT = 'TIME_CONFLICT',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  CUSTOMER_CREATE_FAILED = 'CUSTOMER_CREATE_FAILED',
  BOOKING_CREATE_FAILED = 'BOOKING_CREATE_FAILED'
}

interface CreateBookingRequest {
  slug: string;
  service_id: string;
  staff_id?: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_birthday?: string;
  starts_at: string;
  ends_at?: string;
  notes?: string;
  payment_method?: 'online' | 'onsite';
}

interface ErrorResponse {
  error: {
    type: ErrorType;
    message: string;
    details?: any;
  };
}

function createErrorResponse(type: ErrorType, message: string, status: number, details?: any): Response {
  const errorResponse: ErrorResponse = {
    error: {
      type,
      message,
      details
    }
  };
  
  console.error(`[${type}] ${message}`, details || '');
  
  return new Response(
    JSON.stringify(errorResponse),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

// Function to normalize phone numbers for consistent comparison
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  return phone.replace(/\D/g, '');
}

function validatePayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!payload.slug || typeof payload.slug !== 'string') {
    errors.push('slug is required and must be a string');
  }
  
  if (!payload.service_id || typeof payload.service_id !== 'string') {
    errors.push('service_id is required and must be a string');
  }
  
  if (!payload.customer_name || typeof payload.customer_name !== 'string') {
    errors.push('customer_name is required and must be a string');
  }
  
  if (!payload.customer_phone || typeof payload.customer_phone !== 'string') {
    errors.push('customer_phone is required and must be a string');
  }
  
  if (!payload.starts_at || typeof payload.starts_at !== 'string') {
    errors.push('starts_at is required and must be a string');
  } else {
    // Validate starts_at is a valid ISO date
    const startsAt = new Date(payload.starts_at);
    if (isNaN(startsAt.getTime())) {
      errors.push('starts_at must be a valid ISO date string');
    } else if (startsAt <= new Date()) {
      errors.push('starts_at must be in the future');
    }
  }
  
  // Validate phone format (flexible Brazilian phone validation)
  if (payload.customer_phone) {
    const normalizedPhone = normalizePhone(payload.customer_phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 11) {
      errors.push('customer_phone must contain 10 or 11 digits');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse and validate payload
    let payload: CreateBookingRequest;
    try {
      payload = await req.json();
    } catch (parseError) {
      return createErrorResponse(
        ErrorType.INVALID_PAYLOAD,
        'Invalid JSON payload',
        422,
        { parseError: parseError.message }
      );
    }

    console.log('Received booking request:', {
      slug: payload.slug,
      service_id: payload.service_id,
      staff_id: payload.staff_id,
      customer_name: payload.customer_name,
      customer_phone: payload.customer_phone,
      starts_at: payload.starts_at
    });

    // Validate payload
    const validation = validatePayload(payload);
    if (!validation.isValid) {
      return createErrorResponse(
        ErrorType.INVALID_PAYLOAD,
        'Invalid payload',
        422,
        { errors: validation.errors }
      );
    }

    const { slug, service_id, staff_id, customer_name, customer_phone, customer_email, customer_birthday, starts_at, notes, payment_method } = payload;

    // 1. Resolve tenant by slug
    console.log('Resolving tenant by slug:', slug);
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('id, name, settings')
      .eq('slug', slug)
      .single();

    if (tenantError || !tenant) {
      return createErrorResponse(
        ErrorType.TENANT_NOT_FOUND,
        `Tenant not found for slug: ${slug}`,
        404,
        { tenantError }
      );
    }

    const tenant_id = tenant.id;
    console.log('Tenant resolved:', { id: tenant_id, name: tenant.name });

    // 2. Validate service belongs to tenant
    console.log('Validating service:', service_id);
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, duration_minutes, active')
      .eq('id', service_id)
      .eq('tenant_id', tenant_id)
      .single();

    if (serviceError || !service) {
      return createErrorResponse(
        ErrorType.SERVICE_NOT_FOUND,
        `Service not found or doesn't belong to tenant`,
        400,
        { service_id, tenant_id, serviceError }
      );
    }

    if (!service.active) {
      return createErrorResponse(
        ErrorType.SERVICE_NOT_FOUND,
        `Service is inactive`,
        400,
        { service_id }
      );
    }

    console.log('Service validated:', { name: service.name, duration: service.duration_minutes });

    // 3. Resolve staff (validate if provided, or auto-assign)
    let finalStaffId = staff_id;
    if (staff_id) {
      console.log('Validating staff:', staff_id);
      const { data: staffMember, error: staffError } = await supabase
        .from('staff')
        .select('id, name, active')
        .eq('id', staff_id)
        .eq('tenant_id', tenant_id)
        .single();

      if (staffError || !staffMember) {
        return createErrorResponse(
          ErrorType.STAFF_NOT_FOUND,
          `Staff not found or doesn't belong to tenant`,
          400,
          { staff_id, tenant_id, staffError }
        );
      }

      if (!staffMember.active) {
        return createErrorResponse(
          ErrorType.STAFF_NOT_FOUND,
          `Staff member is inactive`,
          400,
          { staff_id }
        );
      }

      console.log('Staff validated:', staffMember.name);
    } else {
      // Auto-assign available staff
      console.log('Auto-assigning staff for service');
      const { data: availableStaff, error: staffError } = await supabase
        .from('staff')
        .select('id, name')
        .eq('tenant_id', tenant_id)
        .eq('active', true)
        .limit(1);

      if (staffError || !availableStaff || availableStaff.length === 0) {
        return createErrorResponse(
          ErrorType.STAFF_NOT_FOUND,
          'No available staff found',
          400,
          { staffError }
        );
      }

      finalStaffId = availableStaff[0].id;
      console.log('Staff auto-assigned:', availableStaff[0].name);
    }

    // 4. Calculate booking times
    const startsAtDate = new Date(starts_at);
    const endsAtDate = new Date(startsAtDate.getTime() + (service.duration_minutes * 60 * 1000));
    const ends_at = endsAtDate.toISOString();

    console.log('Booking time calculated:', {
      starts_at: startsAtDate.toISOString(),
      ends_at: ends_at,
      duration_minutes: service.duration_minutes
    });

    // 5. Check for time conflicts (overbooking prevention)
    const settings = tenant.settings || {};
    const bufferTime = settings.buffer_time ?? 10; // minutes - use ?? to allow 0 as valid value

    const bufferedStart = new Date(startsAtDate.getTime() - (bufferTime * 60 * 1000));
    const bufferedEnd = new Date(endsAtDate.getTime() + (bufferTime * 60 * 1000));

    console.log('Checking conflicts with buffer:', { bufferTime, bufferedStart, bufferedEnd });

    // Check existing bookings - exclude expired bookings from conflict check
    const { data: conflictingBookings, error: conflictError } = await supabase
      .from('bookings')
      .select('id, starts_at, ends_at, service:services(name), customer:customers(name)')
      .eq('tenant_id', tenant_id)
      .eq('staff_id', finalStaffId)
      .in('status', ['confirmed', 'pending', 'pending_payment', 'completed'])
      .or(`and(starts_at.lt.${bufferedEnd.toISOString()},ends_at.gt.${bufferedStart.toISOString()})`);

    if (conflictError) {
      return createErrorResponse(
        ErrorType.BOOKING_CREATE_FAILED,
        'Error checking booking conflicts',
        500,
        { conflictError }
      );
    }

    if (conflictingBookings && conflictingBookings.length > 0) {
      return createErrorResponse(
        ErrorType.TIME_CONFLICT,
        'Time slot is not available - conflicting booking exists',
        409,
        { 
          conflicting_bookings: conflictingBookings,
          requested_time: { starts_at, ends_at },
          buffer_time_minutes: bufferTime
        }
      );
    }

    // Check schedule blocks
    const { data: blocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, starts_at, ends_at, reason')
      .eq('tenant_id', tenant_id)
      .or(`staff_id.eq.${finalStaffId},staff_id.is.null`)
      .or(`and(starts_at.lt.${ends_at},ends_at.gt.${starts_at})`);

    if (blocksError) {
      return createErrorResponse(
        ErrorType.BOOKING_CREATE_FAILED,
        'Error checking schedule blocks',
        500,
        { blocksError }
      );
    }

    if (blocks && blocks.length > 0) {
      return createErrorResponse(
        ErrorType.TIME_CONFLICT,
        'Time slot is blocked for appointments',
        409,
        { blocks }
      );
    }

    console.log('No conflicts found, proceeding with booking creation');

    // 6. Upsert customer (find existing or create new)
    let customer_id: string;
    
    // Normalize phone for consistent comparison
    const normalizedPhone = normalizePhone(customer_phone);
    
    console.log('Looking for existing customer with normalized phone:', normalizedPhone);
    
    // First, try to find existing customer by normalized phone
    const { data: allCustomers, error: customerSearchError } = await supabase
      .from('customers')
      .select('id, name, phone')
      .eq('tenant_id', tenant_id);

    if (customerSearchError) {
      return createErrorResponse(
        ErrorType.CUSTOMER_CREATE_FAILED,
        'Error searching for existing customer',
        500,
        { customerSearchError }
      );
    }

    // Find customer with matching normalized phone and name
    const existingCustomer = allCustomers?.find(customer => 
      normalizePhone(customer.phone) === normalizedPhone && 
      customer.name.toLowerCase().trim() === customer_name.toLowerCase().trim()
    );

    if (existingCustomer) {
      customer_id = existingCustomer.id;
      console.log('Using existing customer:', existingCustomer.name);
    } else {
      // Create new customer
      console.log('Creating new customer:', customer_name);
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({
          tenant_id,
          name: customer_name.trim(),
          phone: normalizedPhone,
          email: customer_email,
          birthday: customer_birthday || null,
        })
        .select('id')
        .single();

      if (customerCreateError || !newCustomer) {
        return createErrorResponse(
          ErrorType.CUSTOMER_CREATE_FAILED,
          'Failed to create customer record',
          500,
          { customerCreateError }
        );
      }

      customer_id = newCustomer.id;
      console.log('New customer created with ID:', customer_id);
    }

    // 7. Create the booking
    // Status depends on payment method:
    // - 'pending_payment' for online payment (will be confirmed by webhook when paid)
    // - 'confirmed' for on-site payment or no payment required
    const bookingStatus = payment_method === 'online' ? 'pending_payment' : 'confirmed';
    
    console.log('Creating booking with data:', {
      tenant_id,
      service_id,
      staff_id: finalStaffId,
      customer_id,
      starts_at,
      ends_at,
      status: bookingStatus,
      notes: notes || null,
      created_via: 'public',
      payment_method: payment_method || 'onsite'
    });

    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id,
        service_id,
        staff_id: finalStaffId,
        customer_id,
        starts_at,
        ends_at,
        status: bookingStatus,
        notes: notes || null,
        created_via: 'public'
      })
      .select(`
        *,
        service:services(name, price_cents, duration_minutes),
        staff:staff(name),
        customer:customers(name, phone, email)
      `)
      .single();

    if (bookingError || !booking) {
      return createErrorResponse(
        ErrorType.BOOKING_CREATE_FAILED,
        'Failed to create booking record',
        500,
        { bookingError }
      );
    }

    console.log('Booking created successfully:', {
      id: booking.id,
      customer: booking.customer?.name,
      service: booking.service?.name,
      staff: booking.staff?.name,
      starts_at: booking.starts_at
    });

    // Send WhatsApp notification for confirmed bookings (onsite payment)
    // For online payment, notification will be sent after payment confirmation
    if (bookingStatus === 'confirmed') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const notificationResponse = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({
            type: 'booking_confirmed',
            booking_id: booking.id,
            tenant_id: tenant_id,
          }),
        });
        
        if (!notificationResponse.ok) {
          console.error('Failed to send WhatsApp notification:', await notificationResponse.text());
        } else {
          console.log('WhatsApp notification sent successfully');
        }
      } catch (notifError) {
        // Don't fail the booking if notification fails
        console.error('Error sending WhatsApp notification:', notifError);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        booking: booking,
        message: 'Agendamento criado com sucesso!'
      }),
      { 
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Unexpected error in create-booking:', error);
    return createErrorResponse(
      ErrorType.BOOKING_CREATE_FAILED,
      'Internal server error',
      500,
      { 
        error: error.message,
        stack: error.stack
      }
    );
  }
});