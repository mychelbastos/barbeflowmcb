import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { GitCompareArrows } from "lucide-react";

interface PeriodComparisonChartProps {
  currentDaily: { date: string; expected: number }[];
  previousDaily: { date: string; expected: number }[];
}

export function PeriodComparisonChart({
  currentDaily,
  previousDaily,
}: PeriodComparisonChartProps) {
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
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <GitCompareArrows className="h-4 w-4 text-emerald-400" />
          </div>
          Comparativo com Período Anterior
        </CardTitle>
        <CardDescription className="text-xs md:text-sm">
          Faturamento diário atual vs período equivalente anterior
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
        <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "#71717a" }}
              label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "#71717a" }}
            />
            <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={50} />
            <Tooltip
              contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
              labelStyle={{ color: "#a1a1aa" }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ["-", name];
                return [`R$ ${value.toFixed(2)}`, name === "current" ? "Atual" : "Anterior"];
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend
              formatter={(value) => (value === "current" ? "Período Atual" : "Período Anterior")}
              wrapperStyle={{ fontSize: 12 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="current"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="#71717a"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="previous"
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
