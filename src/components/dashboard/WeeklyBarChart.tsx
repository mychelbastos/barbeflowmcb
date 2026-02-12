import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, startOfWeek, endOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface WeeklyBarChartProps {
  bookings: { starts_at: string }[];
  dateRange: { from: Date; to: Date };
}

export function WeeklyBarChart({ bookings, dateRange }: WeeklyBarChartProps) {
  const weekStart = startOfWeek(dateRange.from, { weekStartsOn: 0 });
  const weekEnd = endOfWeek(dateRange.from, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const data = useMemo(() => {
    return days.map(day => ({
      day,
      label: format(day, "EEE", { locale: ptBR }),
      count: bookings.filter(b => isSameDay(new Date(b.starts_at), day)).length,
    }));
  }, [bookings, days]);

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <div className="rounded-2xl glass-panel p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
          <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Volume Semanal</h3>
      </div>
      <div className="flex items-end gap-2 h-32">
        {data.map((d, i) => {
          const pct = (d.count / maxCount) * 100;
          const isToday = format(d.day, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-500 tabular-nums">{d.count || ""}</span>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${Math.max(pct, 4)}%` }}
                transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
                className={`w-full rounded-lg ${
                  isToday
                    ? "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-sm shadow-emerald-500/20"
                    : d.count > 0
                    ? "bg-gradient-to-t from-zinc-700 to-zinc-600"
                    : "bg-zinc-800/30"
                }`}
              />
              <span className={`text-[10px] font-bold uppercase ${isToday ? 'text-emerald-400' : 'text-zinc-600'}`}>
                {d.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
