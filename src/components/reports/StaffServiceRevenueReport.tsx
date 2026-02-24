import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function StaffServiceRevenueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-service-revenue", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("booking_items").select("total_price_cents, type, staff:staff_id(name), booking:booking_id(starts_at, service:service_id(name))").eq("tenant_id", tenantId).eq("type", "service");
      if (!data) return [];
      return data.filter((i: any) => { const d = i.booking?.starts_at; return d && d >= startDate && d < endDate; }).reduce((acc: any[], i: any) => { const key = `${i.staff?.name || "—"}_${i.booking?.service?.name || "—"}`; const existing = acc.find((a: any) => a.key === key); if (existing) { existing.total += i.total_price_cents; existing.count++; } else { acc.push({ key, staff: i.staff?.name || "—", service: i.booking?.service?.name || "—", total: i.total_price_cents, count: 1 }); } return acc; }, []).sort((a: any, b: any) => b.total - a.total);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map((d:any) => ({ Profissional: d.staff, Serviço: d.service, Qtd: d.count, Faturamento: formatBRL(d.total) }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Serviço",label:"Serviço"},{key:"Qtd",label:"Qtd"},{key:"Faturamento",label:"Faturamento"}]} filename="fat-servico-prof" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Serviço</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Faturamento</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((d:any,i:number) => (<TableRow key={i}><TableCell className="text-sm">{d.staff}</TableCell><TableCell className="font-medium text-sm">{d.service}</TableCell><TableCell className="text-right">{d.count}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
