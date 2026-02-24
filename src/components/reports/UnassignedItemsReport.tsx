import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function UnassignedItemsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-unassigned-items", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("booking_items").select("id, title, type, total_price_cents, staff_id, booking:booking_id(starts_at, customer:customer_id(name))").eq("tenant_id", tenantId).is("staff_id", null);
      if (!data) return [];
      return data.filter((i: any) => { const d = i.booking?.starts_at; return d && d >= startDate && d < endDate; }).map((i: any) => ({ id: i.id, date: i.booking?.starts_at, customer: i.booking?.customer?.name || "—", title: i.title, type: i.type, total: i.total_price_cents }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Todos os itens possuem profissional.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, Item: d.title, Tipo: d.type, Total: formatBRL(d.total) }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Item",label:"Item"},{key:"Tipo",label:"Tipo"},{key:"Total",label:"Total"}]} filename="itens-sem-prof" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Item</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="text-sm">{d.customer}</TableCell><TableCell className="font-medium text-sm">{d.title}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
