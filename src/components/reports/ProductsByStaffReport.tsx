import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; staffId?: string; }
export default function ProductsByStaffReport({ tenantId, startDate, endDate, staffId }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-products-staff", tenantId, startDate, endDate, staffId], queryFn: async () => { let q = supabase.from("product_sales").select("quantity, sale_price_snapshot_cents, product:product_id(name), staff:staff_id(name)").eq("tenant_id", tenantId).gte("sale_date", startDate).lt("sale_date", endDate); if (staffId && staffId !== "all") q = q.eq("staff_id", staffId); const { data } = await q; return (data||[]).map((s:any)=>({ product: s.product?.name||"—", staff: s.staff?.name||"—", qty: s.quantity, total: s.sale_price_snapshot_cents*s.quantity })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Profissional:d.staff,Produto:d.product,Qtd:d.qty,Total:formatBRL(d.total)}))} columns={[{key:"Profissional",label:"Prof."},{key:"Produto",label:"Produto"},{key:"Qtd",label:"Qtd"},{key:"Total",label:"Total"}]} filename="produtos-por-prof"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead>Produto</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.map((d,i)=>(<TableRow key={i}><TableCell className="text-sm">{d.staff}</TableCell><TableCell className="font-medium text-sm">{d.product}</TableCell><TableCell className="text-right">{d.qty}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
