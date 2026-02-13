import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, isToday as checkIsToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isSameMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { CalendarDays } from "lucide-react";

interface WeeklyBarChartProps {
  bookings: { starts_at: string }[];
  dateRange: { from: Date; to: Date };
}

const ease = [0.16, 1, 0.3, 1] as const;
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];

export function WeeklyBarChart({ bookings, dateRange }: WeeklyBarChartProps) {
  const referenceDate = dateRange.to;
  const monthStart = startOfMonth(referenceDate);
  const monthEnd = endOfMonth(referenceDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const { dayCountMap, maxCount, totalBookings } = useMemo(() => {
    const map = new Map<string, number>();
    let total = 0;
    const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
    monthDays.forEach(day => {
      const key = format(day, "yyyy-MM-dd");
      const count = bookings.filter(b => isSameDay(new Date(b.starts_at), day)).length;
      map.set(key, count);
      total += count;
    });
    const max = Math.max(...Array.from(map.values()), 1);
    return { dayCountMap: map, maxCount: max, totalBookings: total };
  }, [bookings, monthStart, monthEnd]);

  const isInRange = (day: Date) => {
    const d = format(day, "yyyy-MM-dd");
    const from = format(dateRange.from, "yyyy-MM-dd");
    const to = format(dateRange.to, "yyyy-MM-dd");
    return d >= from && d <= to;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: 0.25, ease }}
      className="rounded-2xl glass-panel overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-5 py-3 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <CalendarDays className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight capitalize">
              {format(referenceDate, "MMMM yyyy", { locale: ptBR })}
            </h3>
            <p className="text-[10px] text-muted-foreground">{totalBookings} agendamentos no período</p>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="px-3 md:px-4 py-3 md:py-4">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-1.5">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, i) => {
            const key = format(day, "yyyy-MM-dd");
            const count = dayCountMap.get(key) || 0;
            const isCurrentMonth = isSameMonth(day, referenceDate);
            const isToday = checkIsToday(day);
            const inRange = isInRange(day);
            const intensity = count > 0 ? Math.max(0.15, count / maxCount) : 0;

            return (
              <motion.div
                key={key}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: i * 0.008, ease }}
                className={`relative aspect-square rounded-lg flex flex-col items-center justify-center gap-0 transition-all duration-200 ${
                  !isCurrentMonth
                    ? "opacity-20"
                    : isToday
                    ? "ring-1 ring-primary/40"
                    : ""
                } ${inRange ? "bg-muted/30" : ""}`}
              >
                {/* Background intensity indicator */}
                {count > 0 && isCurrentMonth && (
                  <div
                    className="absolute inset-0 rounded-lg bg-primary transition-opacity"
                    style={{ opacity: intensity * 0.25 }}
                  />
                )}

                <span className={`relative text-[11px] font-semibold leading-none ${
                  isToday
                    ? "text-primary font-bold"
                    : isCurrentMonth
                    ? "text-foreground"
                    : "text-muted-foreground"
                }`}>
                  {format(day, "d")}
                </span>

                {count > 0 && isCurrentMonth && (
                  <span className={`relative text-[8px] font-bold leading-none mt-0.5 ${
                    isToday ? "text-primary" : "text-primary/70"
                  }`}>
                    {count}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-border">
          <span className="text-[9px] text-muted-foreground">Menos</span>
          {[0.05, 0.1, 0.15, 0.2, 0.25].map((opacity, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[3px] bg-primary"
              style={{ opacity: opacity + 0.05 }}
            />
          ))}
          <span className="text-[9px] text-muted-foreground">Mais</span>
        </div>
      </div>
    </motion.div>
  );
}
