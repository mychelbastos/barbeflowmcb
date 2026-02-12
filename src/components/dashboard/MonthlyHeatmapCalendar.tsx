import { useMemo } from "react";
import { motion } from "framer-motion";
import { Calendar } from "lucide-react";

interface MonthlyHeatmapCalendarProps {
  bookings: {
    starts_at: string;
    status: string;
  }[];
  dateRange: { from: Date; to: Date };
}

export function MonthlyHeatmapCalendar({ bookings, dateRange }: MonthlyHeatmapCalendarProps) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const { days, countsByDay, maxCount, totalInMonth } = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startWeekday = firstDay.getDay(); // 0=Sun

    const counts: Record<number, number> = {};
    let total = 0;

    bookings.forEach((b) => {
      if (b.status === "cancelled") return;
      const d = new Date(b.starts_at);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        counts[day] = (counts[day] || 0) + 1;
        total++;
      }
    });

    const max = Math.max(1, ...Object.values(counts));

    const allDays: (number | null)[] = [];
    for (let i = 0; i < startWeekday; i++) allDays.push(null);
    for (let d = 1; d <= daysInMonth; d++) allDays.push(d);

    return { days: allDays, countsByDay: counts, maxCount: max, totalInMonth: total };
  }, [bookings, year, month]);

  const monthName = new Date(year, month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const getIntensity = (count: number): string => {
    if (count === 0) return "bg-zinc-800/40";
    const ratio = count / maxCount;
    if (ratio <= 0.25) return "bg-emerald-900/50";
    if (ratio <= 0.5) return "bg-emerald-700/60";
    if (ratio <= 0.75) return "bg-emerald-600/70";
    return "bg-emerald-500/80";
  };

  const today = now.getDate();
  const weekdays = ["D", "S", "T", "Q", "Q", "S", "S"];

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl glass-panel overflow-hidden"
    >
      <div className="px-4 py-3">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
            <Calendar className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 capitalize">{monthName}</h3>
            <p className="text-[10px] text-zinc-500">{totalInMonth} agendamentos no período</p>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mt-3 mb-1">
          {weekdays.map((d, i) => (
            <div key={i} className="text-center text-[10px] font-bold text-zinc-600 uppercase">
              {d}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, i) => {
            if (day === null) return <div key={`empty-${i}`} />;
            const count = countsByDay[day] || 0;
            const isToday = day === today;
            return (
              <div
                key={day}
                className={`relative aspect-square rounded-md flex items-center justify-center text-[11px] font-medium transition-colors
                  ${getIntensity(count)}
                  ${isToday ? "ring-1 ring-emerald-500/60 text-emerald-300 font-bold" : count > 0 ? "text-zinc-300" : "text-zinc-600"}
                `}
                title={`${day}: ${count} agendamento(s)`}
              >
                {day}
                {count > 0 && (
                  <span className="absolute bottom-0.5 right-0.5 text-[7px] font-bold text-emerald-400/80">
                    {count}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-1.5 mt-3">
          <span className="text-[9px] text-zinc-600">Menos</span>
          {["bg-zinc-800/40", "bg-emerald-900/50", "bg-emerald-700/60", "bg-emerald-600/70", "bg-emerald-500/80"].map((cls, i) => (
            <div key={i} className={`w-3 h-3 rounded-sm ${cls}`} />
          ))}
          <span className="text-[9px] text-zinc-600">Mais</span>
        </div>
      </div>
    </motion.div>
  );
}
