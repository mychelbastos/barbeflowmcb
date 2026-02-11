import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Use service role key to bypass RLS and see all bookings
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface GetSlotsRequest {
  tenant_id: string;
  date: string; // YYYY-MM-DD format
  service_id?: string;
  staff_id?: string;
  allow_past?: boolean; // Admin override to allow past time slots
}

// Timezone offset map (in hours, negative = behind UTC)
const timezoneOffsets: Record<string, number> = {
  'America/Sao_Paulo': -3,
  'America/Bahia': -3,
  'America/Fortaleza': -3,
  'America/Recife': -3,
  'America/Manaus': -4,
  'America/Cuiaba': -4,
  'America/Porto_Velho': -4,
  'America/Boa_Vista': -4,
  'America/Rio_Branco': -5,
  'UTC': 0,
};

function getTimezoneOffset(timezone: string): number {
  return timezoneOffsets[timezone] ?? -3; // Default to Bahia timezone
}

// Convert local time string (HH:MM) + date to UTC Date object
function localTimeToUTC(date: string, time: string, timezoneOffset: number): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const localDate = new Date(`${date}T${time}:00`);
  // Add the offset (negative offset means we ADD hours to get UTC)
  const utcTime = localDate.getTime() - (timezoneOffset * 60 * 60 * 1000);
  return new Date(utcTime);
}

// Convert UTC Date to local time string (HH:MM)
function utcToLocalTime(utcDate: Date, timezoneOffset: number): string {
  // Subtract the offset (negative offset means we SUBTRACT hours to get local)
  const localTime = new Date(utcDate.getTime() + (timezoneOffset * 60 * 60 * 1000));
  return localTime.toTimeString().slice(0, 5);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, date, service_id, staff_id, allow_past }: GetSlotsRequest = await req.json();
    
    console.log('Get available slots request:', { tenant_id, date, service_id, staff_id });

    // Validate required fields
    if (!tenant_id || !date) {
      return new Response(
        JSON.stringify({ error: 'tenant_id and date are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant settings (including timezone and buffer)
    const { data: tenant, error: tenantError } = await supabase
      .from('tenants')
      .select('settings')
      .eq('id', tenant_id)
      .single();

    if (tenantError || !tenant) {
      console.error('Tenant not found:', tenantError);
      return new Response(
        JSON.stringify({ error: 'Tenant not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = tenant.settings || {};
    const timezone = settings.timezone || 'America/Bahia';
    const timezoneOffset = getTimezoneOffset(timezone);
    const bufferTime = settings.buffer_time !== undefined ? settings.buffer_time : 10; // minutes
    const slotDuration = settings.slot_duration || 15; // minutes

    console.log(`Timezone: ${timezone}, Offset: ${timezoneOffset}, Buffer: ${bufferTime}min, SlotDuration: ${slotDuration}min`);

    // Parse target date and ensure it's not in the past (in local timezone)
    const targetDate = new Date(date + 'T00:00:00');
    const nowUTC = new Date();
    const nowLocal = new Date(nowUTC.getTime() + (timezoneOffset * 60 * 60 * 1000));
    const todayLocal = new Date(nowLocal.getFullYear(), nowLocal.getMonth(), nowLocal.getDate());
    
    if (targetDate < todayLocal) {
      return new Response(
        JSON.stringify({ available_slots: [], occupied_slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get day of week (0 = Sunday, 1 = Monday, etc.)
    const dayOfWeek = targetDate.getDay();

    // Build staff filter
    let staffQuery = supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_id', tenant_id)
      .eq('active', true);

    if (staff_id) {
      staffQuery = staffQuery.eq('id', staff_id);
    }

    const { data: availableStaff, error: staffError } = await staffQuery;

    if (staffError) {
      console.error('Error fetching staff:', staffError);
      return new Response(
        JSON.stringify({ error: 'Error fetching staff' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!availableStaff?.length) {
      return new Response(
        JSON.stringify({ available_slots: [], occupied_slots: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get service duration if service_id is provided
    let serviceDuration = slotDuration;
    if (service_id) {
      const { data: service, error: serviceError } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', service_id)
        .eq('tenant_id', tenant_id)
        .eq('active', true)
        .single();

      if (serviceError) {
        console.error('Error fetching service:', serviceError);
        return new Response(
          JSON.stringify({ error: 'Service not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      serviceDuration = service.duration_minutes;
    }

    // Get all bookings for the day (in UTC range that covers the local day)
    // Local day starts at 00:00 local = 00:00 + offset UTC
    // Local day ends at 23:59 local = 23:59 + offset UTC
    const dayStartUTC = localTimeToUTC(date, '00:00', timezoneOffset);
    const dayEndUTC = localTimeToUTC(date, '23:59', timezoneOffset);

    console.log(`Day range in UTC: ${dayStartUTC.toISOString()} to ${dayEndUTC.toISOString()}`);

    // Get all bookings for the relevant staff on this day
    const staffIds = availableStaff.map(s => s.id);
    
    const { data: allBookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, staff_id, starts_at, ends_at, service:services(name), customer:customers(name)')
      .eq('tenant_id', tenant_id)
      .in('staff_id', staffIds)
      .lte('starts_at', dayEndUTC.toISOString())
      .gte('ends_at', dayStartUTC.toISOString())
      .in('status', ['confirmed', 'pending', 'pending_payment', 'completed']);

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
    }

    console.log(`Found ${allBookings?.length || 0} bookings for the day`);
    allBookings?.forEach(b => {
      const localStart = utcToLocalTime(new Date(b.starts_at), timezoneOffset);
      const localEnd = utcToLocalTime(new Date(b.ends_at), timezoneOffset);
      console.log(`Booking: ${b.customer?.name} - ${localStart} to ${localEnd} (UTC: ${b.starts_at} to ${b.ends_at})`);
    });

    // Get all blocks for the day
    const { data: allBlocks, error: blocksError } = await supabase
      .from('blocks')
      .select('id, staff_id, starts_at, ends_at, reason')
      .eq('tenant_id', tenant_id)
      .lte('starts_at', dayEndUTC.toISOString())
      .gte('ends_at', dayStartUTC.toISOString());

    if (blocksError) {
      console.error('Error fetching blocks:', blocksError);
    }

    console.log(`Found ${allBlocks?.length || 0} blocks for the day`);

    // Get recurring clients for this weekday (include service for duration)
    const { data: recurringClients, error: recurringError } = await supabase
      .from('recurring_clients')
      .select('id, staff_id, client_name, start_time, duration_minutes, start_date, service_id, service:services(duration_minutes)')
      .eq('tenant_id', tenant_id)
      .eq('weekday', dayOfWeek)
      .eq('active', true)
      .lte('start_date', date);

    if (recurringError) {
      console.error('Error fetching recurring clients:', recurringError);
    }

    console.log(`Found ${recurringClients?.length || 0} recurring clients for weekday ${dayOfWeek}`);

    const availableSlots: any[] = [];
    const occupiedSlots: any[] = [];
    const processedTimes = new Set<string>();
    
    console.log(`Processing slots for ${availableStaff.length} staff members on ${date}`);

    // Process each staff member
    for (const staff of availableStaff) {
      // Get staff schedule for the day
      const { data: schedules, error: scheduleError } = await supabase
        .from('schedules')
        .select('*')
        .eq('tenant_id', tenant_id)
        .eq('staff_id', staff.id)
        .eq('weekday', dayOfWeek)
        .eq('active', true);

      if (scheduleError || !schedules?.length) {
        console.log(`No schedule found for staff ${staff.name} on day ${dayOfWeek}`);
        continue;
      }

      // Get bookings for this staff
      const staffBookings = allBookings?.filter(b => b.staff_id === staff.id) || [];
      const staffBlocks = allBlocks?.filter(b => b.staff_id === staff.id || b.staff_id === null) || [];
      const staffRecurring = recurringClients?.filter(r => r.staff_id === staff.id) || [];

      for (const schedule of schedules) {
        // Schedule times are in local timezone
        const scheduleStartLocal = schedule.start_time; // e.g., "07:00"
        const scheduleEndLocal = schedule.end_time; // e.g., "19:00"

        // Parse schedule times
        const [startHour, startMin] = scheduleStartLocal.split(':').map(Number);
        const [endHour, endMin] = scheduleEndLocal.split(':').map(Number);

        // Generate slots in local time
        let currentHour = startHour;
        let currentMin = startMin;

        while (currentHour * 60 + currentMin + serviceDuration <= endHour * 60 + endMin) {
          const timeString = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
          
          // Skip if we already processed this time slot
          if (processedTimes.has(timeString)) {
            currentMin += slotDuration;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
            continue;
          }

          // Calculate slot times in UTC
          const slotStartUTC = localTimeToUTC(date, timeString, timezoneOffset);
          const slotEndUTC = new Date(slotStartUTC.getTime() + (serviceDuration * 60 * 1000));

          // Skip if slot is in the past (unless admin override)
          if (!allow_past && slotStartUTC <= nowUTC) {
            currentMin += slotDuration;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
            continue;
          }

          // Check if slot conflicts with break time
          let isInBreak = false;
          if (schedule.break_start && schedule.break_end) {
            const [breakStartHour, breakStartMin] = schedule.break_start.split(':').map(Number);
            const [breakEndHour, breakEndMin] = schedule.break_end.split(':').map(Number);
            const breakStartMins = breakStartHour * 60 + breakStartMin;
            const breakEndMins = breakEndHour * 60 + breakEndMin;
            const slotStartMins = currentHour * 60 + currentMin;
            const slotEndMins = slotStartMins + serviceDuration;

            if (slotStartMins < breakEndMins && slotEndMins > breakStartMins) {
              isInBreak = true;
            }
          }

          if (isInBreak) {
            currentMin += slotDuration;
            if (currentMin >= 60) {
              currentHour += Math.floor(currentMin / 60);
              currentMin = currentMin % 60;
            }
            continue;
          }

          // Check conflicts with existing bookings
          let isAvailable = true;
          let conflictReason = '';

          for (const booking of staffBookings) {
            const bookingStartUTC = new Date(booking.starts_at);
            const bookingEndUTC = new Date(booking.ends_at);
            
            // The new slot cannot:
            // 1. Start before the existing booking ends + buffer
            // 2. End after the existing booking starts - buffer
            // In other words: [slotStart, slotEnd] must not overlap with [bookingStart - buffer, bookingEnd + buffer]
            // But actually we need to think about it differently:
            // - A new slot ending at slotEndUTC must end at least bufferTime before bookingStartUTC
            // - A new slot starting at slotStartUTC must start at least bufferTime after bookingEndUTC
            // So: conflict if NOT (slotEndUTC + buffer <= bookingStartUTC OR slotStartUTC >= bookingEndUTC + buffer)
            // Simplified: conflict if slotEndUTC > bookingStartUTC - buffer AND slotStartUTC < bookingEndUTC + buffer
            
            const bookingStartWithBuffer = new Date(bookingStartUTC.getTime() - (bufferTime * 60 * 1000));
            const bookingEndWithBuffer = new Date(bookingEndUTC.getTime() + (bufferTime * 60 * 1000));
            
            // Check if this new slot overlaps with the buffered booking period
            if (slotStartUTC < bookingEndWithBuffer && slotEndUTC > bookingStartWithBuffer) {
              isAvailable = false;
              const bookingLocalTime = utcToLocalTime(bookingStartUTC, timezoneOffset);
              conflictReason = `Agendado para ${booking.customer?.name || 'Cliente'} às ${bookingLocalTime}`;
              console.log(`CONFLICT: Slot ${timeString} conflicts with booking at ${bookingLocalTime} (${booking.customer?.name})`);
              break;
            }
          }

          // Check conflicts with blocks if still available
          if (isAvailable) {
            for (const block of staffBlocks) {
              const blockStartUTC = new Date(block.starts_at);
              const blockEndUTC = new Date(block.ends_at);
              
              if (slotStartUTC < blockEndUTC && slotEndUTC > blockStartUTC) {
                isAvailable = false;
                conflictReason = block.reason || 'Horário bloqueado';
                console.log(`BLOCK CONFLICT: Slot ${timeString} conflicts with block`);
                break;
              }
            }
          }

          // Check conflicts with recurring clients if still available
          if (isAvailable) {
            const slotStartMins = currentHour * 60 + currentMin;
            const slotEndMins = slotStartMins + serviceDuration;
            
            for (const recurring of staffRecurring) {
              const [recHour, recMin] = recurring.start_time.split(':').map(Number);
              const recStartMins = recHour * 60 + recMin;
              const recDuration = recurring.service?.duration_minutes || recurring.duration_minutes;
              const recEndMins = recStartMins + recDuration;
              
              // Check overlap (with buffer)
              const recStartWithBuffer = recStartMins - bufferTime;
              const recEndWithBuffer = recEndMins + bufferTime;
              
              if (slotStartMins < recEndWithBuffer && slotEndMins > recStartWithBuffer) {
                isAvailable = false;
                conflictReason = 'Horário reservado';
                console.log(`RECURRING CONFLICT: Slot ${timeString} conflicts with recurring client ${recurring.client_name}`);
                break;
              }
            }
          }

          // Add slot to appropriate list
          const slotData = {
            staff_id: staff.id,
            staff_name: staff.name,
            starts_at: slotStartUTC.toISOString(),
            ends_at: slotEndUTC.toISOString(),
            time: timeString
          };

          if (isAvailable) {
            // Only add if not already in available slots
            if (!availableSlots.find(s => s.time === timeString)) {
              availableSlots.push(slotData);
            }
          } else {
            // Only add if not already in occupied slots
            if (!occupiedSlots.find(s => s.time === timeString)) {
              occupiedSlots.push({
                ...slotData,
                available: false,
                reason: conflictReason
              });
            }
          }

          processedTimes.add(timeString);

          // Move to next slot
          currentMin += slotDuration;
          if (currentMin >= 60) {
            currentHour += Math.floor(currentMin / 60);
            currentMin = currentMin % 60;
          }
        }
      }
    }

    // Sort slots by time
    availableSlots.sort((a, b) => a.time.localeCompare(b.time));
    occupiedSlots.sort((a, b) => a.time.localeCompare(b.time));

    console.log(`Generated ${availableSlots.length} available slots and ${occupiedSlots.length} occupied slots for ${date}`);
    console.log('Available slots:', availableSlots.map(s => s.time));
    console.log('Occupied slots:', occupiedSlots.map(s => `${s.time} (${s.reason})`));

    return new Response(
      JSON.stringify({ 
        available_slots: availableSlots,
        occupied_slots: occupiedSlots,
        total_slots: availableSlots.length + occupiedSlots.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-available-slots:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
