import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props { tenantId: string; startDate: string; endDate: string; staffId?: string; }

export default function StaffGrossCommissionsReport({ tenantId, startDate, endDate, staffId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-staff-gross-commissions", tenantId, startDate, endDate, staffId],
    queryFn: async () => {
      let q = supabase.from("commission_snapshots").select("staff_id, staff:staff_id(name), item_title, item_type, base_amount_cents, commission_percent, commission_cents, booking:booking_id(starts_at)").eq("tenant_id", tenantId);
      if (staffId && staffId !== "all") q = q.eq("staff_id", staffId);
      const { data } = await q;
      if (!data) return [];
      const filtered = data.filter((c: any) => { const d = c.booking?.starts_at; return d && d >= startDate && d < endDate; });
      const grouped: Record<string, { name: string; total: number; items: number }> = {};
      for (const c of filtered as any[]) { const s = c.staff?.name || "—"; if (!grouped[c.staff_id]) grouped[c.staff_id] = { name: s, total: 0, items: 0 }; grouped[c.staff_id].total += c.commission_cents; grouped[c.staff_id].items++; }
      return Object.entries(grouped).map(([id, v]) => ({ id, ...v })).sort((a, b) => b.total - a.total);
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhuma comissão no período.</div>;
  const chartData = data.map(d => ({ name: d.name.split(" ")[0], value: d.total / 100 }));
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Profissional: d.name, Itens: d.items, "Comissão Bruta": formatBRL(d.total) }))} columns={[{key:"Profissional",label:"Profissional"},{key:"Itens",label:"Itens"},{key:"Comissão Bruta",label:"Comissão"}]} filename="comissoes-brutas" /></div>
      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" className="stroke-border" /><XAxis dataKey="name" /><YAxis tickFormatter={v=>`R$${v}`} /><Tooltip formatter={(v:number) => formatBRL(v*100)} /><Bar dataKey="value" fill="hsl(var(--primary))" radius={[6,6,0,0]} /></BarChart></ResponsiveContainer></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Profissional</TableHead><TableHead className="text-right">Itens</TableHead><TableHead className="text-right">Comissão Bruta</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-right">{d.items}</TableCell><TableCell className="text-right">{formatBRL(d.total)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
