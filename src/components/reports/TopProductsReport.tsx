import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function TopProductsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-top-products", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("product_sales").select("quantity, product:product_id(name)").eq("tenant_id", tenantId).gte("sale_date", startDate).lt("sale_date", endDate); if (!data) return []; const g: Record<string,{name:string;count:number}> = {}; for (const s of data as any[]) { const n = s.product?.name||"—"; if (!g[n]) g[n] = { name: n, count: 0 }; g[n].count += s.quantity; } return Object.values(g).sort((a,b)=>b.count-a.count); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="bg-card border border-border rounded-2xl p-4 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={data.slice(0,10)}><CartesianGrid strokeDasharray="3 3" className="stroke-border"/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis/><Tooltip/><Bar dataKey="count" fill="hsl(var(--primary))" radius={[6,6,0,0]} name="Vendas"/></BarChart></ResponsiveContainer></div>);
}
