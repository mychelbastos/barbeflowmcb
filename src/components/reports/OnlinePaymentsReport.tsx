import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function OnlinePaymentsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-online-payments", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("payments").select("id, amount_cents, status, provider, external_id, created_at, booking:booking_id(customer:customer_id(name))").eq("tenant_id", tenantId).gte("created_at", startDate).lt("created_at", endDate).order("created_at", { ascending: false });
      return (data || []).map((p: any) => ({ id: p.id, date: p.created_at, customer: p.booking?.customer?.name || "—", amount: p.amount_cents, status: p.status, provider: p.provider }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum pagamento online no período.</div>;
  const statusLabels: Record<string,string> = { approved: "Aprovado", pending: "Pendente", rejected: "Rejeitado", expired: "Expirado" };
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, Valor: formatBRL(d.amount), Status: statusLabels[d.status]||d.status, Provedor: d.provider }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Valor",label:"Valor"},{key:"Status",label:"Status"},{key:"Provedor",label:"Provedor"}]} filename="pagamentos-online" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead className="text-right">Valor</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.amount)}</TableCell><TableCell><Badge variant={d.status==="approved"?"default":"secondary"} className="text-xs">{statusLabels[d.status]||d.status}</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
