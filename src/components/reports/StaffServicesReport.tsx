import { useState } from "react";
import { useStaffServicesReport } from "@/hooks/useReportData";
import { ReportStaffFilter } from "./ReportStaffFilter";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function StaffServicesReport({ tenantId, startDate, endDate }: Props) {
  const [staffId, setStaffId] = useState("all");
  const { data, isLoading } = useStaffServicesReport(tenantId, startDate, endDate, staffId);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  const chartData = (data || []).slice(0, 10).map((d) => ({ name: d.serviceName.substring(0, 15), value: d.count }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <ReportStaffFilter tenantId={tenantId} value={staffId} onChange={setStaffId} />
        <ExportCSVButton
          data={(data || []).map((d) => ({ Profissional: d.staffName, Serviço: d.serviceName, Quantidade: d.count, Faturamento: formatBRL(d.revenue), "Valor Médio": formatBRL(d.count > 0 ? Math.round(d.revenue / d.count) : 0) }))}
          columns={[{ key: "Profissional", label: "Profissional" }, { key: "Serviço", label: "Serviço" }, { key: "Quantidade", label: "Qtd" }, { key: "Faturamento", label: "Faturamento" }, { key: "Valor Médio", label: "Valor Médio" }]}
          filename="servicos-profissional"
        />
      </div>

      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-2xl p-4 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="name" className="text-xs fill-muted-foreground" tick={{ fontSize: 11 }} />
              <YAxis className="text-xs fill-muted-foreground" tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} name="Quantidade" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Profissional</TableHead>
              <TableHead>Serviço</TableHead>
              <TableHead className="text-right">Qtd</TableHead>
              <TableHead className="text-right">Faturamento</TableHead>
              <TableHead className="text-right">Valor Médio</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data || []).map((d, i) => (
              <TableRow key={i}>
                <TableCell className="text-sm">{d.staffName}</TableCell>
                <TableCell className="font-medium text-sm">{d.serviceName}</TableCell>
                <TableCell className="text-right">{d.count}</TableCell>
                <TableCell className="text-right">{formatBRL(d.revenue)}</TableCell>
                <TableCell className="text-right">{formatBRL(d.count > 0 ? Math.round(d.revenue / d.count) : 0)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
