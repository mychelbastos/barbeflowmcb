import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981"];
const sourceLabels: Record<string,string> = { withdrawal: "Sangria", expense: "Despesa", payout: "Pagamento", fee: "Taxa", manual: "Manual" };

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function ExpenseByCategoryReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-expense-category", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("cash_entries").select("source, amount_cents").eq("tenant_id", tenantId).eq("kind", "expense").gte("occurred_at", startDate).lt("occurred_at", endDate);
      if (!data) return [];
      const grouped: Record<string, number> = {};
      for (const e of data) { const s = e.source || "other"; grouped[s] = (grouped[s] || 0) + e.amount_cents; }
      return Object.entries(grouped).map(([source, total]) => ({ name: sourceLabels[source] || source, value: total / 100 })).sort((a, b) => b.value - a.value);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma despesa no período.</div>;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name, percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]} />)}</Pie><Tooltip formatter={(v:number)=>formatBRL(v*100)} /><Legend /></PieChart></ResponsiveContainer></div>
  );
}
