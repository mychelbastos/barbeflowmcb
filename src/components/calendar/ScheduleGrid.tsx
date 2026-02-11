import { useState, useMemo } from "react";
import { format, parseISO, isToday } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import type { StaffMember, Schedule, BookingData, BlockData, TenantSettings } from "@/hooks/useBookingsByDate";
import { useBookingModal } from "@/hooks/useBookingModal";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BookingCard } from "./BookingCard";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const TZ = "America/Bahia";

interface ScheduleGridProps {
  staff: StaffMember[];
  schedules: Schedule[];
  bookings: BookingData[];
  blocks: BlockData[];
  settings: TenantSettings;
  timeRange: { startHour: number; endHour: number };
  date: Date;
  onBookingClick: (booking: BookingData) => void;
  visibleStaffIds: string[];
  recurringCustomerIds?: Set<string>;
}

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

export function ScheduleGrid({
  staff,
  schedules,
  bookings,
  blocks,
  settings,
  timeRange,
  date,
  onBookingClick,
  visibleStaffIds,
  recurringCustomerIds,
}: ScheduleGridProps) {
  const isMobile = useIsMobile();
  const { openBookingModal } = useBookingModal();
  const [mobileStaffIndex, setMobileStaffIndex] = useState(0);

  const filteredStaff = useMemo(
    () => staff.filter((s) => visibleStaffIds.includes(s.id)),
    [staff, visibleStaffIds]
  );

  const dateStr = format(date, "yyyy-MM-dd");
  const slotDuration = settings.slot_duration || 15;

  // Generate time slots
  const slots = useMemo(() => {
    const result: string[] = [];
    for (let mins = timeRange.startHour * 60; mins < timeRange.endHour * 60; mins += slotDuration) {
      result.push(minutesToTime(mins));
    }
    return result;
  }, [timeRange, slotDuration]);

  // Map schedules by staff_id
  const scheduleMap = useMemo(() => {
    const map: Record<string, Schedule> = {};
    schedules.forEach((s) => {
      if (s.staff_id) map[s.staff_id] = s;
    });
    // If there's a general schedule (no staff_id), use it for staff without individual schedule
    const generalSchedule = schedules.find((s) => !s.staff_id);
    return { map, generalSchedule };
  }, [schedules]);

  // Map bookings by staff_id
  const bookingsByStaff = useMemo(() => {
    const map: Record<string, BookingData[]> = {};
    bookings.forEach((b) => {
      const sid = b.staff_id || "__unassigned";
      if (!map[sid]) map[sid] = [];
      map[sid].push(b);
    });
    return map;
  }, [bookings]);

  // Map blocks by staff_id (null = all staff)
  const blocksByStaff = useMemo(() => {
    const general: BlockData[] = [];
    const map: Record<string, BlockData[]> = {};
    blocks.forEach((b) => {
      if (!b.staff_id) {
        general.push(b);
      } else {
        if (!map[b.staff_id]) map[b.staff_id] = [];
        map[b.staff_id].push(b);
      }
    });
    return { map, general };
  }, [blocks]);

  // Get current time in TZ for past-slot detection
  const nowMinutes = useMemo(() => {
    if (!isToday(date)) return -1; // Not today, no slots are past
    const nowInTZ = formatInTimeZone(new Date(), TZ, "HH:mm");
    return timeToMinutes(nowInTZ);
  }, [date]);

  function isSlotPast(slotTime: string): boolean {
    if (nowMinutes < 0) return false;
    return timeToMinutes(slotTime) < nowMinutes;
  }

  function getSlotType(staffId: string, slotTime: string): "free" | "off" | "break" | "block" | "booking" | "past" {
    const slotMins = timeToMinutes(slotTime);

    // Check past first
    if (isSlotPast(slotTime)) return "past";

    const schedule = scheduleMap.map[staffId] || scheduleMap.generalSchedule;

    // Check if outside working hours
    if (schedule) {
      const startMins = timeToMinutes(schedule.start_time);
      const endMins = timeToMinutes(schedule.end_time);
      if (slotMins < startMins || slotMins >= endMins) return "off";

      // Check break
      if (schedule.break_start && schedule.break_end) {
        const breakStart = timeToMinutes(schedule.break_start);
        const breakEnd = timeToMinutes(schedule.break_end);
        if (slotMins >= breakStart && slotMins < breakEnd) return "break";
      }
    } else {
      return "off";
    }

    // Check blocks
    const staffBlocks = [...(blocksByStaff.map[staffId] || []), ...blocksByStaff.general];
    for (const block of staffBlocks) {
      const blockStart = formatInTimeZone(new Date(block.starts_at), TZ, "HH:mm");
      const blockEnd = formatInTimeZone(new Date(block.ends_at), TZ, "HH:mm");
      if (slotMins >= timeToMinutes(blockStart) && slotMins < timeToMinutes(blockEnd)) return "block";
    }

    return "free";
  }

  function getBookingAtSlot(staffId: string, slotTime: string): BookingData | null {
    const slotMins = timeToMinutes(slotTime);
    const staffBookings = bookingsByStaff[staffId] || [];
    for (const b of staffBookings) {
      const bStart = formatInTimeZone(new Date(b.starts_at), TZ, "HH:mm");
      const bEnd = formatInTimeZone(new Date(b.ends_at), TZ, "HH:mm");
      if (slotMins >= timeToMinutes(bStart) && slotMins < timeToMinutes(bEnd)) return b;
    }
    return null;
  }

  function isBookingStart(staffId: string, slotTime: string, booking: BookingData): boolean {
    const bStart = formatInTimeZone(new Date(booking.starts_at), TZ, "HH:mm");
    return slotTime === bStart;
  }

  function getBookingSpan(booking: BookingData): number {
    const bStart = formatInTimeZone(new Date(booking.starts_at), TZ, "HH:mm");
    const bEnd = formatInTimeZone(new Date(booking.ends_at), TZ, "HH:mm");
    const durationMins = timeToMinutes(bEnd) - timeToMinutes(bStart);
    return Math.max(1, Math.ceil(durationMins / slotDuration));
  }

  function getBlockAtSlot(staffId: string, slotTime: string): BlockData | null {
    const slotMins = timeToMinutes(slotTime);
    const staffBlocks = [...(blocksByStaff.map[staffId] || []), ...blocksByStaff.general];
    for (const block of staffBlocks) {
      const blockStart = formatInTimeZone(new Date(block.starts_at), TZ, "HH:mm");
      if (slotTime === blockStart) return block;
    }
    return null;
  }

  function handleSlotClick(staffId: string, slotTime: string) {
    openBookingModal({ staffId, date: dateStr, time: slotTime });
  }

  const SLOT_HEIGHT = 48; // px per slot

  // Mobile: show one staff at a time
  const mobileStaff = filteredStaff[mobileStaffIndex] || filteredStaff[0];

  if (filteredStaff.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        Nenhum profissional ativo encontrado
      </div>
    );
  }

  const renderStaffColumn = (member: StaffMember) => {
    const renderedSlots: Set<string> = new Set();

    return (
      <div key={member.id} className="flex-1 min-w-[160px]">
        {slots.map((slotTime) => {
          if (renderedSlots.has(slotTime)) return null;

          const booking = getBookingAtSlot(member.id, slotTime);

          if (booking && isBookingStart(member.id, slotTime, booking)) {
            const span = getBookingSpan(booking);
            for (let i = 0; i < span; i++) {
              const idx = slots.indexOf(slotTime) + i;
              if (idx < slots.length) renderedSlots.add(slots[idx]);
            }
            return (
              <div key={slotTime} style={{ height: `${span * SLOT_HEIGHT}px` }} className="px-1 py-0.5">
                <BookingCard booking={booking} onClick={() => onBookingClick(booking)} isRecurring={recurringCustomerIds?.has(booking.customer_id)} />
              </div>
            );
          }

          if (booking) {
            // This slot is part of a booking but not the start — skip
            renderedSlots.add(slotTime);
            return null;
          }

          const slotType = getSlotType(member.id, slotTime);
          renderedSlots.add(slotTime);

          if (slotType === "off" || slotType === "past") {
            return (
              <div key={slotTime} style={{ height: `${SLOT_HEIGHT}px` }}
                className="bg-muted/30 border-b border-border/20" />
            );
          }

          if (slotType === "break") {
            return (
              <div key={slotTime} style={{ height: `${SLOT_HEIGHT}px` }}
                className="bg-muted/50 border-b border-border/20 flex items-center justify-center">
                <span className="text-[10px] text-muted-foreground/60 italic">Intervalo</span>
              </div>
            );
          }

          if (slotType === "block") {
            const block = getBlockAtSlot(member.id, slotTime);
            return (
              <div key={slotTime} style={{ height: `${SLOT_HEIGHT}px` }}
                className="bg-muted/40 border-b border-border/20 flex items-center justify-center px-1">
                <span className="text-[10px] text-muted-foreground/70 truncate">
                  {block?.reason || "Bloqueio"}
                </span>
              </div>
            );
          }

          // Free slot
          return (
            <div
              key={slotTime}
              style={{ height: `${SLOT_HEIGHT}px` }}
              className="border-b border-border/20 hover:bg-primary/5 cursor-pointer transition-colors"
              onClick={() => handleSlotClick(member.id, slotTime)}
            />
          );
        })}
      </div>
    );
  };

  if (isMobile) {
    return (
      <div className="space-y-3">
        {/* Staff selector */}
        <Select value={mobileStaff?.id || ""} onValueChange={(id) => {
          const idx = filteredStaff.findIndex((s) => s.id === id);
          if (idx >= 0) setMobileStaffIndex(idx);
        }}>
          <SelectTrigger className="h-10">
            <SelectValue placeholder="Selecione profissional" />
          </SelectTrigger>
          <SelectContent>
            {filteredStaff.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color || "#10B981" }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Single column grid */}
        <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40">
          <div className="flex">
            {/* Time column */}
            <div className="w-14 flex-shrink-0 border-r border-border/30">
              {slots.map((slotTime) => (
                <div key={slotTime} style={{ height: `${SLOT_HEIGHT}px` }}
                  className="flex items-center justify-center text-[11px] text-muted-foreground/70 border-b border-border/20">
                  {slotTime}
                </div>
              ))}
            </div>
            {mobileStaff && renderStaffColumn(mobileStaff)}
          </div>
        </div>
      </div>
    );
  }

  // Desktop grid
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/40">
      <ScrollArea className="w-full">
        <div className="min-w-max">
          {/* Header */}
          <div className="flex border-b border-border/50 bg-card/80 sticky top-0 z-10">
            <div className="w-16 flex-shrink-0 border-r border-border/30 p-2">
              <span className="text-[10px] text-muted-foreground/60 uppercase font-medium">Horário</span>
            </div>
            {filteredStaff.map((member) => (
              <div key={member.id} className="flex-1 min-w-[160px] p-2 border-r border-border/20 last:border-r-0">
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={member.photo_url || undefined} />
                    <AvatarFallback
                      className="text-[10px] font-semibold"
                      style={{ backgroundColor: `${member.color || "#10B981"}30`, color: member.color || "#10B981" }}
                    >
                      {member.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs font-medium text-foreground truncate">{member.name}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Body */}
          <div className="flex">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 border-r border-border/30 sticky left-0 bg-card/80 z-[5]">
              {slots.map((slotTime) => (
                <div key={slotTime} style={{ height: `${SLOT_HEIGHT}px` }}
                  className="flex items-center justify-center text-[11px] text-muted-foreground/70 border-b border-border/20">
                  {slotTime}
                </div>
              ))}
            </div>

            {/* Staff columns */}
            {filteredStaff.map((member) => (
              <div key={member.id} className="flex-1 min-w-[160px] border-r border-border/20 last:border-r-0">
                {renderStaffColumn(member)}
              </div>
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
