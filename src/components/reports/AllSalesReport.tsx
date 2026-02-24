import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function AllSalesReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-all-sales", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("booking_items").select("id, title, type, quantity, total_price_cents, booking:booking_id(starts_at, customer:customer_id(name))").eq("tenant_id", tenantId);
      if (!data) return [];
      return data.filter((i: any) => { const d = i.booking?.starts_at; return d && d >= startDate && d < endDate; }).map((i: any) => ({ id: i.id, date: i.booking?.starts_at, customer: i.booking?.customer?.name || "—", title: i.title, type: i.type, qty: i.quantity, total: i.total_price_cents })).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  const typeLabels: Record<string,string> = { service: "Serviço", product: "Produto", extra_service: "Extra" };
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, Item: d.title, Tipo: typeLabels[d.type]||d.type, Qtd: d.qty, Total: formatBRL(d.total) }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Item",label:"Item"},{key:"Tipo",label:"Tipo"},{key:"Qtd",label:"Qtd"},{key:"Total",label:"Total"}]} filename="vendas-geral" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Item</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.slice(0,100).map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="text-sm">{d.customer}</TableCell><TableCell className="font-medium text-sm">{d.title}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{typeLabels[d.type]||d.type}</Badge></TableCell><TableCell className="text-right text-sm">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
