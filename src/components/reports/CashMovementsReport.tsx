import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function CashMovementsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-cash-movements", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("cash_entries").select("id, kind, source, amount_cents, occurred_at, notes").eq("tenant_id", tenantId).in("source", ["withdrawal", "supply", "manual"]).gte("occurred_at", startDate).lt("occurred_at", endDate).order("occurred_at", { ascending: false }); return data||[]; }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma movimentação.</div>;
  const sourceLabels: Record<string,string> = { withdrawal:"Sangria", supply:"Suprimento", manual:"Manual" };
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Data:format(new Date(d.occurred_at),"dd/MM/yy HH:mm"),Tipo:d.kind==="income"?"Entrada":"Saída",Origem:sourceLabels[d.source||""]||d.source||"—",Valor:formatBRL(d.amount_cents),Obs:d.notes||""}))} columns={[{key:"Data",label:"Data"},{key:"Tipo",label:"Tipo"},{key:"Origem",label:"Origem"},{key:"Valor",label:"Valor"},{key:"Obs",label:"Obs"}]} filename="movimentacoes-caixa"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Tipo</TableHead><TableHead>Origem</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.occurred_at),"dd/MM HH:mm")}</TableCell><TableCell><Badge variant={d.kind==="income"?"default":"destructive"} className="text-xs">{d.kind==="income"?"Entrada":"Saída"}</Badge></TableCell><TableCell className="text-sm">{sourceLabels[d.source||""]||d.source||"—"}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.amount_cents)}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
