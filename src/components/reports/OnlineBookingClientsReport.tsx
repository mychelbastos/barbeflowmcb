import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function OnlineBookingClientsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-online-booking-clients", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id, starts_at, customer:customer_id(name, phone, email)").eq("tenant_id", tenantId).eq("created_via", "public").gte("starts_at", startDate).lt("starts_at", endDate).order("starts_at", { ascending: false });
      if (!bookings) return [];
      const seen = new Set<string>();
      return bookings.filter(b => { if (seen.has(b.customer_id)) return false; seen.add(b.customer_id); return true; }).map(b => { const c = b.customer as any; return { id: b.customer_id, name: c?.name || "—", phone: c?.phone || "", email: c?.email || "", lastOnline: b.starts_at }; });
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum agendamento online no período.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Cliente: d.name, Telefone: d.phone, Email: d.email, "Último Online": format(new Date(d.lastOnline), "dd/MM/yy") }))} columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Último Online", label: "Último Online" }]} filename="clientes-agendamento-online" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead>Último Online</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell><TableCell className="text-sm">{format(new Date(d.lastOnline), "dd/MM/yy")}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
