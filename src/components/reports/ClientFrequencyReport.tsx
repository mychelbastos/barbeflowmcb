import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard } from "./ReportCard";
import { Users } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props { tenantId: string; startDate: string; endDate: string; }

const BANDS = [{ label: "1 visita", min: 1, max: 1 }, { label: "2-3", min: 2, max: 3 }, { label: "4-6", min: 4, max: 6 }, { label: "7-12", min: 7, max: 12 }, { label: "13+", min: 13, max: Infinity }];

export default function ClientFrequencyReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-client-frequency", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const counts: Record<string, number> = {};
      for (const b of bookings) counts[b.customer_id] = (counts[b.customer_id] || 0) + 1;
      return BANDS.map(band => ({ name: band.label, count: Object.values(counts).filter(v => v >= band.min && v <= band.max).length }));
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const totalClients = data.reduce((s, d) => s + d.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ReportCard icon={Users} label="Total Clientes" value={String(totalClients)} /></div>
      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Clientes" /></BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
