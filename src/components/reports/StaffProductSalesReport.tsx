import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function StaffProductSalesReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-product-sales", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("product_sales").select("quantity, sale_price_snapshot_cents, staff:staff_id(name), product:product_id(name)").eq("tenant_id", tenantId).gte("sale_date", startDate).lt("sale_date", endDate);
      if (!data) return [];
      const grouped: Record<string, { name: string; qty: number; total: number }> = {};
      for (const s of data as any[]) { const n = s.staff?.name || "Sem prof."; const key = n; if (!grouped[key]) grouped[key] = { name: n, qty: 0, total: 0 }; grouped[key].qty += s.quantity; grouped[key].total += s.sale_price_snapshot_cents * s.quantity; }
      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma venda no período.</div>;
  const chartData = data.map(d => ({ name: d.name.split(" ")[0], value: d.total / 100 }));
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Profissional: d.name, Quantidade: d.qty, Faturamento: formatBRL(d.total) }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Quantidade",label:"Qtd"},{key:"Faturamento",label:"Faturamento"}]} filename="prof-produtos" /></div>
      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis tickFormatter={v=>`R$${v}`} /><Tooltip /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Faturamento</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((d,i) => (<TableRow key={i}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.qty}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
