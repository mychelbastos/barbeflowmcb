import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function SoldPackagesReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-sold-packages", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("customer_packages").select("id, purchased_at, sessions_total, sessions_used, customer:customer_id(name), package:package_id(name, price_cents)").eq("tenant_id", tenantId).gte("purchased_at", startDate).lt("purchased_at", endDate).order("purchased_at", { ascending: false }); return (data||[]).map((p:any)=>({ id: p.id, date: p.purchased_at, customer: p.customer?.name||"—", package: p.package?.name||"—", price: p.package?.price_cents||0, sessions: `${p.sessions_used}/${p.sessions_total}` })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum pacote vendido.</div>;
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Data:format(new Date(d.date),"dd/MM/yy"),Cliente:d.customer,Pacote:d.package,Valor:formatBRL(d.price),Sessões:d.sessions}))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Pacote",label:"Pacote"},{key:"Valor",label:"Valor"},{key:"Sessões",label:"Sessões"}]} filename="pacotes-vendidos"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Pacote</TableHead><TableHead className="text-right">Valor</TableHead><TableHead className="text-right">Sessões</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date),"dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-sm">{d.package}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.price)}</TableCell><TableCell className="text-right text-sm">{d.sessions}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
