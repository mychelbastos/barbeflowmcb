import { useState } from "react";
import { useInactiveClientsReport } from "@/hooks/useReportData";
import { ExportCSVButton } from "./ExportCSVButton";
import { ReportCard } from "./ReportCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserX } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Props {
  tenantId: string;
}

export function InactiveClientsReport({ tenantId }: Props) {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useInactiveClientsReport(tenantId, days);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="flex items-center gap-2">
          <Label className="text-sm text-muted-foreground whitespace-nowrap">Sem retorno há</Label>
          <Input
            type="number"
            value={days}
            onChange={(e) => setDays(Math.max(1, parseInt(e.target.value) || 30))}
            className="h-9 w-20 text-sm"
            min={1}
          />
          <span className="text-sm text-muted-foreground">dias</span>
        </div>
        <ExportCSVButton
          data={(data || []).map((d) => ({ Cliente: d.customerName, Telefone: d.phone, Email: d.email, "Último Atendimento": format(new Date(d.lastVisit), "dd/MM/yy"), "Dias sem Retorno": d.daysSince, "Último Serviço": d.lastService }))}
          columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Último Atendimento", label: "Último Atendimento" }, { key: "Dias sem Retorno", label: "Dias sem Retorno" }, { key: "Último Serviço", label: "Último Serviço" }]}
          filename="clientes-inativos"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-4">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReportCard icon={UserX} label="Clientes Inativos" value={String(data?.length || 0)} changeType="negative" />
          </div>

          {!data?.length ? (
            <div className="text-sm text-muted-foreground p-4">Todos os clientes retornaram no período.</div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="hidden md:table-cell">Último Serviço</TableHead>
                    <TableHead className="text-right">Último Atend.</TableHead>
                    <TableHead className="text-right">Dias</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.customerId}>
                      <TableCell className="font-medium text-sm">{d.customerName}</TableCell>
                      <TableCell className="text-sm">{d.phone}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.lastService}</TableCell>
                      <TableCell className="text-right text-sm">{format(new Date(d.lastVisit), "dd/MM/yy")}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={d.daysSince > 60 ? "destructive" : "secondary"} className="text-xs">
                          {d.daysSince}d
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
