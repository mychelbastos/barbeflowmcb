import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#f59e0b", "#10b981"];
const typeLabels: Record<string,string> = { service: "Serviço", product: "Produto", extra_service: "Serviço Extra", extra: "Extra" };

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function RevenueByItemTypeReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-revenue-by-item", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("booking_items").select("type, total_price_cents, booking:booking_id(starts_at)").eq("tenant_id", tenantId);
      if (!data) return [];
      const grouped: Record<string, number> = {};
      for (const i of data as any[]) { const d = i.booking?.starts_at; if (!d || d < startDate || d >= endDate) continue; const t = i.type || "other"; grouped[t] = (grouped[t] || 0) + i.total_price_cents; }
      return Object.entries(grouped).map(([type, total]) => ({ name: typeLabels[type] || type, value: total / 100 })).sort((a, b) => b.value - a.value);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={(v:number)=>formatBRL(v*100)} /><Legend /></PieChart></ResponsiveContainer></div>
  );
}
