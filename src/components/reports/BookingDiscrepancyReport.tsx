import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function BookingDiscrepancyReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-booking-discrepancy", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("id, starts_at, customer:customer_id(name), booking_items(title, total_price_cents, paid_status)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const results: any[] = [];
      for (const b of bookings as any[]) {
        const items = b.booking_items || [];
        const totalItems = items.reduce((s:number, i:any) => s + (i.total_price_cents || 0), 0);
        const paidItems = items.filter((i:any) => i.paid_status === "paid").reduce((s:number, i:any) => s + (i.total_price_cents || 0), 0);
        if (totalItems !== paidItems) results.push({ id: b.id, date: b.starts_at, customer: b.customer?.name || "—", totalItems, paidItems, diff: totalItems - paidItems });
      }
      return results.sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma discrepância encontrada.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, "Total Itens": formatBRL(d.totalItems), "Total Pago": formatBRL(d.paidItems), Diferença: formatBRL(d.diff) }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Total Itens",label:"Total Itens"},{key:"Total Pago",label:"Total Pago"},{key:"Diferença",label:"Diferença"}]} filename="discrepancias" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Total Itens</TableHead><TableHead className="text-right">Total Pago</TableHead><TableHead className="text-right">Diferença</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.totalItems)}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.paidItems)}</TableCell><TableCell className="text-right"><Badge variant="destructive" className="text-xs">{formatBRL(d.diff)}</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
