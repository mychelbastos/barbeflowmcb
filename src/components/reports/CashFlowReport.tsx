import { useCashFlowReport } from "@/hooks/useReportData";
import { ReportCard } from "./ReportCard";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { ArrowDownCircle, ArrowUpCircle, Wallet } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const sourceLabels: Record<string, string> = {
  booking_service: "Serviço",
  booking_product: "Produto",
  booking: "Agendamento",
  manual: "Manual",
  withdrawal: "Sangria",
  supply: "Suprimento",
  subscription: "Assinatura",
  package_sale: "Pacote",
  expense: "Despesa",
  payout: "Pagamento",
  fee: "Taxa",
};

const kindLabels: Record<string, string> = { income: "Entrada", expense: "Saída" };

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
}

export function CashFlowReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useCashFlowReport(tenantId, startDate, endDate);

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;

  const totalIn = data.filter((e: any) => e.kind === "income").reduce((s: number, e: any) => s + e.amount_cents, 0);
  const totalOut = data.filter((e: any) => e.kind === "expense").reduce((s: number, e: any) => s + e.amount_cents, 0);

  const csvData = data.map((e: any) => ({
    Data: format(new Date(e.occurred_at), "dd/MM/yy HH:mm", { locale: ptBR }),
    Tipo: kindLabels[e.kind] || e.kind,
    Origem: sourceLabels[e.source] || e.source || "—",
    Método: e.payment_method || "—",
    Valor: formatBRL(e.amount_cents),
    Profissional: (e.staff as any)?.name || "—",
    Observações: e.notes || "",
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <ExportCSVButton
          data={csvData}
          columns={[
            { key: "Data", label: "Data" }, { key: "Tipo", label: "Tipo" }, { key: "Origem", label: "Origem" },
            { key: "Método", label: "Método" }, { key: "Valor", label: "Valor" }, { key: "Profissional", label: "Profissional" }, { key: "Observações", label: "Observações" },
          ]}
          filename="entradas-saidas"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <ReportCard icon={ArrowUpCircle} label="Total Entradas" value={formatBRL(totalIn)} changeType="positive" />
        <ReportCard icon={ArrowDownCircle} label="Total Saídas" value={formatBRL(totalOut)} changeType="negative" />
        <ReportCard icon={Wallet} label="Saldo" value={formatBRL(totalIn - totalOut)} changeType={totalIn - totalOut >= 0 ? "positive" : "negative"} />
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Origem</TableHead>
              <TableHead className="text-right">Valor</TableHead>
              <TableHead className="hidden md:table-cell">Profissional</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((e: any) => (
              <TableRow key={e.id}>
                <TableCell className="text-sm">{format(new Date(e.occurred_at), "dd/MM HH:mm")}</TableCell>
                <TableCell>
                  <Badge variant={e.kind === "income" ? "default" : "destructive"} className="text-xs">
                    {kindLabels[e.kind] || e.kind}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{sourceLabels[e.source] || e.source || "—"}</TableCell>
                <TableCell className="text-right font-medium">{formatBRL(e.amount_cents)}</TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{(e.staff as any)?.name || "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
