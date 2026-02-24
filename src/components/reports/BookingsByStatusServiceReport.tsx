import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
const statusLabels: Record<string,string> = { completed:"Concluído", confirmed:"Confirmado", cancelled:"Cancelado", no_show:"Faltou" };
interface Props { tenantId: string; startDate: string; endDate: string; serviceId?: string; }
export default function BookingsByStatusServiceReport({ tenantId, startDate, endDate, serviceId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-status-service", tenantId, startDate, endDate, serviceId], queryFn: async () => { let q = supabase.from("bookings").select("status, service:service_id(name)").eq("tenant_id", tenantId).gte("starts_at", startDate).lt("starts_at", endDate); if (serviceId && serviceId !== "all") q = q.eq("service_id", serviceId); const { data } = await q; if (!data) return []; const counts: Record<string,number> = {}; for (const b of data) counts[b.status] = (counts[b.status]||0)+1; return Object.entries(counts).map(([k,v])=>({ name: statusLabels[k]||k, value: v })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="bg-card border border-border rounded-2xl p-4 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border"/><XAxis dataKey="name"/><YAxis/><Tooltip/><Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer></div>);
}
