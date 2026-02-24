import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
const COLORS = ["#10b981","hsl(var(--primary))","#ef4444","#f59e0b"];
const statusLabels: Record<string,string> = { completed:"Concluído", confirmed:"Confirmado", cancelled:"Cancelado", no_show:"Faltou" };
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function BookingsByStatusReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-bookings-status", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("status").eq("tenant_id", tenantId).gte("starts_at", startDate).lt("starts_at", endDate); if (!data) return []; const counts: Record<string,number> = {}; for (const b of data) counts[b.status] = (counts[b.status]||0)+1; return Object.entries(counts).map(([k,v])=>({ name: statusLabels[k]||k, value: v })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>);
}
