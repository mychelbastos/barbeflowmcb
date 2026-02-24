import { useStaffRevenueReport } from "@/hooks/useReportData";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function StaffRevenueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useStaffRevenueReport(tenantId, startDate, endDate);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const grandTotal = data.reduce((s, d) => s + d.revenue, 0);
  const chartData = data.map((d) => ({ name: d.name.split(" ")[0], value: d.revenue / 100 }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportCSVButton
          data={data.map((d) => ({ Profissional: d.name, Comandas: d.orders, Faturamento: formatBRL(d.revenue), "Ticket Médio": formatBRL(d.orders > 0 ? Math.round(d.revenue / d.orders) : 0), Percentual: ((d.revenue / grandTotal) * 100).toFixed(1) + "%" }))}
          columns={[{ key: "Profissional", label: "Profissional" }, { key: "Comandas", label: "Comandas" }, { key: "Faturamento", label: "Faturamento" }, { key: "Ticket Médio", label: "Ticket Médio" }, { key: "Percentual", label: "%" }]}
          filename="faturamento-profissional"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis type="number" tickFormatter={(v) => `R$${v}`} className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <YAxis type="category" dataKey="name" width={80} className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead className="text-right">Comandas</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.staffId}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={d.photo || undefined} />
                      <AvatarFallback className="text-xs">{d.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium text-sm">{d.name}</span>
                  </div>
                </TableCell>
                <TableCell className="text-right">{d.orders}</TableCell>
                <TableCell className="text-right">{formatBRL(d.revenue)}</TableCell>
                <TableCell className="text-right">{formatBRL(d.orders > 0 ? Math.round(d.revenue / d.orders) : 0)}</TableCell>
                <TableCell className="text-right">{((d.revenue / grandTotal) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
