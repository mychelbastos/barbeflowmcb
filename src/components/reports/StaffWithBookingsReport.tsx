import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function StaffWithBookingsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-staff-bookings", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("staff_id, staff:staff_id(name), booking_items(total_price_cents)").eq("tenant_id", tenantId).neq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate); if (!data) return []; const g: Record<string,{name:string;count:number;total:number}> = {}; for (const b of data) { if (!b.staff_id) continue; const s = b.staff as any; if (!g[b.staff_id]) g[b.staff_id] = { name: s?.name||"—", count: 0, total: 0 }; g[b.staff_id].count++; g[b.staff_id].total += (b.booking_items||[]).reduce((s:number,i:any)=>s+(i.total_price_cents||0),0); } return Object.values(g).sort((a,b)=>b.count-a.count); }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado.</div>;
  return (<div className="space-y-6"><div className="flex justify-end"><ExportCSVButton data={data.map(d=>({Profissional:d.name,Agendamentos:d.count,Valor:formatBRL(d.total)}))} columns={[{key:"Profissional",label:"Profissional"},{key:"Agendamentos",label:"Agendamentos"},{key:"Valor",label:"Valor"}]} filename="prof-agendamentos"/></div><div className="bg-card border border-border rounded-2xl overflow-hidden"><Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Agendamentos</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader><TableBody>{data.map((d,i)=>(<TableRow key={i}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.count}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table></div></div>);
}
