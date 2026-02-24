import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard } from "./ReportCard";
import { Users, UserCheck } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#ef4444"];

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function ReturnRateReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-return-rate", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id, starts_at").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings?.length) return null;
      const visits: Record<string, number> = {};
      for (const b of bookings) { visits[b.customer_id] = (visits[b.customer_id] || 0) + 1; }
      const total = Object.keys(visits).length;
      const returned = Object.values(visits).filter(v => v > 1).length;
      return { total, returned, notReturned: total - returned, rate: total > 0 ? ((returned / total) * 100).toFixed(1) : "0" };
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const chartData = [{ name: "Retornaram", value: data.returned }, { name: "Não retornaram", value: data.notReturned }];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ReportCard icon={Users} label="Total Clientes" value={String(data.total)} />
        <ReportCard icon={UserCheck} label="Retornaram" value={String(data.returned)} changeType="positive" />
        <ReportCard icon={Users} label="Taxa de Retorno" value={`${data.rate}%`} />
      </div>
      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart><Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {chartData.map((_, i) => <Cell key={i} fill={COLORS[i]} />)}
          </Pie><Tooltip /><Legend /></PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
