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
  // 1. Validate subscription — allow active, authorized, and past_due (within grace)
  const { data: sub, error: subErr } = await supabase
    .from('customer_subscriptions')
    .select('id, status, plan_id, started_at, current_period_start, current_period_end, tenant_id, failed_at')
    .eq('id', customerSubscriptionId)
    .in('status', ['active', 'authorized', 'past_due'])
    .single();

  if (subErr || !sub) {
    console.error('Subscription not found or invalid:', subErr);
    return { valid: false, error: 'Subscription not active' };
  }

  // If past_due, check grace period
  if (sub.status === 'past_due') {
    const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', sub.tenant_id).single();
    const graceHours = (tenant?.settings as any)?.subscription_grace_hours ?? 48;
    const failedAt = sub.failed_at ? new Date(sub.failed_at) : null;
    if (!failedAt || (Date.now() - failedAt.getTime()) > graceHours * 3600000) {
      return { valid: false, error: 'Subscription grace period expired' };
    }
    console.log(`Subscription ${sub.id} is past_due but within grace period`);
  }

  // 2. Validate 30-day rolling period
  const now = new Date();
  const startDate = sub.current_period_start ? new Date(sub.current_period_start) : (sub.started_at ? new Date(sub.started_at) : null);
  if (!startDate) {
    return { valid: false, error: 'Subscription has no start date' };
  }
  const endDate = sub.current_period_end ? new Date(sub.current_period_end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
  if (now > endDate) {
    return { valid: false, error: 'Subscription period expired' };
  }

  // 3. Check plan service config
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

  // 4. Find or create usage record for current period (tracking only, no limits enforced for subscriptions)
  const periodStartStr = startDate.toISOString().split('T')[0];
  const periodEndStr = endDate.toISOString().split('T')[0];
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
        sessions_limit: null, // unlimited for subscriptions
      })
      .select()
      .single();
    usage = newUsage;
  }

  if (!usage) {
    return { valid: false, error: 'Failed to create usage record' };
  }

  // 5. Increment usage (tracking only — subscriptions have unlimited sessions)
  const newBookingIds = [...(usage.booking_ids || []), bookingId];
  await supabase
    .from('subscription_usage')
    .update({
      sessions_used: usage.sessions_used + 1,
      booking_ids: newBookingIds,
    })
    .eq('id', usage.id);

  console.log(`Subscription session tracked: ${usage.sessions_used + 1} (unlimited)`);
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
      // Allow active, authorized, and past_due (grace check happens in handleSubscriptionSession)
      const { data: sub } = await supabase
        .from('customer_subscriptions')
        .select('id, status, plan_id, tenant_id, failed_at')
        .eq('id', customer_subscription_id)
        .in('status', ['active', 'authorized', 'past_due'])
        .single();
      if (!sub) {
        return createErrorResponse(ErrorType.SUBSCRIPTION_INVALID, 'Subscription not active', 400);
      }
      // If past_due, verify grace period
      if (sub.status === 'past_due') {
        const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', sub.tenant_id).single();
        const graceHours = (tenant?.settings as any)?.subscription_grace_hours ?? 48;
        const failedAt = sub.failed_at ? new Date(sub.failed_at) : null;
        if (!failedAt || (Date.now() - failedAt.getTime()) > graceHours * 3600000) {
          return createErrorResponse(ErrorType.SUBSCRIPTION_INVALID, 'Subscription grace period expired', 400);
        }
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

    // 6. Find or create customer
    const normalizedPhone = normalizePhone(customer_phone);
    let { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('tenant_id', tenant_id)
      .eq('phone', normalizedPhone)
      .maybeSingle();

    let customerId: string;
    if (existingCustomer) {
      customerId = existingCustomer.id;
      // Update name/email if provided
      const updateData: Record<string, any> = { name: customer_name };
      if (customer_email) updateData.email = customer_email;
      if (customer_birthday) updateData.birthday = customer_birthday;
      await supabase.from('customers').update(updateData).eq('id', customerId);
    } else {
      const insertData: Record<string, any> = {
        tenant_id,
        name: customer_name,
        phone: normalizedPhone,
      };
      if (customer_email) insertData.email = customer_email;
      if (customer_birthday) insertData.birthday = customer_birthday;
      const { data: newCustomer, error: custError } = await supabase
        .from('customers')
        .insert(insertData)
        .select('id')
        .single();
      if (custError || !newCustomer) {
        return createErrorResponse(ErrorType.CUSTOMER_CREATE_FAILED, 'Failed to create customer', 500, { custError });
      }
      customerId = newCustomer.id;
    }

    // 7. Auto-detect benefits if not explicitly provided
    let resolvedPackageId = customer_package_id || null;
    let resolvedSubscriptionId = customer_subscription_id || null;
    let benefitSource: 'subscription' | 'package' | null = null;

    if (!resolvedPackageId && !resolvedSubscriptionId) {
      // Priority 1: Check active/past_due subscription covering this service
      const { data: activeSubs } = await supabase
        .from('customer_subscriptions')
        .select('id, status, plan_id, started_at, current_period_start, current_period_end, tenant_id, failed_at')
        .eq('customer_id', customerId)
        .eq('tenant_id', tenant_id)
        .in('status', ['active', 'authorized', 'past_due']);

      if (activeSubs && activeSubs.length > 0) {
        const now = new Date();
        for (const sub of activeSubs) {
          // If past_due, check grace period
          if (sub.status === 'past_due') {
            const graceHours = (tenantSettings as any)?.subscription_grace_hours ?? 48;
            const failedAt = sub.failed_at ? new Date(sub.failed_at) : null;
            if (!failedAt || (Date.now() - failedAt.getTime()) > graceHours * 3600000) continue;
          }

          // Validate 30-day rolling validity
          const startDate = sub.current_period_start ? new Date(sub.current_period_start) : (sub.started_at ? new Date(sub.started_at) : null);
          if (!startDate) continue;
          const endDate = sub.current_period_end ? new Date(sub.current_period_end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
          if (now > endDate) continue; // expired

          // Check if subscription plan covers this service
          const { data: planSvc } = await supabase
            .from('subscription_plan_services')
            .select('sessions_per_cycle')
            .eq('plan_id', sub.plan_id)
            .eq('service_id', service_id)
            .maybeSingle();

          if (planSvc) {
            resolvedSubscriptionId = sub.id;
            benefitSource = 'subscription';
            console.log(`Auto-detected active subscription ${sub.id} for service ${service_id}`);
            break;
          }
        }
      }

      // Priority 2: Check active package with remaining sessions for this service
      if (!resolvedSubscriptionId) {
        const { data: activePackages } = await supabase
          .from('customer_packages')
          .select('id, status, payment_status')
          .eq('customer_id', customerId)
          .eq('tenant_id', tenant_id)
          .eq('status', 'active')
          .eq('payment_status', 'confirmed');

        if (activePackages && activePackages.length > 0) {
          for (const pkg of activePackages) {
            const { data: pkgSvc } = await supabase
              .from('customer_package_services')
              .select('sessions_used, sessions_total')
              .eq('customer_package_id', pkg.id)
              .eq('service_id', service_id)
              .maybeSingle();

            if (pkgSvc && pkgSvc.sessions_used < pkgSvc.sessions_total) {
              resolvedPackageId = pkg.id;
              benefitSource = 'package';
              console.log(`Auto-detected active package ${pkg.id} for service ${service_id} (${pkgSvc.sessions_total - pkgSvc.sessions_used} remaining)`);
              break;
            }
          }
        }
      }
    } else {
      benefitSource = resolvedSubscriptionId ? 'subscription' : (resolvedPackageId ? 'package' : null);
    }

    // 8. Atomic booking creation with advisory lock (prevents race conditions / double-bookings)
    const bufferTime = tenantSettings.buffer_time ?? 10;
    const isBenefitBooking = !!(resolvedPackageId || resolvedSubscriptionId);
    const bookingStatus = isBenefitBooking ? 'confirmed' : (payment_method === 'online' ? 'pending_payment' : 'confirmed');

    const { data: atomicResult, error: atomicError } = await supabase.rpc('create_booking_if_available', {
      p_tenant_id: tenant_id,
      p_service_id: service_id,
      p_staff_id: finalStaffId,
      p_customer_id: customerId,
      p_starts_at: starts_at,
      p_ends_at: ends_at,
      p_status: bookingStatus,
      p_notes: notes || null,
      p_created_via: payload.created_via || 'public',
      p_customer_package_id: resolvedPackageId,
      p_customer_subscription_id: resolvedSubscriptionId,
      p_buffer_minutes: bufferTime,
    });

    if (atomicError) {
      const errMsg = atomicError.message || '';
      if (errMsg.includes('TIME_CONFLICT') || errMsg.includes('BLOCK_CONFLICT')) {
        return createErrorResponse(ErrorType.TIME_CONFLICT, 'Time slot not available', 409);
      }
      return createErrorResponse(ErrorType.BOOKING_CREATE_FAILED, 'Failed to create booking', 500, { atomicError });
    }

    const bookingId = atomicResult as string;

    // Fetch the full booking data for response and notifications
    const { data: booking, error: bookingFetchError } = await supabase
      .from('bookings')
      .select(`*, service:services(name, price_cents, duration_minutes), staff:staff(name), customer:customers(name, phone, email)`)
      .eq('id', bookingId)
      .single();

    if (bookingFetchError || !booking) {
      return createErrorResponse(ErrorType.BOOKING_CREATE_FAILED, 'Booking created but failed to fetch details', 500, { bookingFetchError });
    }

    // 10. Handle package/subscription session decrement AFTER booking creation
    if (resolvedPackageId) {
      const result = await handlePackageSession(resolvedPackageId, service_id, booking.id);
      if (!result.valid) {
        console.error('Package session error (booking already created):', result.error);
      }
    } else if (resolvedSubscriptionId) {
      const result = await handleSubscriptionSession(resolvedSubscriptionId, service_id, booking.id);
      if (!result.valid) {
        console.error('Subscription session error (booking already created):', result.error);
      }
    }

    // 11. Send WhatsApp notification for confirmed bookings (skip recurring — they get weekly summaries)
    const createdVia = payload.created_via || 'public';
    if (bookingStatus === 'confirmed' && createdVia !== 'recurring') {
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
      JSON.stringify({
        success: true,
        booking,
        benefit_source: benefitSource,
        message: benefitSource
          ? `Agendamento criado com sucesso! Utilizado via ${benefitSource === 'subscription' ? 'assinatura' : 'pacote'}.`
          : 'Agendamento criado com sucesso!',
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return createErrorResponse(ErrorType.BOOKING_CREATE_FAILED, 'Internal server error', 500, { error: error.message });
  }
});
