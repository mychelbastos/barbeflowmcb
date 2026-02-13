import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, isToday as checkIsToday, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Clock, ChevronRight } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

interface Booking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service?: { name: string; color: string; price_cents: number };
  staff?: { name: string; color?: string };
  customer?: { name: string; phone: string };
  is_recurring?: boolean;
}

interface WeeklyScheduleGridProps {
  bookings: Booking[];
  dateRange: { from: Date; to: Date };
  onSelectBooking?: (booking: Booking) => void;
}

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7);
const SLOT_HEIGHT = 48;

const statusColors: Record<string, string> = {
  confirmed: "from-emerald-500/80 to-emerald-600/60 border-emerald-400/30",
  completed: "from-blue-500/80 to-blue-600/60 border-blue-400/30",
  pending: "from-gray-500/60 to-gray-600/40 border-gray-400/20",
  cancelled: "from-red-500/60 to-red-600/40 border-red-400/20",
  no_show: "from-amber-500/60 to-amber-600/40 border-amber-400/20",
  recurring: "from-violet-500/80 to-violet-600/60 border-violet-400/30",
};

const statusBadge: Record<string, { label: string; cls: string }> = {
  confirmed: { label: "Confirmado", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  completed: { label: "Concluído", cls: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  pending: { label: "Pendente", cls: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelado", cls: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  no_show: { label: "Faltou", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  recurring: { label: "Fixo", cls: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20" },
};

const ease = [0.16, 1, 0.3, 1] as const;

// --- Mobile: compact day list ---
function MobileScheduleList({ bookings, dateRange, onSelectBooking }: WeeklyScheduleGridProps) {
  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const daysWithBookings = useMemo(() => {
    return days.map(day => ({
      day,
      bookings: bookings
        .filter(b => isSameDay(new Date(b.starts_at), day))
        .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()),
    }));
  }, [bookings, days]);

  const hasAny = daysWithBookings.some(d => d.bookings.length > 0);

  return (
    <div className="p-3 space-y-1">
      {!hasAny ? (
        <div className="text-center py-12">
          <Calendar className="h-6 w-6 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum agendamento na semana</p>
        </div>
      ) : (
        daysWithBookings.map(({ day, bookings: dayBookings }) => {
          if (dayBookings.length === 0) return null;
          const isToday = checkIsToday(day);
          return (
            <div key={day.toISOString()}>
              <div className="flex items-center gap-2.5 px-2 py-2">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm ${
                  isToday
                    ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {format(day, "dd")}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold capitalize ${isToday ? "text-primary" : "text-foreground"}`}>
                    {format(day, "EEEE", { locale: ptBR })}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{format(day, "dd 'de' MMMM", { locale: ptBR })}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isToday ? "bg-primary/10 text-primary border border-primary/20" : "bg-muted text-muted-foreground"
                }`}>
                  {dayBookings.length}
                </span>
              </div>

              <div className="ml-4 border-l-2 border-border pl-3 pb-2 space-y-1">
                {dayBookings.map((booking, idx) => {
                  const st = booking.is_recurring ? "recurring" : (booking.status || "pending");
                  const badge = statusBadge[st] || statusBadge.pending;
                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03, ease }}
                      onClick={() => onSelectBooking?.(booking)}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl cursor-pointer active:bg-muted/50 transition-colors"
                    >
                      <div
                        className="w-1 h-7 rounded-full flex-shrink-0"
                        style={{ backgroundColor: booking.service?.color || "#3B82F6" }}
                      />
                      <div className="flex items-center gap-1 w-12 flex-shrink-0">
                        <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                        <span className="text-[11px] font-mono font-semibold text-muted-foreground">
                          {format(new Date(booking.starts_at), "HH:mm")}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{booking.customer?.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{booking.service?.name}</p>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${badge.cls} flex-shrink-0`}>
                        {badge.label}
                      </span>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

// --- Desktop: full grid ---
function DesktopScheduleGrid({ bookings, dateRange, onSelectBooking }: WeeklyScheduleGridProps) {
  const MAX_DAYS = 7;
  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const days = allDays.length > MAX_DAYS ? allDays.slice(-MAX_DAYS) : allDays;

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    days.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      map.set(key, bookings.filter(b => isSameDay(new Date(b.starts_at), day)));
    });
    return map;
  }, [bookings, days]);

  const getBookingStyle = (booking: Booking) => {
    const start = new Date(booking.starts_at);
    const end = new Date(booking.ends_at);
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const top = (startHour - 7) * SLOT_HEIGHT;
    const height = Math.max((endHour - startHour) * SLOT_HEIGHT - 2, 18);
    return { top, height };
  };

  return (
    <>
      {/* Day headers */}
      <div className={`grid border-b border-border`} style={{ gridTemplateColumns: `50px repeat(${days.length}, 1fr)` }}>
        <div className="p-2" />
        {days.map((day) => {
          const isToday = checkIsToday(day);
          const dayKey = format(day, "yyyy-MM-dd");
          const count = bookingsByDay.get(dayKey)?.length || 0;
          return (
            <div key={dayKey} className={`p-2 text-center border-l border-border/50 ${isToday ? "bg-primary/[0.04]" : ""}`}>
              <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                {format(day, "EEE", { locale: ptBR })}
              </p>
              <p className={`text-lg font-bold ${isToday ? "text-primary" : "text-foreground"}`}>
                {format(day, "dd")}
              </p>
              {count > 0 && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {count}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="grid relative" style={{ gridTemplateColumns: `50px repeat(${days.length}, 1fr)`, height: HOURS.length * SLOT_HEIGHT }}>
        <div className="relative">
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute left-0 right-0 flex items-start justify-end pr-2 text-[10px] font-mono text-muted-foreground font-semibold"
              style={{ top: (hour - 7) * SLOT_HEIGHT - 6 }}
            >
              {String(hour).padStart(2, "0")}:00
            </div>
          ))}
        </div>

        {days.map((day) => {
          const dayKey = format(day, "yyyy-MM-dd");
          const dayBookings = bookingsByDay.get(dayKey) || [];
          const isToday = checkIsToday(day);

          return (
            <div key={dayKey} className={`relative border-l border-border/50 ${isToday ? "bg-primary/[0.02]" : ""}`}>
              {HOURS.map((hour) => (
                <div key={hour} className="absolute left-0 right-0 border-t border-border/30" style={{ top: (hour - 7) * SLOT_HEIGHT }} />
              ))}

              {isToday && (() => {
                const now = new Date();
                const currentHour = now.getHours() + now.getMinutes() / 60;
                if (currentHour >= 7 && currentHour <= 21) {
                  return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute left-0 right-0 z-20 flex items-center" style={{ top: (currentHour - 7) * SLOT_HEIGHT }}>
                      <div className="w-2 h-2 rounded-full bg-primary -ml-1 shadow-lg shadow-primary/30" />
                      <div className="flex-1 h-[2px] bg-primary/60" />
                    </motion.div>
                  );
                }
                return null;
              })()}

              {dayBookings.map((booking, idx) => {
                const { top, height } = getBookingStyle(booking);
                const status = booking.is_recurring ? "recurring" : (booking.status || "pending");
                const colorClass = statusColors[status] || statusColors.pending;
                return (
                  <motion.div
                    key={booking.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: idx * 0.02 }}
                    whileHover={{ scale: 1.03, zIndex: 30 }}
                    onClick={() => onSelectBooking?.(booking)}
                    className={`absolute left-1 right-1 rounded-lg bg-gradient-to-b ${colorClass} border backdrop-blur-sm cursor-pointer overflow-hidden px-1.5 py-1 shadow-sm hover:shadow-md transition-shadow duration-200`}
                    style={{ top, height }}
                  >
                    <p className="text-[10px] font-bold text-white truncate leading-tight">{booking.customer?.name || "—"}</p>
                    {height > 28 && <p className="text-[9px] text-white/70 truncate leading-tight">{booking.service?.name}</p>}
                    {height > 42 && <p className="text-[9px] text-white/60 font-mono">{format(new Date(booking.starts_at), "HH:mm")}</p>}
                  </motion.div>
                );
              })}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function WeeklyScheduleGrid({ bookings, dateRange, onSelectBooking }: WeeklyScheduleGridProps) {
  const isMobile = useIsMobile();
  
  const allDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const displayFrom = allDays.length > 7 ? allDays[allDays.length - 7] : dateRange.from;
  const displayTo = dateRange.to;

  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-border">
        <div className="flex items-center gap-2.5 md:gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Agenda Semanal</h2>
            <p className="text-[11px] text-muted-foreground">
              {format(displayFrom, "dd/MM", { locale: ptBR })} — {format(displayTo, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      {isMobile ? (
        <MobileScheduleList bookings={bookings} dateRange={dateRange} onSelectBooking={onSelectBooking} />
      ) : (
        <DesktopScheduleGrid bookings={bookings} dateRange={dateRange} onSelectBooking={onSelectBooking} />
      )}
    </div>
  );
}
