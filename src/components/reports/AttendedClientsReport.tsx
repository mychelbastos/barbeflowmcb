import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportCard } from "./ReportCard";
import { Users, DollarSign } from "lucide-react";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function AttendedClientsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-attended-clients", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, customer_id, customer:customer_id(name, phone, email), booking_items(total_price_cents)")
        .eq("tenant_id", tenantId).eq("status", "completed")
        .gte("starts_at", startDate).lt("starts_at", endDate);
      if (!bookings) return [];
      const grouped: Record<string, { name: string; phone: string; email: string; visits: number; total: number }> = {};
      for (const b of bookings) {
        const c = b.customer as any;
        if (!grouped[b.customer_id]) grouped[b.customer_id] = { name: c?.name || "—", phone: c?.phone || "", email: c?.email || "", visits: 0, total: 0 };
        grouped[b.customer_id].visits += 1;
        grouped[b.customer_id].total += (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
      }
      return Object.entries(grouped).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const totalRevenue = data.reduce((s, d) => s + d.total, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Cliente: d.name, Telefone: d.phone, Email: d.email, Visitas: d.visits, Total: formatBRL(d.total) }))} columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Visitas", label: "Visitas" }, { key: "Total", label: "Total" }]} filename="clientes-atendidos" /></div>
      <div className="grid grid-cols-2 gap-3">
        <ReportCard icon={Users} label="Clientes Atendidos" value={String(data.length)} />
        <ReportCard icon={DollarSign} label="Faturamento Total" value={formatBRL(totalRevenue)} />
      </div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="text-right">Visitas</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email}</TableCell><TableCell className="text-right">{d.visits}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
