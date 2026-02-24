import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function CashIncomeReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-cash-income", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("cash_entries").select("id, payment_method, amount_cents, occurred_at, source, notes").eq("tenant_id", tenantId).eq("kind", "income").gte("occurred_at", startDate).lt("occurred_at", endDate).order("occurred_at", { ascending: false }); return data||[]; }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma entrada.</div>;
  const methodLabels: Record<string,string> = { cash:"Dinheiro", pix:"Pix", credit_card:"Crédito", debit_card:"Débito", online:"Online" };
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Data:format(new Date(d.occurred_at),"dd/MM/yy HH:mm"),Pagamento:methodLabels[d.payment_method||""]||d.payment_method||"—",Valor:formatBRL(d.amount_cents),Obs:d.notes||""}))} columns={[{key:"Data",label:"Data"},{key:"Pagamento",label:"Pagamento"},{key:"Valor",label:"Valor"},{key:"Obs",label:"Obs"}]} filename="entradas-caixa"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="hidden md:table-cell">Obs</TableHead></TableRow></TableHeader><TableBody>{data.slice(0,100).map(d=>(<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.occurred_at),"dd/MM HH:mm")}</TableCell><TableCell className="text-sm">{methodLabels[d.payment_method||""]||d.payment_method||"—"}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.amount_cents)}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.notes||"—"}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
