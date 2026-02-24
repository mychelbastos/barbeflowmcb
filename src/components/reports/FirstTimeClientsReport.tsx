import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function FirstTimeClientsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-first-time-clients", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("id, customer_id, starts_at, customer:customer_id(name, phone, created_at), booking_items(total_price_cents)").eq("tenant_id", tenantId).eq("status", "completed").gte("starts_at", startDate).lt("starts_at", endDate).order("starts_at");
      if (!bookings) return [];
      // Find customers whose first booking ever is within the period
      const firstSeen: Record<string, any> = {};
      for (const b of bookings) {
        if (!firstSeen[b.customer_id]) {
          const c = b.customer as any;
          firstSeen[b.customer_id] = { id: b.customer_id, name: c?.name || "—", phone: c?.phone || "", firstDate: b.starts_at, total: 0 };
        }
        firstSeen[b.customer_id].total += (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
      }
      // Check if they had bookings before the period
      const ids = Object.keys(firstSeen);
      if (!ids.length) return [];
      const { data: prior } = await supabase.from("bookings").select("customer_id").eq("tenant_id", tenantId).eq("status", "completed").lt("starts_at", startDate).in("customer_id", ids);
      const priorSet = new Set((prior || []).map(b => b.customer_id));
      return Object.values(firstSeen).filter((c: any) => !priorSet.has(c.id));
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum cliente novo atendido no período.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map((d: any) => ({ Cliente: d.name, Telefone: d.phone, "Primeiro Atendimento": format(new Date(d.firstDate), "dd/MM/yy"), Total: formatBRL(d.total) }))} columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Primeiro Atendimento", label: "1º Atendimento" }, { key: "Total", label: "Total" }]} filename="clientes-novos-servico" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead>1º Atendimento</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
          <TableBody>{data.map((d: any) => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="text-sm">{format(new Date(d.firstDate), "dd/MM/yy")}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
