import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function DailyBookingsCountReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-daily-bookings", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("starts_at").eq("tenant_id", tenantId).neq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate); if (!data) return []; const daily: Record<string,number> = {}; for (const b of data) { const d = format(new Date(b.starts_at), "yyyy-MM-dd"); daily[d] = (daily[d]||0)+1; } return Object.entries(daily).sort().map(([date,count])=>({ date, label: format(new Date(date), "dd/MM"), value: count })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="bg-card border border-border rounded-2xl p-4 h-[350px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border"/><XAxis dataKey="label" tick={{fontSize:10}}/><YAxis/><Tooltip/><Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer></div>);
}
