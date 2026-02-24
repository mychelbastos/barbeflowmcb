import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { format } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function DailyRevenueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-daily-revenue", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("starts_at, booking_items(total_price_cents)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const daily: Record<string, number> = {};
      for (const b of bookings) { const d = format(new Date(b.starts_at), "yyyy-MM-dd"); daily[d] = (daily[d] || 0) + (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0); }
      return Object.entries(daily).sort().map(([date, total]) => ({ date, label: format(new Date(date), "dd/MM"), value: total / 100 }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="label" tick={{fontSize:10}} /><YAxis tickFormatter={v=>`R$${v}`} /><Tooltip formatter={(v:number)=>`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2})}`} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
    </div>
  );
}
