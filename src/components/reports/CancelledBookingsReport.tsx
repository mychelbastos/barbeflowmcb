import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function CancelledBookingsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-cancelled", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("id, starts_at, customer:customer_id(name, phone), service:service_id(name)").eq("tenant_id", tenantId).eq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate).order("starts_at", { ascending: false }); return (data||[]).map((b:any)=>({ id: b.id, date: b.starts_at, customer: b.customer?.name||"—", phone: b.customer?.phone||"", service: b.service?.name||"—" })); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum cancelamento no período.</div>;
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Data:format(new Date(d.date),"dd/MM/yy"),Cliente:d.customer,Telefone:d.phone,Serviço:d.service}))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Telefone",label:"Telefone"},{key:"Serviço",label:"Serviço"}]} filename="cancelamentos"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead className="hidden md:table-cell">Telefone</TableHead><TableHead>Serviço</TableHead></TableRow></TableHeader><TableBody>{data.map(d=>(<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date),"dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="hidden md:table-cell text-sm">{d.phone}</TableCell><TableCell className="text-sm">{d.service}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
