import { useState } from "react";
import { useStaffClientsReport } from "@/hooks/useReportData";
import { ReportStaffFilter } from "./ReportStaffFilter";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function StaffClientsReport({ tenantId, startDate, endDate }: Props) {
  const [staffId, setStaffId] = useState("all");
  const { data, isLoading } = useStaffClientsReport(tenantId, startDate, endDate, staffId);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <ReportStaffFilter tenantId={tenantId} value={staffId} onChange={setStaffId} />
        <ExportCSVButton
          data={(data || []).map((d) => ({ Profissional: d.staffName, Cliente: d.customerName, Telefone: d.phone, Email: d.email, Atendimentos: d.count, "Total Gasto": formatBRL(d.total) }))}
          columns={[{ key: "Profissional", label: "Profissional" }, { key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Atendimentos", label: "Atendimentos" }, { key: "Total Gasto", label: "Total Gasto" }]}
          filename="clientes-profissional"
        />
      </div>

      {!data?.length ? (
        <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden md:table-cell">Telefone</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Total Gasto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((d, i) => (
                <TableRow key={i}>
                  <TableCell className="text-sm">{d.staffName}</TableCell>
                  <TableCell className="font-medium text-sm">{d.customerName}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.phone}</TableCell>
                  <TableCell className="text-right">{d.count}</TableCell>
                  <TableCell className="text-right">{formatBRL(d.total)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
