import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function WeekdayRevenueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-weekday-revenue", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("starts_at, booking_items(total_price_cents)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const weekly = Array(7).fill(0);
      for (const b of bookings) { const d = new Date(b.starts_at).getDay(); weekly[d] += (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0); }
      return WEEKDAYS.map((name, i) => ({ name: name.substring(0, 3), value: weekly[i] / 100 }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis tickFormatter={v=>`R$${v}`} /><Tooltip formatter={(v:number)=>`R$ ${v.toLocaleString("pt-BR",{minimumFractionDigits:2})}`} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
  );
}
