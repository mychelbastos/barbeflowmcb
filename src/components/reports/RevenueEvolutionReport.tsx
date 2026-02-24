import { useRevenueEvolution } from "@/hooks/useReportData";
import { ReportCard } from "./ReportCard";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { DollarSign, Receipt, TrendingUp } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function RevenueEvolutionReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useRevenueEvolution(tenantId, startDate, endDate);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const totalRevenue = data.reduce((s, d) => s + d.revenue, 0);
  const totalOrders = data.reduce((s, d) => s + d.orders, 0);
  const avgTicket = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  const chartData = data.map((d) => ({ name: d.label, value: d.revenue / 100 }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportCSVButton
          data={data.map((d) => ({ Mês: d.label, Comandas: d.orders, Faturamento: formatBRL(d.revenue), "Ticket Médio": formatBRL(d.avgTicket) }))}
          columns={[{ key: "Mês", label: "Mês" }, { key: "Comandas", label: "Comandas" }, { key: "Faturamento", label: "Faturamento" }, { key: "Ticket Médio", label: "Ticket Médio" }]}
          filename="evolucao-faturamento"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ReportCard icon={DollarSign} label="Faturamento Total" value={formatBRL(totalRevenue)} />
        <ReportCard icon={TrendingUp} label="Ticket Médio" value={formatBRL(avgTicket)} />
        <ReportCard icon={Receipt} label="Comandas" value={String(totalOrders)} />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
            <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
            <Tooltip formatter={(v: number) => [`R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`, "Faturamento"]} />
            <Area type="monotone" dataKey="value" stroke="hsl(var(--primary))" fill="url(#colorRev)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mês</TableHead>
              <TableHead className="text-right">Comandas</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Ticket Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.month}>
                <TableCell className="font-medium capitalize">{d.label}</TableCell>
                <TableCell className="text-right">{d.orders}</TableCell>
                <TableCell className="text-right">{formatBRL(d.revenue)}</TableCell>
                <TableCell className="text-right">{formatBRL(d.avgTicket)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
