import { useMemo } from "react";
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
const HOURS = Array.from({ length: 14 }, (_, i) => i + 8);

function getIntensityStyle(value: number, max: number): string {
  if (value === 0 || max === 0) return "bg-zinc-800/20";
  const ratio = value / max;
  if (ratio <= 0.25) return "bg-emerald-900/25 ring-1 ring-emerald-800/15";
  if (ratio <= 0.5) return "bg-emerald-800/40 ring-1 ring-emerald-700/20";
  if (ratio <= 0.75) return "bg-emerald-600/50 ring-1 ring-emerald-500/25";
  return "bg-emerald-500/60 ring-1 ring-emerald-400/30 shadow-sm shadow-emerald-500/10";
}

export function RevenueHeatmap({ bookings }: HeatmapProps) {
  const { grid, maxValue } = useMemo(() => {
    const g: Record<number, Record<number, { revenue: number; count: number }>> = {};
    for (let d = 0; d < 7; d++) { g[d] = {}; for (const h of HOURS) g[d][h] = { revenue: 0, count: 0 }; }
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
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/30">
        <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
          <Flame className="h-4 w-4 text-amber-400" />
        </div>
        <h3 className="text-sm font-bold text-zinc-100 tracking-tight">
          Mapa de Calor — Receita por Dia e Horário
        </h3>
      </div>
      <div className="p-4 md:p-5">
        <TooltipProvider delayDuration={80}>
          <div className="overflow-x-auto">
            <div className="min-w-[600px]">
              {/* Hour headers */}
              <div className="flex items-center mb-2">
                <div className="w-10 flex-shrink-0" />
                {HOURS.map((h) => (
                  <div key={h} className="flex-1 text-center text-[10px] font-bold text-zinc-600 tabular-nums">
                    {h}h
                  </div>
                ))}
              </div>

              {/* Rows */}
              {activeWeekdays.map((d) => (
                <div key={d} className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-10 flex-shrink-0 text-[11px] text-zinc-500 font-semibold">
                    {WEEKDAY_LABELS[d]}
                  </div>
                  {HOURS.map((h) => {
                    const cell = grid[d][h];
                    const style = getIntensityStyle(cell.revenue, maxValue);
                    return (
                      <Tooltip key={h}>
                        <TooltipTrigger asChild>
                          <div className={`flex-1 h-8 md:h-10 rounded-lg cursor-default transition-all duration-300 hover:scale-[1.12] hover:z-10 ${style}`} />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs bg-zinc-900/95 backdrop-blur-xl border-zinc-800/50 shadow-xl">
                          <p className="font-bold text-zinc-100">{WEEKDAY_LABELS[d]}, {h}h</p>
                          <p className="text-zinc-400">Faturamento: R$ {(cell.revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                          <p className="text-zinc-400">Atendimentos: {cell.count}</p>
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
            <span className="text-[10px] text-zinc-600 font-medium">R$ 0</span>
            <div className="flex gap-1">
              {["bg-zinc-800/20", "bg-emerald-900/25", "bg-emerald-800/40", "bg-emerald-600/50", "bg-emerald-500/60"].map((cls, i) => (
                <div key={i} className={`w-8 h-3.5 rounded-md ${cls}`} />
              ))}
            </div>
            <span className="text-[10px] text-zinc-600 font-medium">R$ {(maxValue / 100).toFixed(0)}</span>
          </div>
        </TooltipProvider>
      </div>
    </div>
  );
}
