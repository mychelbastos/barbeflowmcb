import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { ReportPeriodFilter, useReportPeriod } from "@/components/reports/ReportPeriodFilter";
import { RevenueEvolutionReport } from "@/components/reports/RevenueEvolutionReport";
import { PaymentMethodReport } from "@/components/reports/PaymentMethodReport";
import { CashFlowReport } from "@/components/reports/CashFlowReport";
import { StaffRevenueReport } from "@/components/reports/StaffRevenueReport";
import { StaffServicesReport } from "@/components/reports/StaffServicesReport";
import { StaffClientsReport } from "@/components/reports/StaffClientsReport";
import { BirthdayClientsReport } from "@/components/reports/BirthdayClientsReport";
import { InactiveClientsReport } from "@/components/reports/InactiveClientsReport";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  TrendingUp, CreditCard, ArrowLeftRight, Users, Scissors, UserCheck, Cake, UserX, ArrowLeft, BarChart3,
} from "lucide-react";

interface ReportDef {
  id: string;
  title: string;
  description: string;
  icon: any;
  category: string;
}

const reports: ReportDef[] = [
  { id: "revenue-evolution", title: "Evolução do Faturamento", description: "Faturamento total e ticket médio por mês", icon: TrendingUp, category: "Financeiro" },
  { id: "payment-methods", title: "Formas de Pagamento", description: "Distribuição por método de pagamento", icon: CreditCard, category: "Financeiro" },
  { id: "cash-flow", title: "Entradas e Saídas", description: "Movimentações financeiras do caixa", icon: ArrowLeftRight, category: "Financeiro" },
  { id: "staff-revenue", title: "Faturamento por Profissional", description: "Faturamento, comandas e ticket médio", icon: Users, category: "Profissionais" },
  { id: "staff-services", title: "Serviços por Profissional", description: "Serviços realizados por profissional", icon: Scissors, category: "Profissionais" },
  { id: "staff-clients", title: "Clientes Atendidos", description: "Clientes atendidos por profissional", icon: UserCheck, category: "Profissionais" },
  { id: "birthdays", title: "Aniversariantes", description: "Clientes que fazem aniversário no mês", icon: Cake, category: "Clientes" },
  { id: "inactive", title: "Clientes que Não Retornam", description: "Clientes inativos há X dias", icon: UserX, category: "Clientes" },
];

const categories = ["Financeiro", "Profissionais", "Clientes"];
const categoryIcons: Record<string, string> = { Financeiro: "📊", Profissionais: "👥", Clientes: "🧑" };

export default function Reports() {
  const { currentTenant } = useTenant();
  const { range, setRange } = useReportPeriod();
  const [activeReport, setActiveReport] = useState<string | null>(null);

  const tenantId = currentTenant?.id || "";

  const renderReport = () => {
    if (!tenantId) return null;
    const props = { tenantId, startDate: range.startDate, endDate: range.endDate };
    switch (activeReport) {
      case "revenue-evolution": return <RevenueEvolutionReport {...props} />;
      case "payment-methods": return <PaymentMethodReport {...props} />;
      case "cash-flow": return <CashFlowReport {...props} />;
      case "staff-revenue": return <StaffRevenueReport {...props} />;
      case "staff-services": return <StaffServicesReport {...props} />;
      case "staff-clients": return <StaffClientsReport {...props} />;
      case "birthdays": return <BirthdayClientsReport tenantId={tenantId} />;
      case "inactive": return <InactiveClientsReport tenantId={tenantId} />;
      default: return null;
    }
  };

  const activeReportDef = reports.find((r) => r.id === activeReport);
  const showPeriodFilter = activeReport && !["birthdays", "inactive"].includes(activeReport);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {activeReport ? (
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => setActiveReport(null)} className="h-9 w-9 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
                {activeReportDef && <activeReportDef.icon className="h-5 w-5 text-primary" />}
                {activeReportDef?.title}
              </h1>
              <p className="text-sm text-muted-foreground">{activeReportDef?.description}</p>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Relatórios
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Analise o desempenho do seu negócio</p>
          </div>
        )}
      </div>

      {/* Period filter */}
      {(showPeriodFilter || !activeReport) && (
        <div className="bg-card border border-border rounded-2xl p-4">
          <ReportPeriodFilter value={range} onChange={setRange} />
        </div>
      )}

      {/* Report grid or active report */}
      {activeReport ? (
        renderReport()
      ) : (
        <div className="space-y-6">
          {categories.map((cat) => (
            <div key={cat}>
              <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                <span>{categoryIcons[cat]}</span>
                {cat}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {reports
                  .filter((r) => r.category === cat)
                  .map((r) => (
                    <Card
                      key={r.id}
                      className="cursor-pointer hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                      onClick={() => setActiveReport(r.id)}
                    >
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                          <r.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground">{r.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{r.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
