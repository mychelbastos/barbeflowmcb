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
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, date, service_id, staff_id }: GetSlotsRequest = await req.json();
    
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
    const bufferTime = settings.buffer_time !== undefined ? settings.buffer_time : 10; // minutes
    const slotDuration = settings.slot_duration || 15; // minutes

    // Parse target date and ensure it's not in the past
    const targetDate = new Date(date + 'T00:00:00');
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (targetDate < today) {
      return new Response(
        JSON.stringify({ available_slots: [] }),
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
        JSON.stringify({ available_slots: [] }),
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

    const availableSlots: any[] = [];
    const occupiedSlots: any[] = [];
    const allPossibleSlots: any[] = [];
    
    console.log(`Processing slots for ${availableStaff.length} staff members on ${date}`);

    // First, generate all possible time slots for all staff members
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
        console.log(`No schedule found for staff ${staff.id} on day ${dayOfWeek}`);
        continue;
      }

      for (const schedule of schedules) {
        // Convert schedule times to date objects for the target date
        const startTime = new Date(`${date}T${schedule.start_time}`);
        const endTime = new Date(`${date}T${schedule.end_time}`);

        // Generate all possible time slots within working hours
        const currentSlot = new Date(startTime);
        
        while (currentSlot.getTime() + (serviceDuration * 60 * 1000) <= endTime.getTime()) {
          const slotEnd = new Date(currentSlot.getTime() + (serviceDuration * 60 * 1000));
          
          // Skip if slot is in the past
          if (currentSlot <= now) {
            currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
            continue;
          }

          // Check if slot conflicts with break time
          let isInBreak = false;
          if (schedule.break_start && schedule.break_end) {
            const breakStart = new Date(`${date}T${schedule.break_start}`);
            const breakEnd = new Date(`${date}T${schedule.break_end}`);
            
            if (currentSlot < breakEnd && slotEnd > breakStart) {
              isInBreak = true;
            }
          }

          if (!isInBreak) {
            // Convert to UTC for consistent storage and comparison
            const slotStartUTC = new Date(currentSlot.getTime());
            const slotEndUTC = new Date(slotEnd.getTime());
            const timeString = currentSlot.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            
            // Add to all possible slots if not already added
            const existingSlot = allPossibleSlots.find(slot => slot.time === timeString);
            if (!existingSlot) {
              allPossibleSlots.push({
                staff_id: staff.id,
                staff_name: staff.name,
                starts_at: slotStartUTC.toISOString(),
                ends_at: slotEndUTC.toISOString(),
                time: timeString
              });
            }
          }

          currentSlot.setMinutes(currentSlot.getMinutes() + slotDuration);
        }
      }
    }

    // Now check availability for each possible slot
    for (const slot of allPossibleSlots) {
      const slotStart = new Date(slot.starts_at);
      const slotEnd = new Date(slot.ends_at);
      let isAvailable = true;
      let conflictReason = '';

      // Get existing bookings for this staff that could conflict with slots on this date
      // We need to check bookings that start before end of day and end after start of day
      const dayStart = `${date}T00:00:00.000Z`;
      const dayEnd = `${date}T23:59:59.999Z`;
      
      const { data: bookings, error: bookingsError } = await supabase
        .from('bookings')
        .select('starts_at, ends_at, service:services(name), customer:customers(name)')
        .eq('tenant_id', tenant_id)
        .eq('staff_id', slot.staff_id)
        // Get bookings that overlap with this day (start before day ends AND end after day starts)
        .lte('starts_at', dayEnd)
        .gte('ends_at', dayStart)
        .in('status', ['confirmed', 'pending', 'completed']);
      
      console.log(`Checking bookings for staff ${slot.staff_id} on ${date}:`, bookings);

      if (!bookingsError && bookings) {
        // Check conflicts with existing bookings (with buffer)
        for (const booking of bookings) {
          const bookingStart = new Date(booking.starts_at);
          const bookingEnd = new Date(booking.ends_at);
          
          console.log(`Checking conflict: slot ${slotStart.toISOString()} - ${slotEnd.toISOString()} vs booking ${bookingStart.toISOString()} - ${bookingEnd.toISOString()}`);
          
          // Add buffer time
          const bufferedStart = new Date(bookingStart.getTime() - (bufferTime * 60 * 1000));
          const bufferedEnd = new Date(bookingEnd.getTime() + (bufferTime * 60 * 1000));
          
          console.log(`With buffer: slot vs booking with buffer ${bufferedStart.toISOString()} - ${bufferedEnd.toISOString()}`);
          
          if (slotStart < bufferedEnd && slotEnd > bufferedStart) {
            isAvailable = false;
            conflictReason = `Agendado para ${booking.customer?.name || 'Cliente'} - ${booking.service?.name || 'Serviço'}`;
            console.log(`CONFLICT DETECTED: ${conflictReason}`);
            break;
          }
        }
      }

        // Check conflicts with blocks if still available
        if (isAvailable) {
          const dayStart = `${date}T00:00:00.000Z`;
          const dayEnd = `${date}T23:59:59.999Z`;
          
          const { data: blocks, error: blocksError } = await supabase
            .from('blocks')
            .select('starts_at, ends_at, reason')
            .eq('tenant_id', tenant_id)
            .or(`staff_id.eq.${slot.staff_id},staff_id.is.null`)
            // Get blocks that overlap with this day
            .lte('starts_at', dayEnd)
            .gte('ends_at', dayStart);

        console.log(`Checking blocks for staff ${slot.staff_id} on ${date}:`, blocks);

        if (!blocksError && blocks) {
          for (const block of blocks) {
            const blockStart = new Date(block.starts_at);
            const blockEnd = new Date(block.ends_at);
            
            console.log(`Checking block conflict: slot ${slotStart.toISOString()} - ${slotEnd.toISOString()} vs block ${blockStart.toISOString()} - ${blockEnd.toISOString()}`);
            
            if (slotStart < blockEnd && slotEnd > blockStart) {
              isAvailable = false;
              conflictReason = block.reason || 'Horário bloqueado';
              console.log(`BLOCK CONFLICT DETECTED: ${conflictReason}`);
              break;
            }
          }
        }
      }

      if (isAvailable) {
        availableSlots.push(slot);
      } else {
        occupiedSlots.push({
          ...slot,
          available: false,
          reason: conflictReason
        });
      }
    }

    // Sort slots by time
    availableSlots.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
    occupiedSlots.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());

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

function parseTime(timeString: string): number {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}