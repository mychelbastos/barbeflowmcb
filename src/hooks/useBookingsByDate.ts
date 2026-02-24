import { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";
import { format } from "date-fns";

const TZ = "America/Bahia";

export interface StaffMember {
  id: string;
  name: string;
  photo_url: string | null;
  color: string | null;
  active: boolean;
}

export interface Schedule {
  id: string;
  staff_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  active: boolean;
}

export interface BookingData {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  staff_id: string | null;
  customer_id: string;
  service_id: string;
  customer_package_id: string | null;
  customer_subscription_id: string | null;
  service: { name: string; color: string | null; duration_minutes: number; price_cents: number } | null;
  staff: { name: string; color: string | null } | null;
  customer: { name: string; phone: string } | null;
}

export interface BlockData {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  staff_id: string | null;
}

export interface TenantSettings {
  slot_duration: number;
  buffer_time: number;
  timezone: string;
}

export interface RecurringSlot {
  id: string;
  customer_id: string;
  staff_id: string;
  service_id: string | null;
  start_time: string;
  duration_minutes: number;
  frequency: string;
  start_date: string;
  customer: { name: string; phone: string } | null;
  service: { name: string; color: string | null; duration_minutes: number; price_cents: number } | null;
  notes: string | null;
}

/** Map frequency string to week interval */
function frequencyToWeekInterval(frequency: string): number {
  switch (frequency) {
    case 'weekly': return 1;
    case 'biweekly': return 2;
    case 'triweekly': return 3;
    case 'monthly': return 4;
    default: return 1;
  }
}

/** Check if a recurring slot should appear on a given date based on its frequency */
function isRecurringSlotActiveOnDate(rc: RecurringSlot, dateStr: string): boolean {
  const interval = frequencyToWeekInterval(rc.frequency);
  if (interval === 1) return true;

  const slotStart = new Date(rc.start_date + 'T00:00:00');
  const targetDate = new Date(dateStr + 'T00:00:00');
  const diffMs = targetDate.getTime() - slotStart.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);

  return diffWeeks % interval === 0;
}

export function useBookingsByDate(tenantId: string | undefined, date: Date) {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [bookings, setBookings] = useState<BookingData[]>([]);
  const [allDayBookings, setAllDayBookings] = useState<{ staff_id: string | null; customer_id: string; starts_at: string; status: string }[]>([]);
  const [blocks, setBlocks] = useState<BlockData[]>([]);
  const [settings, setSettings] = useState<TenantSettings>({ slot_duration: 15, buffer_time: 10, timezone: TZ });
  const [loading, setLoading] = useState(true);
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([]);

  const dateStr = format(date, "yyyy-MM-dd");
  const weekday = date.getDay();

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);

    try {
      const dayStart = `${dateStr}T00:00:00-03:00`;
      const dayEnd = `${dateStr}T23:59:59-03:00`;

      const [staffRes, schedulesRes, bookingsRes, allBookingsRes, blocksRes, tenantRes, recurringRes] = await Promise.all([
        supabase
          .from("staff")
          .select("id, name, photo_url, color, active")
          .eq("tenant_id", tenantId)
          .eq("active", true)
          .order("name"),
        supabase
          .from("schedules")
          .select("*")
          .eq("tenant_id", tenantId)
          .eq("weekday", weekday)
          .eq("active", true),
        supabase
          .from("bookings")
          .select("*, service:services(name, color, duration_minutes, price_cents), staff:staff(name, color), customer:customers(name, phone)")
          .eq("tenant_id", tenantId)
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd)
          .neq("status", "cancelled"),
        // Fetch ALL bookings (including cancelled) to check if a recurring slot was already materialized
        supabase
          .from("bookings")
          .select("id, staff_id, customer_id, starts_at, status")
          .eq("tenant_id", tenantId)
          .gte("starts_at", dayStart)
          .lte("starts_at", dayEnd),
        supabase
          .from("blocks")
          .select("*")
          .eq("tenant_id", tenantId)
          .gte("starts_at", dayStart)
          .lte("ends_at", dayEnd),
        supabase
          .from("tenants")
          .select("settings")
          .eq("id", tenantId)
          .single(),
        supabase
          .from("recurring_clients")
          .select("*, customer:customers(name, phone), service:services(name, color, duration_minutes, price_cents)")
          .eq("tenant_id", tenantId)
          .eq("weekday", weekday)
          .eq("active", true)
          .lte("start_date", dateStr),
      ]);

      setStaff(staffRes.data || []);
      setSchedules(schedulesRes.data || []);
      setBookings((bookingsRes.data as any) || []);
      setAllDayBookings((allBookingsRes.data as any) || []);
      setBlocks(blocksRes.data || []);
      setRecurringSlots((recurringRes.data as any) || []);

      if (tenantRes.data?.settings) {
        const s = tenantRes.data.settings as any;
        setSettings({
          slot_duration: s.slot_duration ?? 15,
          buffer_time: s.buffer_time ?? 10,
          timezone: s.timezone ?? TZ,
        });
      }
    } catch (err) {
      console.error("Error fetching schedule data:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateStr, weekday]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Realtime subscription
  useEffect(() => {
    if (!tenantId) return;

    const channel = supabase
      .channel(`schedule-${tenantId}-${dateStr}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings", filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .on("postgres_changes", { event: "*", schema: "public", table: "blocks", filter: `tenant_id=eq.${tenantId}` }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, dateStr, fetchData]);

  // Compute time range from schedules
  const timeRange = useMemo(() => {
    if (schedules.length === 0) return { startHour: 8, endHour: 20 };

    let earliest = 24;
    let latest = 0;

    schedules.forEach((s) => {
      const startH = parseInt(s.start_time.split(":")[0], 10);
      const endH = parseInt(s.end_time.split(":")[0], 10);
      const endM = parseInt(s.end_time.split(":")[1], 10);
      if (startH < earliest) earliest = startH;
      const endVal = endM > 0 ? endH + 1 : endH;
      if (endVal > latest) latest = endVal;
    });

    return { startHour: earliest, endHour: latest };
  }, [schedules]);

  // Build recurring customer IDs set from recurring slots
  const recurringCustomerIds = useMemo(() => {
    return new Set(recurringSlots.map((r) => r.customer_id));
  }, [recurringSlots]);

  // Merge recurring slots as virtual bookings (only if no real booking exists at that slot for that staff)
  const mergedBookings = useMemo(() => {
    const real = [...bookings];

    for (const rc of recurringSlots) {
      // Skip if this slot shouldn't appear on this date based on frequency
      if (!isRecurringSlotActiveOnDate(rc, dateStr)) continue;

      // Build the starts_at/ends_at for this recurring slot on this date
      // Use explicit Date construction to avoid string parsing ambiguity across browsers
      const timeStr = rc.start_time.slice(0, 5); // "HH:MM"
      const tz = settings.timezone || TZ;
      // Pass an ISO string WITHOUT timezone suffix so fromZonedTime interprets it as local time in `tz`
      const startsAt = fromZonedTime(`${dateStr}T${timeStr}:00`, tz);
      const endsAt = new Date(startsAt.getTime() + rc.duration_minutes * 60 * 1000);

      // Use a tolerance window based on service duration to catch bookings
      // created at slightly different times than the recurring slot
      const toleranceMs = Math.max(rc.duration_minutes, 60) * 60 * 1000;
      const alreadyExists = allDayBookings.some((b) => {
        return b.staff_id === rc.staff_id &&
          b.customer_id === rc.customer_id &&
          Math.abs(new Date(b.starts_at).getTime() - startsAt.getTime()) < toleranceMs;
      });

      if (alreadyExists) continue;

      // Create a virtual booking
      const virtualBooking: BookingData = {
        id: `recurring-${rc.id}`,
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        status: "confirmed",
        notes: rc.notes,
        staff_id: rc.staff_id,
        customer_id: rc.customer_id,
        service_id: rc.service_id || "",
        customer_package_id: null,
        customer_subscription_id: null,
        service: rc.service || { name: "Horário Fixo", color: null, duration_minutes: rc.duration_minutes, price_cents: 0 },
        staff: null,
        customer: rc.customer,
      };

      real.push(virtualBooking);
    }

    return real;
  }, [bookings, recurringSlots, dateStr, allDayBookings, settings]);

  return {
    staff,
    schedules,
    bookings: mergedBookings,
    blocks,
    settings,
    timeRange,
    loading,
    refetch: fetchData,
    recurringCustomerIds,
  };
}
