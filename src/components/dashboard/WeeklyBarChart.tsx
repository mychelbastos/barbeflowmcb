import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay, isToday as checkIsToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { BarChart3 } from "lucide-react";

interface WeeklyBarChartProps {
  bookings: { starts_at: string }[];
  dateRange: { from: Date; to: Date };
}

const ease = [0.16, 1, 0.3, 1] as const;

export function WeeklyBarChart({ bookings, dateRange }: WeeklyBarChartProps) {
  const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });

  const data = useMemo(() => {
    return days.map(day => ({
      day,
      label: format(day, "EEE", { locale: ptBR }),
      date: format(day, "dd", { locale: ptBR }),
      count: bookings.filter(b => isSameDay(new Date(b.starts_at), day)).length,
      isToday: checkIsToday(day),
    }));
  }, [bookings, days]);

  const maxCount = Math.max(...data.map(d => d.count), 1);
  const totalBookings = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center justify-between px-4 md:px-5 py-3 md:py-4 border-b border-zinc-800/30">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <BarChart3 className="h-4 w-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Volume no Período</h3>
            <p className="text-[10px] text-zinc-600">{totalBookings} agendamentos</p>
          </div>
        </div>
      </div>

      <div className="px-4 md:px-5 py-4 md:py-5">
        <div className="flex items-end gap-1.5 md:gap-2 h-32 md:h-36">
          {data.map((d, i) => {
            const pct = (d.count / maxCount) * 100;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                {/* Count label */}
                <motion.span
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: d.count > 0 ? 1 : 0, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.05, ease }}
                  className={`text-[11px] font-bold tabular-nums ${d.isToday ? "text-emerald-400" : "text-zinc-400"}`}
                >
                  {d.count || ""}
                </motion.span>

                {/* Bar */}
                <motion.div
                  initial={{ height: 0, opacity: 0.5 }}
                  animate={{ height: `${Math.max(pct, 6)}%`, opacity: 1 }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease }}
                  className={`w-full rounded-xl transition-shadow duration-300 ${
                    d.isToday
                      ? "bg-gradient-to-t from-emerald-500 to-emerald-400 shadow-md shadow-emerald-500/25"
                      : d.count > 0
                      ? "bg-gradient-to-t from-zinc-700 to-zinc-600 hover:from-zinc-600 hover:to-zinc-500"
                      : "bg-zinc-800/20"
                  }`}
                />

                {/* Day label */}
                <div className="flex flex-col items-center">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${d.isToday ? "text-emerald-400" : "text-zinc-600"}`}>
                    {d.label}
                  </span>
                  <span className={`text-[9px] font-medium ${d.isToday ? "text-emerald-500/60" : "text-zinc-700"}`}>
                    {d.date}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
