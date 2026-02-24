import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
const COLORS = ["hsl(var(--primary))", "#3b82f6"];
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function BookingsByOriginReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-bookings-origin", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("created_via").eq("tenant_id", tenantId).neq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate); if (!data) return []; const counts: Record<string,number> = {}; for (const b of data) { const v = b.created_via || "admin"; counts[v] = (counts[v]||0)+1; } const labels: Record<string,string> = { public: "Agendamento Online", admin: "Painel Admin" }; return Object.entries(counts).map(([k,v]) => ({ name: labels[k]||k, value: v })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`}>{data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer></div>);
}
