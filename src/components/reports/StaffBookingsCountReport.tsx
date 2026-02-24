import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard } from "./ReportCard";
import { CalendarDays } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function StaffBookingsCountReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-bookings-count", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("staff_id, staff:staff_id(name)").eq("tenant_id", tenantId).neq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const grouped: Record<string, { name: string; count: number }> = {};
      for (const b of bookings) { if (!b.staff_id) continue; const s = b.staff as any; if (!grouped[b.staff_id]) grouped[b.staff_id] = { name: s?.name || "—", count: 0 }; grouped[b.staff_id].count++; }
      return Object.values(grouped).sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ReportCard icon={CalendarDays} label="Total Agendamentos" value={String(data.reduce((s,d) => s+d.count, 0))} /></div>
      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" tick={{fontSize:11}} /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[6,6,0,0]} name="Agendamentos" /></BarChart></ResponsiveContainer>
      </div>
    </div>
  );
}
