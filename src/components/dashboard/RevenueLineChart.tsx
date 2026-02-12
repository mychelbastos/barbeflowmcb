import { useMemo } from "react";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { TrendingUp } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

interface RevenueLineChartProps {
  bookings: { starts_at: string; status: string; service?: { price_cents: number } }[];
  dateRange: { from: Date; to: Date };
}

const tooltipStyle = {
  backgroundColor: "hsl(240 6% 8% / 0.95)",
  border: "1px solid hsl(240 4% 18%)",
  borderRadius: 14,
  backdropFilter: "blur(12px)",
  padding: "8px 12px",
};

export function RevenueLineChart({ bookings, dateRange }: RevenueLineChartProps) {
  const data = useMemo(() => {
    const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
    let cumulative = 0;
    return days.map(day => {
      const dayBookings = bookings.filter(
        b => isSameDay(new Date(b.starts_at), day) && (b.status === "confirmed" || b.status === "completed")
      );
      const dayRevenue = dayBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0) / 100;
      cumulative += dayRevenue;
      return {
        date: format(day, "dd/MM"),
        label: format(day, "dd MMM", { locale: ptBR }),
        revenue: dayRevenue,
        cumulative: Math.round(cumulative),
      };
    });
  }, [bookings, dateRange]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl glass-panel overflow-hidden"
    >
      <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Receita</h3>
            <p className="text-[10px] text-zinc-600">Acumulada no período</p>
          </div>
        </div>
        <span className="text-lg font-bold text-emerald-400 tabular-nums">
          R$ {data.length > 0 ? data[data.length - 1].cumulative.toLocaleString("pt-BR") : 0}
        </span>
      </div>
      <div className="p-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(160 84% 39%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(160 84% 39%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(240 4% 46%)" }} tickLine={false} axisLine={false} tickFormatter={v => `${v}`} />
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={{ color: "hsl(240 4% 66%)", fontSize: 11 }}
              itemStyle={{ color: "hsl(160 84% 60%)", fontSize: 12, fontWeight: 700 }}
              formatter={(value: number) => [`R$ ${value.toLocaleString("pt-BR")}`, "Receita"]}
            />
            <Area
              type="monotone"
              dataKey="cumulative"
              stroke="hsl(160 84% 50%)"
              strokeWidth={2.5}
              fill="url(#revenueGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "hsl(160 84% 50%)", strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
