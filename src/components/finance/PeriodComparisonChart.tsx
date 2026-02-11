import { useMemo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Area,
  ComposedChart,
} from "recharts";
import { GitCompareArrows } from "lucide-react";

interface PeriodComparisonChartProps {
  currentDaily: { date: string; expected: number }[];
  previousDaily: { date: string; expected: number }[];
}

const tooltipStyle = {
  backgroundColor: "hsl(240 6% 8% / 0.95)",
  border: "1px solid hsl(240 4% 18%)",
  borderRadius: 14,
  boxShadow: "0 12px 40px -8px hsl(0 0% 0% / 0.6)",
  padding: "12px 16px",
  backdropFilter: "blur(12px)",
};

export function PeriodComparisonChart({ currentDaily, previousDaily }: PeriodComparisonChartProps) {
  const chartData = useMemo(() => {
    const maxLen = Math.max(currentDaily.length, previousDaily.length);
    return Array.from({ length: maxLen }, (_, i) => ({
      day: i + 1,
      current: currentDaily[i]?.expected ?? null,
      previous: previousDaily[i]?.expected ?? null,
    }));
  }, [currentDaily, previousDaily]);

  if (chartData.length === 0) return null;

  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/30">
        <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <GitCompareArrows className="h-4 w-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Comparativo com Período Anterior</h3>
          <p className="text-[11px] text-zinc-600">Faturamento diário atual vs anterior</p>
        </div>
      </div>
      <div className="p-4 md:p-5">
        <ResponsiveContainer width="100%" height={260} className="md:!h-[300px]">
          <ComposedChart data={chartData}>
            <defs>
              <linearGradient id="compAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.12} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" strokeOpacity={0.6} />
            <XAxis dataKey="day" tick={{ fontSize: 10, fill: "hsl(240 5% 40%)" }} axisLine={false} tickLine={false}
              label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "hsl(240 5% 40%)" }} />
            <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 40%)" }} width={50} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(240 5% 50%)", fontSize: 11, marginBottom: 4 }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ["-", name];
                return [`R$ ${value.toFixed(2)}`, name === "current" ? "Atual" : "Anterior"];
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend formatter={(value) => (value === "current" ? "Período Atual" : "Período Anterior")} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="current" fill="url(#compAreaGrad)" stroke="transparent" />
            <Line type="monotone" dataKey="current" stroke="#10b981" strokeWidth={2.5} dot={false} name="current" connectNulls />
            <Line type="monotone" dataKey="previous" stroke="hsl(240 5% 35%)" strokeWidth={2} strokeDasharray="6 4" dot={false} name="previous" connectNulls strokeOpacity={0.7} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
