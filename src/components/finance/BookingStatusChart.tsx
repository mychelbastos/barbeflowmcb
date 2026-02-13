import { useMemo } from "react";
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

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 14,
  boxShadow: "0 12px 40px -8px hsl(var(--foreground) / 0.1)",
  padding: "12px 16px",
  backdropFilter: "blur(12px)",
};

export function BookingStatusChart({ allBookings, payments }: BookingStatusChartProps) {
  const statusData = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const b of allBookings) counts[b.status] = (counts[b.status] || 0) + 1;
    return Object.entries(counts)
      .filter(([status]) => STATUS_CONFIG[status])
      .map(([status, count]) => ({ name: STATUS_CONFIG[status].label, value: count, color: STATUS_CONFIG[status].color }))
      .sort((a, b) => b.value - a.value);
  }, [allBookings]);

  const paymentData = useMemo(() => {
    if (!payments || payments.length === 0) return [];
    const counts: Record<string, number> = {};
    for (const p of payments) counts[p.status] = (counts[p.status] || 0) + 1;
    return Object.entries(counts)
      .filter(([status]) => PAYMENT_CONFIG[status])
      .map(([status, count]) => ({ name: PAYMENT_CONFIG[status].label, value: count, color: PAYMENT_CONFIG[status].color }));
  }, [payments]);

  const total = allBookings.length;
  if (total === 0) return null;

  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
          <PieChartIcon className="h-4 w-4 text-blue-500" />
        </div>
        <h3 className="text-sm font-bold text-foreground tracking-tight">Status dos Agendamentos</h3>
      </div>
      <div className="p-4 md:p-5">
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Donut */}
          <div className="w-full md:w-1/2 relative">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={58} outerRadius={88} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.85} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }} itemStyle={{ color: "hsl(var(--foreground))", fontSize: 12, fontWeight: 600 }} formatter={(value: number, name: string) => [`${value} (${((value / total) * 100).toFixed(0)}%)`, name]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-3xl font-bold text-foreground tabular-nums">{total}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Total</p>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="w-full md:w-1/2 space-y-2.5">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm group p-1.5 rounded-lg hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors text-sm">{s.name}</span>
                </div>
                <span className="text-foreground tabular-nums font-semibold">
                  {s.value} <span className="text-muted-foreground text-xs font-medium">({((s.value / total) * 100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}

            {paymentData.length > 0 && (
              <div className="border-t border-border pt-3 mt-3">
                <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mb-2">Pagamentos Online</p>
                {paymentData.map((p, i) => (
                  <div key={i} className="flex items-center justify-between text-xs mb-1.5 p-1">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                      <span className="text-muted-foreground">{p.name}</span>
                    </div>
                    <span className="text-muted-foreground tabular-nums font-medium">{p.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
