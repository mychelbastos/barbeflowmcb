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

function getIntensityStyle(value: number, max: number): { bg: string; ring: string } {
  if (value === 0 || max === 0) return { bg: "bg-muted/30", ring: "" };
  const ratio = value / max;
  if (ratio <= 0.25) return { bg: "bg-emerald-900/30", ring: "ring-1 ring-emerald-800/20" };
  if (ratio <= 0.5) return { bg: "bg-emerald-800/50", ring: "ring-1 ring-emerald-700/30" };
  if (ratio <= 0.75) return { bg: "bg-emerald-600/60", ring: "ring-1 ring-emerald-500/30" };
  return { bg: "bg-emerald-500/70", ring: "ring-1 ring-emerald-400/40" };
}

export function RevenueHeatmap({ bookings }: HeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
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

  const activeWeekdays = useMemo(() => {
    const days: number[] = [];
    for (let d = 0; d < 7; d++) {
      const hasData = HOURS.some((h) => grid[d][h].count > 0);
      if (d < 6 || hasData) days.push(d);
    }
    return days;
  }, [grid]);

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="pb-2 md:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
            <Flame className="h-4 w-4 text-primary" />
          </div>
          <CardTitle className="text-base md:text-lg tracking-tight">
            Mapa de Calor — Receita por Dia e Horário
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <TooltipProvider delayDuration={100}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour headers */}
              <div className="flex items-center mb-1.5">
                <div className="w-10 flex-shrink-0" />
                {HOURS.map((h) => (
                  <div
                    key={h}
                    className="flex-1 text-center text-[10px] font-medium text-muted-foreground/50"
                  >
                    {h}h
                  </div>
                ))}
              </div>

              {/* Rows */}
              {activeWeekdays.map((d) => (
                <div key={d} className="flex items-center gap-1 mb-1">
                  <div className="w-10 flex-shrink-0 text-[11px] text-muted-foreground/70 font-medium">
                    {WEEKDAY_LABELS[d]}
                  </div>
                  {HOURS.map((h) => {
                    const cell = grid[d][h];
                    const style = getIntensityStyle(cell.revenue, maxValue);
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div
                            className={`flex-1 h-8 md:h-10 rounded-lg cursor-default transition-all duration-300 hover:scale-[1.08] hover:z-10 ${style.bg} ${style.ring}`}
                          />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs bg-popover/95 backdrop-blur-xl border-border/50">
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
          <div className="flex items-center gap-3 mt-5 justify-center">
            <span className="text-[10px] text-muted-foreground/50">R$ 0</span>
            <div className="flex gap-1">
              {[
                "bg-muted/30",
                "bg-emerald-900/30",
                "bg-emerald-800/50",
                "bg-emerald-600/60",
                "bg-emerald-500/70",
              ].map((cls, i) => (
                <div key={i} className={`w-8 h-3 rounded-md ${cls} ring-1 ring-white/5`} />
              ))}
            </div>
            <span className="text-[10px] text-muted-foreground/50">
              R$ {(maxValue / 100).toFixed(0)}
            </span>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
