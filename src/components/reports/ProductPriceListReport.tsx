import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface Props { tenantId: string; }
export default function ProductPriceListReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-product-prices", tenantId], queryFn: async () => { const { data } = await supabase.from("products").select("id, name, purchase_price_cents, sale_price_cents").eq("tenant_id", tenantId).eq("active", true).order("name"); return (data||[]).map(p=>({...p, margin: p.sale_price_cents > 0 ? (((p.sale_price_cents-p.purchase_price_cents)/p.sale_price_cents)*100).toFixed(1) : "0" })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum produto.</div>;
  return (<div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Produto</TableHead><TableHead className="text-right">Custo</TableHead><TableHead className="text-right">Venda</TableHead><TableHead className="text-right">Margem</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.purchase_price_cents)}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.sale_price_cents)}</TableCell><TableCell className="text-right text-sm">{d.margin}%</TableCell></TableRow>))}</TableBody></Table></div>);
}
