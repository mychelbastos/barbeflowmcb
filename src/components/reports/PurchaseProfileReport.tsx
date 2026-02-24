import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function PurchaseProfileReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-purchase-profile", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id, customer:customer_id(name), booking_items(total_price_cents, type)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const grouped: Record<string, { name: string; services: number; products: number; serviceTotal: number; productTotal: number }> = {};
      for (const b of bookings) {
        const c = b.customer as any;
        if (!grouped[b.customer_id]) grouped[b.customer_id] = { name: c?.name || "—", services: 0, products: 0, serviceTotal: 0, productTotal: 0 };
        for (const i of (b.booking_items || []) as any[]) {
          if (i.type === "service") { grouped[b.customer_id].services++; grouped[b.customer_id].serviceTotal += i.total_price_cents || 0; }
          else if (i.type === "product") { grouped[b.customer_id].products++; grouped[b.customer_id].productTotal += i.total_price_cents || 0; }
        }
      }
      return Object.values(grouped).sort((a, b) => (b.serviceTotal + b.productTotal) - (a.serviceTotal + a.productTotal));
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const chartData = [
    { name: "Serviços", value: data.reduce((s, d) => s + d.serviceTotal, 0) / 100 },
    { name: "Produtos", value: data.reduce((s, d) => s + d.productTotal, 0) / 100 },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl p-4 h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis tickFormatter={v => `R$${v}`} /><Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} /></BarChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead className="text-right">Serviços</TableHead><TableHead className="text-right">Produtos</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.slice(0, 50).map((d, i) => (<TableRow key={i}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.serviceTotal)}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.productTotal)}</TableCell><TableCell className="text-right font-medium text-sm">{formatBRL(d.serviceTotal + d.productTotal)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
