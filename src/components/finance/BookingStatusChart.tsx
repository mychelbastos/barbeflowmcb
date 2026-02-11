import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { PieChartIcon } from "lucide-react";

interface BookingStatusChartProps {
  allBookings: any[]; // all statuses in period
  payments: any[]; // payments in period
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
    <Card>
      <CardHeader className="pb-2 md:pb-4">
        <CardTitle className="text-base md:text-lg flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center">
            <PieChartIcon className="h-4 w-4 text-blue-400" />
          </div>
          Status dos Agendamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row items-center gap-4">
          {/* Booking status donut */}
          <div className="w-full md:w-1/2">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  formatter={(value: number, name: string) => [
                    `${value} (${((value / total) * 100).toFixed(0)}%)`,
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-xs text-zinc-500 -mt-2">
              Total: <span className="text-zinc-300 font-semibold">{total}</span>
            </p>
          </div>

          {/* Legend */}
          <div className="w-full md:w-1/2 space-y-2">
            {statusData.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s.color }} />
                  <span className="text-zinc-300">{s.name}</span>
                </div>
                <span className="text-zinc-400">
                  {s.value}{" "}
                  <span className="text-zinc-600">({((s.value / total) * 100).toFixed(0)}%)</span>
                </span>
              </div>
            ))}

            {/* Payment status mini-section */}
            {paymentData.length > 0 && (
              <>
                <div className="border-t border-zinc-800 pt-2 mt-3">
                  <p className="text-xs text-zinc-500 mb-2">Pagamentos Online</p>
                  {paymentData.map((p, i) => (
                    <div key={i} className="flex items-center justify-between text-sm mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className="text-zinc-400 text-xs">{p.name}</span>
                      </div>
                      <span className="text-zinc-500 text-xs">{p.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
