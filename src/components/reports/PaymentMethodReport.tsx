import { usePaymentMethodReport } from "@/hooks/useReportData";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";

const COLORS = ["hsl(var(--primary))", "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

const methodLabels: Record<string, string> = {
  cash: "Dinheiro",
  pix: "Pix",
  credit_card: "Cartão Crédito",
  debit_card: "Cartão Débito",
  online: "Pagamento Online",
  voucher: "Voucher",
  other: "Outros",
};

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function PaymentMethodReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = usePaymentMethodReport(tenantId, startDate, endDate);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const grandTotal = data.reduce((s, d) => s + d.total, 0);
  const chartData = data.map((d) => ({ name: methodLabels[d.method] || d.method, value: d.total / 100 }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportCSVButton
          data={data.map((d) => ({ Método: methodLabels[d.method] || d.method, Quantidade: d.count, Total: formatBRL(d.total), Percentual: ((d.total / grandTotal) * 100).toFixed(1) + "%" }))}
          columns={[{ key: "Método", label: "Método" }, { key: "Quantidade", label: "Quantidade" }, { key: "Total", label: "Total" }, { key: "Percentual", label: "%" }]}
          filename="formas-pagamento"
        />
      </div>

      <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
              {chartData.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Método</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">%</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.method}>
                <TableCell className="font-medium">{methodLabels[d.method] || d.method}</TableCell>
                <TableCell className="text-right">{d.count}</TableCell>
                <TableCell className="text-right">{formatBRL(d.total)}</TableCell>
                <TableCell className="text-right">{((d.total / grandTotal) * 100).toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
