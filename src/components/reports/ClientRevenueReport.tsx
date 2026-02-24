import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function ClientRevenueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-client-revenue", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id, customer:customer_id(name, phone), booking_items(total_price_cents)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const grouped: Record<string, { name: string; phone: string; orders: number; revenue: number }> = {};
      for (const b of bookings) { const c = b.customer as any; if (!grouped[b.customer_id]) grouped[b.customer_id] = { name: c?.name || "—", phone: c?.phone || "", orders: 0, revenue: 0 }; grouped[b.customer_id].orders++; grouped[b.customer_id].revenue += (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0); }
      return Object.entries(grouped).map(([id, v]) => ({ id, ...v, ticket: v.orders > 0 ? Math.round(v.revenue / v.orders) : 0 })).sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Cliente: d.name, Telefone: d.phone, Comandas: d.orders, Faturamento: formatBRL(d.revenue), "Ticket Médio": formatBRL(d.ticket) }))} columns={[{key:"Cliente",label:"Cliente"},{key:"Telefone",label:"Telefone"},{key:"Comandas",label:"Comandas"},{key:"Faturamento",label:"Faturamento"},{key:"Ticket Médio",label:"Ticket Médio"}]} filename="faturamento-clientes" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="hidden md:table-cell">Telefone</TableHead><TableHead className="text-right">Comandas</TableHead><TableHead className="text-right">Faturamento</TableHead><TableHead className="text-right">Ticket Médio</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="hidden md:table-cell text-sm">{d.phone}</TableCell><TableCell className="text-right">{d.orders}</TableCell><TableCell className="text-right">{formatBRL(d.revenue)}</TableCell><TableCell className="text-right">{formatBRL(d.ticket)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
