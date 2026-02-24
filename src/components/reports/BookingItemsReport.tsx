import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function BookingItemsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-booking-items", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("id, starts_at, customer:customer_id(name), booking_items(type, title, total_price_cents)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate).order("starts_at", { ascending: false });
      if (!bookings) return [];
      return bookings.map((b: any) => { const items = b.booking_items || []; const hasService = items.some((i:any) => i.type === "service"); const hasProduct = items.some((i:any) => i.type === "product"); return { id: b.id, date: b.starts_at, customer: b.customer?.name || "—", total: items.reduce((s:number,i:any) => s + (i.total_price_cents || 0), 0), types: [hasService && "Serviço", hasProduct && "Produto"].filter(Boolean).join(" + ") || "Outro", itemCount: items.length }; });
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, Tipos: d.types, Itens: d.itemCount, Total: formatBRL(d.total) }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Tipos",label:"Tipos"},{key:"Itens",label:"Itens"},{key:"Total",label:"Total"}]} filename="comandas-itens" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Tipos</TableHead><TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.slice(0,100).map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{d.types}</Badge></TableCell><TableCell className="text-right">{d.itemCount}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
