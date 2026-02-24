import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function CourtesyReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-courtesy", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("booking_items").select("id, title, total_price_cents, booking_id, staff:staff_id(name), booking:booking_id(starts_at, customer:customer_id(name, phone))").eq("tenant_id", tenantId).eq("paid_status", "covered");
      if (!data) return [];
      return data.filter((i: any) => { const d = i.booking?.starts_at; return d && d >= startDate && d < endDate; }).map((i: any) => ({ id: i.id, date: i.booking?.starts_at, customer: i.booking?.customer?.name || "—", phone: i.booking?.customer?.phone || "", service: i.title, staff: i.staff?.name || "—", value: i.total_price_cents }));
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma cortesia no período.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, Serviço: d.service, Profissional: d.staff, Valor: formatBRL(d.value) }))} columns={[{ key: "Data", label: "Data" }, { key: "Cliente", label: "Cliente" }, { key: "Serviço", label: "Serviço" }, { key: "Profissional", label: "Profissional" }, { key: "Valor", label: "Valor" }]} filename="cortesias" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead className="hidden md:table-cell">Profissional</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-sm">{d.service}</TableCell><TableCell className="hidden md:table-cell text-sm">{d.staff}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.value)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
