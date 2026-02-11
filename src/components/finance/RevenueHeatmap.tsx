import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Flame } from "lucide-react";

interface HeatmapProps {
  bookings: any[];
}

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 08 to 21

function getIntensityClass(value: number, max: number): string {
  if (value === 0 || max === 0) return "bg-zinc-800";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-emerald-900/50";
  if (ratio <= 0.5) return "bg-emerald-700";
  if (ratio <= 0.75) return "bg-emerald-500";
  return "bg-emerald-400";
}

export function RevenueHeatmap({ bookings }: HeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
    // grid[weekday][hour] = { revenue, count }
    const g: Record<number, Record<number, { revenue: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) {
      g[d] = {};
      for (const h of HOURS) {
        g[d][h] = { revenue: 0, count: 0 };
      }
    }

    let max = 0;
    for (const b of bookings) {
      const dt = new Date(b.starts_at);
      // JS: 0=Sunday, convert to 0=Monday
      const jsDay = dt.getDay();
      const weekday = jsDay === 0 ? 6 : jsDay - 1;
      const hour = dt.getHours();
      if (hour < 8 || hour > 21) continue;
      const price = b.service?.price_cents || 0;
      g[weekday][hour].revenue += price;
      g[weekday][hour].count += 1;
      if (g[weekday][hour].revenue > max) max = g[weekday][hour].revenue;
    }

    return { grid: g, maxValue: max };
  }, [bookings]);

  // Check which weekdays have any data
  const activeWeekdays = useMemo(() => {
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      const hasData = HOURS.some((h) => grid[d][h].count > 0);
      // Always show Mon-Sat, only show Sun if data
      if (d < 6 || hasData) days.push(d);
    }
    return days;
  }, [grid]);

  return (
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500/10 rounded-lg flex items-center justify-center">
            <Flame className="h-4 w-4 text-emerald-400" />
          </div>
          Mapa de Calor — Receita por Dia e Horário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour headers */}
              <div className="flex items-center mb-1">
                <div className="w-10 flex-shrink-0" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="flex-1 text-center text-[10px] text-zinc-500"
                  >
                    {h}h
                  </div>
                ))}
              </div>

              {/* Rows */}
              {activeWeekdays.map((d) => (
                <div key={d} className="flex items-center gap-0.5 mb-0.5">
                  <div className="w-10 flex-shrink-0 text-[11px] text-zinc-400 font-medium">
                    {WEEKDAY_LABELS[d]}
                  </div>
                  {HOURS.map((h) => {
                    const cell = grid[d][h];
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 h-8 md:h-10 rounded-md cursor-default transition-colors ${getIntensityClass(cell.revenue, maxValue)}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-semibold">
                            {WEEKDAY_LABELS[d]}, {h}h
                          </p>
                          <p>
                            Faturamento: R${" "}
                            {(cell.revenue / 100).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          <p>Atendimentos: {cell.count}</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 justify-center">
            <span className="text-[10px] text-zinc-500">R$ 0</span>
            <div className="flex gap-0.5">
              {["bg-zinc-800", "bg-emerald-900/50", "bg-emerald-700", "bg-emerald-500", "bg-emerald-400"].map(
                (cls, i) => (
                  <div key={i} className={`w-8 h-3 rounded-sm ${cls}`} />
                )
              )}
            </div>
            <span className="text-[10px] text-zinc-500">
              R$ {(maxValue / 100).toFixed(0)}
            </span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
