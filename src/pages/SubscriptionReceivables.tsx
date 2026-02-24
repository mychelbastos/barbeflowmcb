import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useReceivables } from "@/hooks/useSubscriptionInsights";
import { MonthNavigator } from "@/components/subscriptions/MonthNavigator";
import { ReportCard } from "@/components/reports/ReportCard";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Clock, Users, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const statusConfig: Record<string, { label: string; className: string }> = {
  paid: { label: "Pago", className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" },
  overdue: { label: "Atrasado", className: "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20" },
  upcoming: { label: "Previsto", className: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/20" },
};

export default function SubscriptionReceivables() {
  const { currentTenant } = useTenant();
  const [month, setMonth] = useState(new Date());
  const { data, isLoading } = useReceivables(currentTenant?.id, month);

  return (
    <div className="space-y-5 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Recebíveis de Assinaturas</h1>
        <p className="text-sm text-muted-foreground">Acompanhe os pagamentos previstos e recebidos</p>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ReportCard icon={DollarSign} label="Previsto no mês" value={formatBRL(data?.totalExpected || 0)} />
            <ReportCard icon={TrendingUp} label="Recebido" value={formatBRL(data?.totalPaid || 0)} />
            <ReportCard icon={Clock} label="Pendente" value={formatBRL(data?.totalPending || 0)} />
            <ReportCard icon={Users} label="Assinaturas" value={String(data?.totalSubs || 0)} />
          </div>

          {!data?.items.length ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum recebível neste mês.</p>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead className="hidden md:table-cell">Plano</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((item) => {
                    const sc = statusConfig[item.status];
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="text-sm">{format(new Date(item.date), "dd/MM", { locale: ptBR })}</TableCell>
                        <TableCell className="text-sm font-medium">{item.customerName}</TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{item.planName}</TableCell>
                        <TableCell className="text-sm text-right font-medium">{formatBRL(item.amountCents)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={sc.className}>{sc.label}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
