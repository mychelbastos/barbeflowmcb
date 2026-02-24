import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface Props { tenantId: string; }
export default function PackagePriceListReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-package-prices", tenantId], queryFn: async () => { const { data } = await supabase.from("service_packages").select("id, name, price_cents, total_sessions").eq("tenant_id", tenantId).eq("active", true).order("name"); return data||[]; }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum pacote.</div>;
  return (<div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Pacote</TableHead><TableHead className="text-right">Sessões</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.total_sessions}</TableCell><TableCell className="text-right">{formatBRL(d.price_cents)}</TableCell></TableRow>))}</TableBody></Table></div>);
}
