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
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="pb-2 md:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <GitCompareArrows className="h-4 w-4 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base md:text-lg tracking-tight">
              Comparativo com Período Anterior
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground/60">
              Faturamento diário atual vs período equivalente anterior
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
        <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" strokeOpacity={0.5} />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }}
              label={{ value: "Dia", position: "insideBottomRight", offset: -5, fontSize: 10, fill: "hsl(240 5% 45%)" }}
              axisLine={{ stroke: "hsl(240 4% 16%)" }}
            />
            <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} width={50} axisLine={{ stroke: "hsl(240 4% 16%)" }} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(240 5% 10%)",
                border: "1px solid hsl(240 4% 20%)",
                borderRadius: 12,
                boxShadow: "0 8px 32px -8px hsl(0 0% 0% / 0.5)",
                padding: "10px 14px",
              }}
              labelStyle={{ color: "hsl(240 5% 65%)", fontSize: 11 }}
              formatter={(value: number | null, name: string) => {
                if (value === null) return ["-", name];
                return [`R$ ${value.toFixed(2)}`, name === "current" ? "Atual" : "Anterior"];
              }}
              labelFormatter={(label) => `Dia ${label}`}
            />
            <Legend
              formatter={(value) => (value === "current" ? "Período Atual" : "Período Anterior")}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            <Line
              type="monotone"
              dataKey="current"
              stroke="#10b981"
              strokeWidth={2.5}
              dot={false}
              name="current"
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="previous"
              stroke="hsl(240 5% 45%)"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              name="previous"
              connectNulls
              strokeOpacity={0.6}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
