import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface Props { tenantId: string; }
export default function ServicePriceListReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-service-prices", tenantId], queryFn: async () => { const { data } = await supabase.from("services").select("id, name, price_cents, duration_minutes").eq("tenant_id", tenantId).eq("active", true).order("name"); return data||[]; }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum serviço.</div>;
  return (<div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead className="text-right">Duração</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right text-sm">{d.duration_minutes}min</TableCell><TableCell className="text-right text-sm">{formatBRL(d.price_cents)}</TableCell></TableRow>))}</TableBody></Table></div>);
}
