import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function CommissionsPaidReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-commissions-paid", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("staff_payments").select("id, amount_cents, type, paid_at, notes, staff:staff_id(name)").eq("tenant_id", tenantId).eq("status", "paid").gte("paid_at", startDate).lt("paid_at", endDate).order("paid_at", { ascending: false });
      return (data || []).map((p: any) => ({ id: p.id, staff: p.staff?.name || "—", amount: p.amount_cents, type: p.type, paidAt: p.paid_at, notes: p.notes }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma comissão paga no período.</div>;
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Profissional: d.staff, Valor: formatBRL(d.amount), Tipo: d.type, Data: d.paidAt ? format(new Date(d.paidAt), "dd/MM/yy") : "—", Obs: d.notes || "" }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Valor",label:"Valor"},{key:"Tipo",label:"Tipo"},{key:"Data",label:"Data"},{key:"Obs",label:"Obs"}]} filename="comissoes-pagas" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Tipo</TableHead><TableHead>Data</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.staff}</TableCell><TableCell className="text-sm">{d.type}</TableCell><TableCell className="text-sm">{d.paidAt ? format(new Date(d.paidAt), "dd/MM/yy") : "—"}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.amount)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
