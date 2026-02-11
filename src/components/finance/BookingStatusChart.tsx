import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";
import { PieChartIcon } from "lucide-react";

interface BookingStatusChartProps {
  allBookings: any[];
  payments: any[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  completed: { label: "Concluído", color: "#10b981" },
  confirmed: { label: "Confirmado", color: "#3b82f6" },
  cancelled: { label: "Cancelado", color: "#ef4444" },
  no_show: { label: "Faltou", color: "#f59e0b" },
};

const PAYMENT_CONFIG: Record<string, { label: string; color: string }> = {
  paid: { label: "Aprovado", color: "#10b981" },
  approved: { label: "Aprovado", color: "#10b981" },
  pending: { label: "Pendente", color: "#f59e0b" },
  rejected: { label: "Rejeitado", color: "#ef4444" },
};

export function BookingStatusChart({ allBookings, payments }: BookingStatusChartProps) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of allBookings) {
      counts[b.status] = (counts[b.status] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([status]) => STATUS_CONFIG[status])
      .map(([status, count]) => ({
        name: STATUS_CONFIG[status].label,
        value: count,
        color: STATUS_CONFIG[status].color,
      }))
      .sort((a, b) => b.value - a.value);
  }, [allBookings]);

  const paymentData = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const p of payments) {
      counts[p.status] = (counts[p.status] || 0) + 1;
    }
    return Object.entries(counts)
      .filter(([status]) => PAYMENT_CONFIG[status])
      .map(([status, count]) => ({
        name: PAYMENT_CONFIG[status].label,
        value: count,
        color: PAYMENT_CONFIG[status].color,
      }));
  }, [payments]);

  const total = allBookings.length;

  if (total === 0) return null;

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="pb-2 md:pb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center ring-1 ring-blue-500/20">
            <PieChartIcon className="h-4 w-4 text-blue-400" />
          </div>
          <CardTitle className="text-base md:text-lg tracking-tight">
            Status dos Agendamentos
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Donut */}
          <div className="w-full md:w-1/2 relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 5% 10%)",
                    border: "1px solid hsl(240 4% 20%)",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px -8px hsl(0 0% 0% / 0.5)",
                  }}
                  formatter={(value: number, name: string) => [
                    `${value} (${((value / total) * 100).toFixed(0)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-2xl font-bold text-foreground tabular-nums">{total}</p>
                <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">Total</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full md:w-1/2 space-y-2.5">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm group">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full ring-2 ring-white/5" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">{s.name}</span>
                </div>
                <span className="text-foreground tabular-nums font-medium">
                  {s.value}{" "}
                  <span className="text-muted-foreground/50 text-xs">({((s.value / total) * 100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}

            {/* Payment status */}
            {paymentData.length > 0 && (
              <div className="border-t border-border/30 pt-3 mt-3">
                <p className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground/50 mb-2">Pagamentos Online</p>
                {paymentData.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums">{p.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
