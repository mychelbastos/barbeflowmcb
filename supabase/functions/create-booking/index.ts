import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

enum ErrorType {
  TENANT_NOT_FOUND = 'TENANT_NOT_FOUND',
  SERVICE_NOT_FOUND = 'SERVICE_NOT_FOUND',
  STAFF_NOT_FOUND = 'STAFF_NOT_FOUND',
  TIME_CONFLICT = 'TIME_CONFLICT',
  INVALID_PAYLOAD = 'INVALID_PAYLOAD',
  CUSTOMER_CREATE_FAILED = 'CUSTOMER_CREATE_FAILED',
  BOOKING_CREATE_FAILED = 'BOOKING_CREATE_FAILED',
  PACKAGE_INVALID = 'PACKAGE_INVALID',
  SUBSCRIPTION_INVALID = 'SUBSCRIPTION_INVALID',
}

interface CreateBookingRequest {
  slug?: string;
  tenant_id?: string;
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
  customer_package_id?: string;
  customer_subscription_id?: string;
  extra_slots?: number;
  created_via?: string;
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
    error: { type, message, details }
  };
  console.error(`[${type}] ${message}`, details || '');
  return new Response(
    JSON.stringify(errorResponse),
    { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}

function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
}

function validatePayload(payload: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if ((!payload.slug || typeof payload.slug !== 'string') && (!payload.tenant_id || typeof payload.tenant_id !== 'string')) {
    errors.push('slug or tenant_id is required');
  }
  if (!payload.service_id || typeof payload.service_id !== 'string') errors.push('service_id is required');
  if (!payload.customer_name || typeof payload.customer_name !== 'string') errors.push('customer_name is required');
  if (!payload.customer_phone || typeof payload.customer_phone !== 'string') errors.push('customer_phone is required');
  if (!payload.starts_at || typeof payload.starts_at !== 'string') {
    errors.push('starts_at is required');
  } else {
    const startsAt = new Date(payload.starts_at);
    if (isNaN(startsAt.getTime())) errors.push('starts_at must be a valid ISO date');
    else if (startsAt <= new Date()) errors.push('starts_at must be in the future');
  }
  if (payload.customer_phone) {
    const normalizedPhone = normalizePhone(payload.customer_phone);
    if (normalizedPhone.length < 10 || normalizedPhone.length > 13) errors.push('invalid phone');
  }
  return { isValid: errors.length === 0, errors };
}

// --- Package session logic ---
async function handlePackageSession(customerPackageId: string, serviceId: string, bookingId: string) {
  // 1. Validate package
  const { data: pkg, error: pkgErr } = await supabase
    .from('customer_packages')
    .select('id, status, payment_status, sessions_used, sessions_total')
    .eq('id', customerPackageId)
    .eq('status', 'active')
    .eq('payment_status', 'confirmed')
    .single();

  if (pkgErr || !pkg) {
    console.error('Package not found or invalid:', pkgErr);
    return { valid: false, error: 'Package not active or not confirmed' };
  }

  // 2. Find service usage record
  const { data: pkgService, error: psErr } = await supabase
    .from('customer_package_services')
    .select('id, sessions_used, sessions_total')
    .eq('customer_package_id', customerPackageId)
    .eq('service_id', serviceId)
    .single();

  if (psErr || !pkgService) {
    console.error('Package service not found:', psErr);
    return { valid: false, error: 'Service not found in package' };
  }

  if (pkgService.sessions_used >= pkgService.sessions_total) {
    return { valid: false, error: 'No sessions remaining for this service' };
  }

  // 3. Increment service-level usage
  await supabase
    .from('customer_package_services')
    .update({ sessions_used: pkgService.sessions_used + 1 })
    .eq('id', pkgService.id);

  // 4. Increment package-level usage and check completion
  const newUsed = (pkg.sessions_used || 0) + 1;
  const updateData: Record<string, any> = { sessions_used: newUsed };
  if (newUsed >= pkg.sessions_total) {
    updateData.status = 'completed';
  }
  await supabase
    .from('customer_packages')
    .update(updateData)
    .eq('id', customerPackageId);

  console.log(`Package session decremented: ${newUsed}/${pkg.sessions_total}`);
  return { valid: true };
}

// --- Subscription session logic ---
async function handleSubscriptionSession(customerSubscriptionId: string, serviceId: string, bookingId: string) {
  // 1. Validate subscription
  const { data: sub, error: subErr } = await supabase
    .from('customer_subscriptions')
    .select('id, status, plan_id')
    .eq('id', customerSubscriptionId)
    .in('status', ['active', 'authorized'])
    .single();

  if (subErr || !sub) {
    console.error('Subscription not found or invalid:', subErr);
    return { valid: false, error: 'Subscription not active' };
  }

  // 2. Check plan service config
  const { data: planService, error: psErr } = await supabase
    .from('subscription_plan_services')
    .select('sessions_per_cycle')
    .eq('plan_id', sub.plan_id)
    .eq('service_id', serviceId)
    .single();

  if (psErr || !planService) {
    console.error('Service not in subscription plan:', psErr);
    return { valid: false, error: 'Service not covered by subscription' };
  }

  // 3. Find or create usage record for current cycle
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const periodStartStr = periodStart.toISOString().split('T')[0];
  const periodEndStr = periodEnd.toISOString().split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  let { data: usage } = await supabase
    .from('subscription_usage')
    .select('id, sessions_used, sessions_limit, booking_ids')
    .eq('subscription_id', customerSubscriptionId)
    .eq('service_id', serviceId)
    .lte('period_start', todayStr)
    .gte('period_end', todayStr)
    .maybeSingle();

  if (!usage) {
    const { data: newUsage } = await supabase
      .from('subscription_usage')
      .insert({
        subscription_id: customerSubscriptionId,
        service_id: serviceId,
        period_start: periodStartStr,
        period_end: periodEndStr,
        sessions_used: 0,
        sessions_limit: planService.sessions_per_cycle,
      })
      .select()
      .single();
    usage = newUsage;
  }

  if (!usage) {
    return { valid: false, error: 'Failed to create usage record' };
  }

  // 4. Check limit (null = unlimited)
  if (usage.sessions_limit !== null && usage.sessions_used >= usage.sessions_limit) {
    return { valid: false, error: 'Session limit reached for this cycle' };
  }

  // 5. Increment usage
  const newBookingIds = [...(usage.booking_ids || []), bookingId];
  await supabase
    .from('subscription_usage')
    .update({
      sessions_used: usage.sessions_used + 1,
      booking_ids: newBookingIds,
    })
    .eq('id', usage.id);

  console.log(`Subscription session used: ${usage.sessions_used + 1}/${usage.sessions_limit ?? '∞'}`);
  return { valid: true };
}

serve(async (req) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let payload: CreateBookingRequest;
    try {
      payload = await req.json();
    } catch (parseError) {
      return createErrorResponse(ErrorType.INVALID_PAYLOAD, 'Invalid JSON payload', 422, { parseError: parseError.message });
    }

    console.log('Received booking request:', {
      slug: payload.slug, service_id: payload.service_id, staff_id: payload.staff_id,
      customer_name: payload.customer_name, customer_phone: payload.customer_phone,
      starts_at: payload.starts_at,
      customer_package_id: payload.customer_package_id,
      customer_subscription_id: payload.customer_subscription_id,
    });

    const validation = validatePayload(payload);
    if (!validation.isValid) {
      return createErrorResponse(ErrorType.INVALID_PAYLOAD, 'Invalid payload', 422, { errors: validation.errors });
    }

    const { slug, service_id, staff_id, customer_name, customer_phone, customer_email, customer_birthday, starts_at, notes, payment_method, customer_package_id, customer_subscription_id } = payload;

    // 1. Resolve tenant
    let tenantQuery = supabase.from('tenants').select('id, name, slug, settings');
    if (payload.tenant_id) {
      tenantQuery = tenantQuery.eq('id', payload.tenant_id);
    } else {
      tenantQuery = tenantQuery.eq('slug', slug);
    }
    const { data: tenant, error: tenantError } = await tenantQuery.single();
    if (tenantError || !tenant) {
      return createErrorResponse(ErrorType.TENANT_NOT_FOUND, `Tenant not found: ${slug}`, 404);
    }
    const tenant_id = tenant.id;

    // 2. Validate service
    const { data: service, error: serviceError } = await supabase
      .from('services').select('id, name, duration_minutes, active')
      .eq('id', service_id).eq('tenant_id', tenant_id).single();
    if (serviceError || !service || !service.active) {
      return createErrorResponse(ErrorType.SERVICE_NOT_FOUND, 'Service not found or inactive', 400);
    }

    // 3. Pre-validate package/subscription sessions BEFORE creating booking
    if (customer_package_id) {
      const { data: pkg } = await supabase
        .from('customer_packages')
        .select('id, status, payment_status')
        .eq('id', customer_package_id).eq('status', 'active').eq('payment_status', 'confirmed').single();
      if (!pkg) {
        return createErrorResponse(ErrorType.PACKAGE_INVALID, 'Package not active or not confirmed', 400);
      }
      const { data: pkgSvc } = await supabase
        .from('customer_package_services')
        .select('sessions_used, sessions_total')
        .eq('customer_package_id', customer_package_id).eq('service_id', service_id).single();
      if (!pkgSvc || pkgSvc.sessions_used >= pkgSvc.sessions_total) {
        return createErrorResponse(ErrorType.PACKAGE_INVALID, 'No sessions remaining', 400);
      }
    }

    if (customer_subscription_id) {
      const { data: sub } = await supabase
        .from('customer_subscriptions')
        .select('id, status, plan_id')
        .eq('id', customer_subscription_id).in('status', ['active', 'authorized']).single();
      if (!sub) {
        return createErrorResponse(ErrorType.SUBSCRIPTION_INVALID, 'Subscription not active', 400);
      }
      const { data: planSvc } = await supabase
        .from('subscription_plan_services')
        .select('sessions_per_cycle')
        .eq('plan_id', sub.plan_id).eq('service_id', service_id).single();
      if (!planSvc) {
        return createErrorResponse(ErrorType.SUBSCRIPTION_INVALID, 'Service not in subscription', 400);
      }
    }

    // 4. Resolve staff
    let finalStaffId = staff_id;
    if (staff_id) {
      const { data: staffMember, error: staffError } = await supabase
        .from('staff').select('id, name, active')
        .eq('id', staff_id).eq('tenant_id', tenant_id).single();
      if (staffError || !staffMember || !staffMember.active) {
        return createErrorResponse(ErrorType.STAFF_NOT_FOUND, 'Staff not found or inactive', 400);
      }
    } else {
      const { data: availableStaff } = await supabase
        .from('staff').select('id, name')
        .eq('tenant_id', tenant_id).eq('active', true).limit(1);
      if (!availableStaff || availableStaff.length === 0) {
        return createErrorResponse(ErrorType.STAFF_NOT_FOUND, 'No available staff', 400);
      }
      finalStaffId = availableStaff[0].id;
    }

    // 5. Calculate times
    const startsAtDate = new Date(starts_at);
    const tenantSettings = tenant.settings || {};
    const extraSlotDuration = tenantSettings.extra_slot_duration || 5;
    const extraMinutes = (payload.extra_slots || 0) * extraSlotDuration;
    const totalDuration = service.duration_minutes + extraMinutes;
    const endsAtDate = new Date(startsAtDate.getTime() + (totalDuration * 60 * 1000));
    const ends_at = endsAtDate.toISOString();

    // 6. Check conflicts
    const bufferTime = tenantSettings.buffer_time ?? 10;
    const bufferedStart = new Date(startsAtDate.getTime() - (bufferTime * 60 * 1000));
    const bufferedEnd = new Date(endsAtDate.getTime() + (bufferTime * 60 * 1000));

    const { data: conflictingBookings } = await supabase
      .from('bookings')
      .select('id, starts_at, ends_at')
      .eq('tenant_id', tenant_id).eq('staff_id', finalStaffId)
      .in('status', ['confirmed', 'pending', 'pending_payment', 'completed'])
      .or(`and(starts_at.lt.${bufferedEnd.toISOString()},ends_at.gt.${bufferedStart.toISOString()})`);

    if (conflictingBookings && conflictingBookings.length > 0) {
      return createErrorResponse(ErrorType.TIME_CONFLICT, 'Time slot not available', 409);
    }

    const { data: blocks } = await supabase
      .from('blocks').select('id')
      .eq('tenant_id', tenant_id)
      .or(`staff_id.eq.${finalStaffId},staff_id.is.null`)
      .or(`and(starts_at.lt.${ends_at},ends_at.gt.${starts_at})`);

    if (blocks && blocks.length > 0) {
      return createErrorResponse(ErrorType.TIME_CONFLICT, 'Time slot is blocked', 409);
    }

    // 7. Upsert customer
    let customer_id: string;
    const normalizedPhone = normalizePhone(customer_phone);

    const { data: allCustomers } = await supabase
      .from('customers').select('id, name, phone')
      .eq('tenant_id', tenant_id);

    const existingCustomer = allCustomers?.find(c => normalizePhone(c.phone) === normalizedPhone);

    if (existingCustomer) {
      customer_id = existingCustomer.id;
      const updates: Record<string, string> = {};
      if (customer_name.trim() && customer_name.trim() !== existingCustomer.name) updates.name = customer_name.trim();
      if (customer_email) updates.email = customer_email;
      if (customer_birthday) updates.birthday = customer_birthday;
      if (Object.keys(updates).length > 0) {
        await supabase.from('customers').update(updates).eq('id', customer_id);
      }
    } else {
      const { data: newCustomer, error: customerCreateError } = await supabase
        .from('customers')
        .insert({ tenant_id, name: customer_name.trim(), phone: normalizedPhone, email: customer_email || null, birthday: customer_birthday || null })
        .select('id').single();
      if (customerCreateError || !newCustomer) {
        return createErrorResponse(ErrorType.CUSTOMER_CREATE_FAILED, 'Failed to create customer', 500);
      }
      customer_id = newCustomer.id;
    }

    // 8. Determine booking status
    const isBenefitBooking = !!(customer_package_id || customer_subscription_id);
    const bookingStatus = isBenefitBooking ? 'confirmed' : (payment_method === 'online' ? 'pending_payment' : 'confirmed');

    // 9. Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        tenant_id, service_id, staff_id: finalStaffId, customer_id,
        starts_at, ends_at, status: bookingStatus, notes: notes || null,
        created_via: payload.created_via || 'public',
        customer_package_id: customer_package_id || null,
        customer_subscription_id: customer_subscription_id || null
      })
      .select(`*, service:services(name, price_cents, duration_minutes), staff:staff(name), customer:customers(name, phone, email)`)
      .single();

    if (bookingError || !booking) {
      return createErrorResponse(ErrorType.BOOKING_CREATE_FAILED, 'Failed to create booking', 500, { bookingError });
    }

    // 10. Handle package/subscription session decrement AFTER booking creation
    if (customer_package_id) {
      const result = await handlePackageSession(customer_package_id, service_id, booking.id);
      if (!result.valid) {
        console.error('Package session error (booking already created):', result.error);
      }
    } else if (customer_subscription_id) {
      const result = await handleSubscriptionSession(customer_subscription_id, service_id, booking.id);
      if (!result.valid) {
        console.error('Subscription session error (booking already created):', result.error);
      }
    }

    // 11. Send WhatsApp notification for confirmed bookings
    if (bookingStatus === 'confirmed') {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
          },
          body: JSON.stringify({ type: 'booking_confirmed', booking_id: booking.id, tenant_id }),
        });
      } catch (notifError) {
        console.error('WhatsApp notification error:', notifError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, booking, message: 'Agendamento criado com sucesso!' }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return createErrorResponse(ErrorType.BOOKING_CREATE_FAILED, 'Internal server error', 500, { error: error.message });
  }
});
