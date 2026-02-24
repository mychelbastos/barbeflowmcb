import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function StaffWorkdaysReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-workdays", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("staff_id, starts_at, staff:staff_id(name)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const grouped: Record<string, { name: string; days: Set<string>; total: number }> = {};
      for (const b of bookings) { if (!b.staff_id) continue; const s = b.staff as any; if (!grouped[b.staff_id]) grouped[b.staff_id] = { name: s?.name || "—", days: new Set(), total: 0 }; grouped[b.staff_id].days.add(format(new Date(b.starts_at), "yyyy-MM-dd")); grouped[b.staff_id].total++; }
      return Object.entries(grouped).map(([id, v]) => ({ id, name: v.name, days: v.days.size, bookings: v.total, avg: v.days.size > 0 ? (v.total / v.days.size).toFixed(1) : "0" })).sort((a, b) => b.days - a.days);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Profissional: d.name, "Dias Trabalhados": d.days, Reservas: d.bookings, "Média/Dia": d.avg }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Dias Trabalhados",label:"Dias"},{key:"Reservas",label:"Reservas"},{key:"Média/Dia",label:"Média/Dia"}]} filename="dias-trabalhados" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Dias Trabalhados</TableHead><TableHead className="text-right">Reservas</TableHead><TableHead className="text-right">Média/Dia</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.days}</TableCell><TableCell className="text-right">{d.bookings}</TableCell><TableCell className="text-right">{d.avg}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
