import { useState } from "react";
import { useBirthdayClientsReport } from "@/hooks/useReportData";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Cake } from "lucide-react";
import { ReportCard } from "./ReportCard";

const months = [
  { value: "1", label: "Janeiro" }, { value: "2", label: "Fevereiro" }, { value: "3", label: "Março" },
  { value: "4", label: "Abril" }, { value: "5", label: "Maio" }, { value: "6", label: "Junho" },
  { value: "7", label: "Julho" }, { value: "8", label: "Agosto" }, { value: "9", label: "Setembro" },
  { value: "10", label: "Outubro" }, { value: "11", label: "Novembro" }, { value: "12", label: "Dezembro" },
];

interface Props {
  tenantId: string;
}

export function BirthdayClientsReport({ tenantId }: Props) {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const { data, isLoading } = useBirthdayClientsReport(tenantId, parseInt(month));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Select value={month} onValueChange={setMonth}>
          <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {months.map((m) => (
              <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <ExportCSVButton
          data={(data || []).map((d) => ({ Cliente: d.name, Telefone: d.phone, Email: d.email || "", Aniversário: d.birthday ? format(new Date(d.birthday), "dd/MM") : "—", "Último Atendimento": d.lastVisit ? format(new Date(d.lastVisit), "dd/MM/yy") : "—" }))}
          columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Aniversário", label: "Aniversário" }, { key: "Último Atendimento", label: "Último Atendimento" }]}
          filename="aniversariantes"
        />
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground p-4">Carregando...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ReportCard icon={Cake} label="Aniversariantes" value={String(data?.length || 0)} />
          </div>

          {!data?.length ? (
            <div className="text-sm text-muted-foreground p-4">Nenhum aniversariante neste mês.</div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead className="hidden md:table-cell">Email</TableHead>
                    <TableHead>Aniversário</TableHead>
                    <TableHead className="hidden md:table-cell">Último Atend.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium text-sm">{d.name}</TableCell>
                      <TableCell className="text-sm">{d.phone}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell>
                      <TableCell className="text-sm">{d.birthday ? format(new Date(d.birthday + "T12:00:00"), "dd/MM") : "—"}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.lastVisit ? format(new Date(d.lastVisit), "dd/MM/yy") : "—"}</TableCell>
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
