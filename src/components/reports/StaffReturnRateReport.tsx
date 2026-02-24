import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props { tenantId: string; startDate: string; endDate: string; staffId?: string; }

export default function StaffReturnRateReport({ tenantId, startDate, endDate, staffId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-return-rate", tenantId, startDate, endDate, staffId],
    queryFn: async () => {
      let q = supabase.from("bookings").select("customer_id, staff_id, staff:staff_id(name)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (staffId && staffId !== "all") q = q.eq("staff_id", staffId);
      const { data: bookings } = await q;
      if (!bookings) return [];
      const byStaff: Record<string, { name: string; customers: Record<string, number> }> = {};
      for (const b of bookings) { if (!b.staff_id) continue; const s = b.staff as any; if (!byStaff[b.staff_id]) byStaff[b.staff_id] = { name: s?.name || "—", customers: {} }; byStaff[b.staff_id].customers[b.customer_id] = (byStaff[b.staff_id].customers[b.customer_id] || 0) + 1; }
      return Object.entries(byStaff).map(([id, v]) => { const total = Object.keys(v.customers).length; const returned = Object.values(v.customers).filter(c => c > 1).length; return { id, name: v.name, total, returned, rate: total > 0 ? ((returned/total)*100).toFixed(1) : "0" }; }).sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Profissional: d.name, "Total Clientes": d.total, Retornaram: d.returned, "Taxa %": d.rate + "%" }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Total Clientes",label:"Total"},{key:"Retornaram",label:"Retornaram"},{key:"Taxa %",label:"Taxa"}]} filename="retorno-profissional" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Clientes</TableHead><TableHead className="text-right">Retornaram</TableHead><TableHead className="text-right">Taxa</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.total}</TableCell><TableCell className="text-right">{d.returned}</TableCell><TableCell className="text-right"><Badge variant="secondary" className="text-xs">{d.rate}%</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
