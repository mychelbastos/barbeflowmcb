import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
interface Props { tenantId: string; }
export default function ActivePackagesReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-active-packages", tenantId], queryFn: async () => { const { data } = await supabase.from("customer_packages").select("id, sessions_used, sessions_total, status, customer:customer_id(name, phone), package:package_id(name)").eq("tenant_id", tenantId).eq("status", "active"); return (data||[]).map((p:any)=>({ id: p.id, customer: p.customer?.name||"—", phone: p.customer?.phone||"", package: p.package?.name||"—", sessions: `${p.sessions_used}/${p.sessions_total}`, remaining: p.sessions_total - p.sessions_used })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum pacote ativo.</div>;
  return (<div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Pacote</TableHead><TableHead className="text-right">Sessões</TableHead><TableHead className="text-right">Restante</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-sm">{d.package}</TableCell><TableCell className="text-right text-sm">{d.sessions}</TableCell><TableCell className="text-right"><Badge variant={d.remaining<=1?"destructive":"secondary"} className="text-xs">{d.remaining}</Badge></TableCell></TableRow>))}</TableBody></Table></div>);
}
