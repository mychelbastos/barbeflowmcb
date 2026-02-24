import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function SoldProductsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-sold-products", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("product_sales").select("id, quantity, sale_price_snapshot_cents, sale_date, product:product_id(name), staff:staff_id(name)").eq("tenant_id", tenantId).gte("sale_date", startDate).lt("sale_date", endDate).order("sale_date", { ascending: false }); return (data||[]).map((s:any)=>({ id: s.id, date: s.sale_date, product: s.product?.name||"—", staff: s.staff?.name||"—", qty: s.quantity, total: s.sale_price_snapshot_cents * s.quantity })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma venda.</div>;
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Data:format(new Date(d.date),"dd/MM/yy"),Produto:d.product,Profissional:d.staff,Qtd:d.qty,Total:formatBRL(d.total)}))} columns={[{key:"Data",label:"Data"},{key:"Produto",label:"Produto"},{key:"Profissional",label:"Prof."},{key:"Qtd",label:"Qtd"},{key:"Total",label:"Total"}]} filename="produtos-vendidos"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Produto</TableHead><TableHead className="hidden md:table-cell">Prof.</TableHead><TableHead className="text-right">Qtd</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date),"dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.product}</TableCell><TableCell className="hidden md:table-cell text-sm">{d.staff}</TableCell><TableCell className="text-right">{d.qty}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
