import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek, isToday as checkIsToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { Calendar, Clock } from "lucide-react";

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

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 07:00 - 20:00
const SLOT_HEIGHT = 48; // px per hour

const statusColors: Record<string, string> = {
  confirmed: "from-emerald-500/80 to-emerald-600/60 border-emerald-400/30",
  completed: "from-blue-500/80 to-blue-600/60 border-blue-400/30",
  pending: "from-zinc-500/60 to-zinc-600/40 border-zinc-400/20",
  cancelled: "from-red-500/60 to-red-600/40 border-red-400/20",
  no_show: "from-amber-500/60 to-amber-600/40 border-amber-400/20",
  recurring: "from-violet-500/80 to-violet-600/60 border-violet-400/30",
};

export function WeeklyScheduleGrid({ bookings, dateRange, onSelectBooking }: WeeklyScheduleGridProps) {
  const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(dateRange.from, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>();
    days.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      const dayBookings = bookings.filter(b => isSameDay(new Date(b.starts_at), day));
      map.set(key, dayBookings);
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
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <Calendar className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 tracking-tight">Agenda Semanal</h2>
            <p className="text-[11px] text-zinc-600">
              {format(weekStart, "dd/MM", { locale: ptBR })} — {format(weekEnd, "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Day headers */}
          <div className="grid grid-cols-[50px_repeat(7,1fr)] border-b border-zinc-800/30">
            <div className="p-2" />
            {days.map((day) => {
              const isToday = checkIsToday(day);
              const dayKey = format(day, "yyyy-MM-dd");
              const count = bookingsByDay.get(dayKey)?.length || 0;
              return (
                <div key={dayKey} className={`p-2 text-center border-l border-zinc-800/20 ${isToday ? 'bg-emerald-500/[0.04]' : ''}`}>
                  <p className={`text-[10px] font-bold uppercase tracking-wider ${isToday ? 'text-emerald-400' : 'text-zinc-600'}`}>
                    {format(day, "EEE", { locale: ptBR })}
                  </p>
                  <p className={`text-lg font-bold ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
                    {format(day, "dd")}
                  </p>
                  {count > 0 && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isToday ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800/40 text-zinc-500'}`}>
                      {count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Time grid */}
          <div className="grid grid-cols-[50px_repeat(7,1fr)] relative" style={{ height: HOURS.length * SLOT_HEIGHT }}>
            {/* Time labels */}
            <div className="relative">
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute left-0 right-0 flex items-start justify-end pr-2 text-[10px] font-mono text-zinc-600 font-semibold"
                  style={{ top: (hour - 7) * SLOT_HEIGHT - 6 }}
                >
                  {String(hour).padStart(2, "0")}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {days.map((day) => {
              const dayKey = format(day, "yyyy-MM-dd");
              const dayBookings = bookingsByDay.get(dayKey) || [];
              const isToday = checkIsToday(day);

              return (
                <div key={dayKey} className={`relative border-l border-zinc-800/20 ${isToday ? 'bg-emerald-500/[0.02]' : ''}`}>
                  {/* Hour lines */}
                  {HOURS.map((hour) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0 border-t border-zinc-800/15"
                      style={{ top: (hour - 7) * SLOT_HEIGHT }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {isToday && (() => {
                    const now = new Date();
                    const currentHour = now.getHours() + now.getMinutes() / 60;
                    if (currentHour >= 7 && currentHour <= 21) {
                      return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute left-0 right-0 z-20 flex items-center"
                          style={{ top: (currentHour - 7) * SLOT_HEIGHT }}
                        >
                          <div className="w-2 h-2 rounded-full bg-emerald-400 -ml-1 shadow-lg shadow-emerald-500/30" />
                          <div className="flex-1 h-[2px] bg-emerald-400/60" />
                        </motion.div>
                      );
                    }
                    return null;
                  })()}

                  {/* Booking blocks */}
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
                        <p className="text-[10px] font-bold text-white truncate leading-tight">
                          {booking.customer?.name || "—"}
                        </p>
                        {height > 28 && (
                          <p className="text-[9px] text-white/70 truncate leading-tight">
                            {booking.service?.name}
                          </p>
                        )}
                        {height > 42 && (
                          <p className="text-[9px] text-white/60 font-mono">
                            {format(new Date(booking.starts_at), "HH:mm")}
                          </p>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
