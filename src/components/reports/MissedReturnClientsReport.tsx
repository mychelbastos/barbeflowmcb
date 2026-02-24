import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props { tenantId: string; days?: number; }

export default function MissedReturnClientsReport({ tenantId, days = 30 }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-missed-return", tenantId, days],
    queryFn: async () => {
      const { data: bookings } = await supabase.from("bookings").select("customer_id, starts_at, customer:customer_id(name, phone)").eq("tenant_id", tenantId).eq("status", "completed").order("starts_at", { ascending: false });
      if (!bookings) return [];
      const latest: Record<string, { name: string; phone: string; lastVisit: string }> = {};
      for (const b of bookings) {
        if (latest[b.customer_id]) continue;
        const c = b.customer as any;
        latest[b.customer_id] = { name: c?.name || "—", phone: c?.phone || "", lastVisit: b.starts_at };
      }
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      return Object.entries(latest).filter(([, v]) => new Date(v.lastVisit) < cutoff).map(([id, v]) => ({ id, ...v, daysSince: Math.floor((Date.now() - new Date(v.lastVisit).getTime()) / 86400000) })).sort((a, b) => b.daysSince - a.daysSince);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum cliente com retorno pendente.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Cliente: d.name, Telefone: d.phone, "Último Atendimento": format(new Date(d.lastVisit), "dd/MM/yy"), "Dias sem Retorno": d.daysSince }))} columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Último Atendimento", label: "Último Atend." }, { key: "Dias sem Retorno", label: "Dias" }]} filename="retorno-pendente" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead className="text-right">Último Atend.</TableHead><TableHead className="text-right">Dias</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="text-right text-sm">{format(new Date(d.lastVisit), "dd/MM/yy")}</TableCell><TableCell className="text-right"><Badge variant={d.daysSince > 60 ? "destructive" : "secondary"} className="text-xs">{d.daysSince}d</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
