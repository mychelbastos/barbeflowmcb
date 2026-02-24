import { useState, lazy, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Star, BarChart3 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ReportPeriodFilter, useReportPeriod } from "./ReportPeriodFilter";
import { ReportStaffFilter } from "./ReportStaffFilter";
import { ReportServiceFilter } from "./ReportServiceFilter";
import { ReportDaysFilter } from "./ReportDaysFilter";
import type { ReportDefinition } from "@/data/reportDefinitions";
import { categoryConfig } from "@/data/reportDefinitions";

// Lazy-loaded report components
const REPORT_COMPONENTS: Record<string, React.LazyExoticComponent<any>> = {
  // Clientes
  BirthdayClientsReport: lazy(() => import("./BirthdayClientsReport").then(m => ({ default: m.BirthdayClientsReport }))),
  AttendedClientsReport: lazy(() => import("./AttendedClientsReport")),
  ClientListReport: lazy(() => import("./ClientListReport")),
  ClientBalanceReport: lazy(() => import("./ClientBalanceReport")),
  ReturnRateReport: lazy(() => import("./ReturnRateReport")),
  ClientsByServiceReport: lazy(() => import("./ClientsByServiceReport")),
  NewClientsReport: lazy(() => import("./NewClientsReport")),
  IncompleteClientsReport: lazy(() => import("./IncompleteClientsReport")),
  FirstTimeClientsReport: lazy(() => import("./FirstTimeClientsReport")),
  DuplicatePhoneReport: lazy(() => import("./DuplicatePhoneReport")),
  DuplicateEmailReport: lazy(() => import("./DuplicateEmailReport")),
  InactiveClientsReport: lazy(() => import("./InactiveClientsReport").then(m => ({ default: m.InactiveClientsReport }))),
  PurchaseProfileReport: lazy(() => import("./PurchaseProfileReport")),
  OnlineBookingClientsReport: lazy(() => import("./OnlineBookingClientsReport")),
  ClientFrequencyReport: lazy(() => import("./ClientFrequencyReport")),
  MissedReturnClientsReport: lazy(() => import("./MissedReturnClientsReport")),
  CourtesyReport: lazy(() => import("./CourtesyReport")),
  // Profissionais
  StaffRevenueReport: lazy(() => import("./StaffRevenueReport").then(m => ({ default: m.StaffRevenueReport }))),
  StaffServicesReport: lazy(() => import("./StaffServicesReport").then(m => ({ default: m.StaffServicesReport }))),
  StaffClientsReport: lazy(() => import("./StaffClientsReport").then(m => ({ default: m.StaffClientsReport }))),
  CommissionsPaidReport: lazy(() => import("./CommissionsPaidReport")),
  StaffBookingsCountReport: lazy(() => import("./StaffBookingsCountReport")),
  StaffReturnRateReport: lazy(() => import("./StaffReturnRateReport")),
  StaffGrossCommissionsReport: lazy(() => import("./StaffGrossCommissionsReport")),
  StaffProductSalesReport: lazy(() => import("./StaffProductSalesReport")),
  StaffWorkdaysReport: lazy(() => import("./StaffWorkdaysReport")),
  StaffBirthdayReport: lazy(() => import("./StaffBirthdayReport")),
  // Financeiro
  RevenueEvolutionReport: lazy(() => import("./RevenueEvolutionReport").then(m => ({ default: m.RevenueEvolutionReport }))),
  PaymentMethodReport: lazy(() => import("./PaymentMethodReport").then(m => ({ default: m.PaymentMethodReport }))),
  CashFlowReport: lazy(() => import("./CashFlowReport").then(m => ({ default: m.CashFlowReport }))),
  ClientRevenueReport: lazy(() => import("./ClientRevenueReport")),
  DailyRevenueReport: lazy(() => import("./DailyRevenueReport")),
  WeekdayRevenueReport: lazy(() => import("./WeekdayRevenueReport")),
  AllSalesReport: lazy(() => import("./AllSalesReport")),
  StaffServiceRevenueReport: lazy(() => import("./StaffServiceRevenueReport")),
  ClientPaymentReport: lazy(() => import("./ClientPaymentReport")),
  RevenueByItemTypeReport: lazy(() => import("./RevenueByItemTypeReport")),
  BookingItemsReport: lazy(() => import("./BookingItemsReport")),
  ExpenseByCategoryReport: lazy(() => import("./ExpenseByCategoryReport")),
  BookingDiscrepancyReport: lazy(() => import("./BookingDiscrepancyReport")),
  OnlinePaymentsReport: lazy(() => import("./OnlinePaymentsReport")),
  UnassignedItemsReport: lazy(() => import("./UnassignedItemsReport")),
  // Agenda
  BookingsTotalValueReport: lazy(() => import("./BookingsTotalValueReport")),
  BookingsByOriginReport: lazy(() => import("./BookingsByOriginReport")),
  CancelledBookingsReport: lazy(() => import("./CancelledBookingsReport")),
  BookingsByStatusReport: lazy(() => import("./BookingsByStatusReport")),
  ChurnedClientsReport: lazy(() => import("./ChurnedClientsReport")),
  BookingsByStatusServiceReport: lazy(() => import("./BookingsByStatusServiceReport")),
  StaffWithBookingsReport: lazy(() => import("./StaffWithBookingsReport")),
  BookingsByServiceFilterReport: lazy(() => import("./BookingsByServiceFilterReport")),
  DailyBookingsCountReport: lazy(() => import("./DailyBookingsCountReport")),
  // Serviços
  ServicesPerformedReport: lazy(() => import("./ServicesPerformedReport")),
  TopServicesReport: lazy(() => import("./TopServicesReport")),
  ServicePriceListReport: lazy(() => import("./ServicePriceListReport")),
  BookedVsPerformedReport: lazy(() => import("./BookedVsPerformedReport")),
  ServiceProfitabilityReport: lazy(() => import("./ServiceProfitabilityReport")),
  // Pacotes
  SoldPackagesReport: lazy(() => import("./SoldPackagesReport")),
  TopPackagesReport: lazy(() => import("./TopPackagesReport")),
  ActivePackagesReport: lazy(() => import("./ActivePackagesReport")),
  PackageUsageReport: lazy(() => import("./PackageUsageReport")),
  PackagesByStaffReport: lazy(() => import("./PackagesByStaffReport")),
  PackagePriceListReport: lazy(() => import("./PackagePriceListReport")),
  // Produtos
  SoldProductsReport: lazy(() => import("./SoldProductsReport")),
  TopProductsReport: lazy(() => import("./TopProductsReport")),
  ProductPriceListReport: lazy(() => import("./ProductPriceListReport")),
  ProductProfitabilityReport: lazy(() => import("./ProductProfitabilityReport")),
  ProductOutflowReport: lazy(() => import("./ProductOutflowReport")),
  ProductsByStaffReport: lazy(() => import("./ProductsByStaffReport")),
  // Caixa
  CashSessionsReport: lazy(() => import("./CashSessionsReport")),
  CashMovementsReport: lazy(() => import("./CashMovementsReport")),
  CashIncomeReport: lazy(() => import("./CashIncomeReport")),
};

interface Props {
  report: ReportDefinition;
  tenantId: string;
  onBack: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

export function ReportViewer({ report, tenantId, onBack, isFavorite, onToggleFavorite }: Props) {
  const { range, setRange } = useReportPeriod();
  const [staffId, setStaffId] = useState("all");
  const [serviceId, setServiceId] = useState("all");
  const [days, setDays] = useState(30);

  const ReportComponent = REPORT_COMPONENTS[report.component];
  const cat = categoryConfig[report.category];

  const hasPeriod = report.filters.includes("period");
  const hasStaff = report.filters.includes("staff");
  const hasService = report.filters.includes("service");
  const hasDays = report.filters.includes("days");
  const hasMonth = report.filters.includes("month");

  // Build props for the report component
  const reportProps: any = { tenantId };
  if (hasPeriod || hasMonth) {
    reportProps.startDate = range.startDate;
    reportProps.endDate = range.endDate;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-9 w-9 rounded-xl shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
              <cat.icon className="h-5 w-5 text-primary" />
              {report.name}
            </h1>
            <p className="text-sm text-muted-foreground">{report.description}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onToggleFavorite} className="h-9 w-9 shrink-0">
          <Star className={`h-4 w-4 ${isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
        </Button>
      </div>

      {/* Filters */}
      {(hasPeriod || hasStaff || hasService || hasDays) && (
        <div className="bg-card border border-border rounded-2xl p-4 space-y-3">
          {hasPeriod && <ReportPeriodFilter value={range} onChange={setRange} />}
          <div className="flex flex-wrap gap-3">
            {hasStaff && <ReportStaffFilter tenantId={tenantId} value={staffId} onChange={setStaffId} />}
            {hasService && <ReportServiceFilter tenantId={tenantId} value={serviceId} onChange={setServiceId} />}
            {hasDays && <ReportDaysFilter value={days} onChange={setDays} />}
          </div>
        </div>
      )}

      {/* Report content */}
      {ReportComponent ? (
        <Suspense fallback={<div className="text-sm text-muted-foreground p-4">Carregando relatório...</div>}>
          <ReportComponent {...reportProps} staffId={hasStaff ? staffId : undefined} serviceId={hasService ? serviceId : undefined} days={hasDays ? days : undefined} />
        </Suspense>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-8 text-center text-muted-foreground">
          <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Relatório em desenvolvimento</p>
          <p className="text-sm mt-1">Este relatório estará disponível em breve.</p>
        </div>
      )}
    </div>
  );
}
