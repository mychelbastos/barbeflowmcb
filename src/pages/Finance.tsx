import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { supabase } from "@/integrations/supabase/client";
import { NoTenantState } from "@/components/NoTenantState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Line,
  ReferenceLine,
  Cell,
} from "recharts";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  DollarSign,
  Target,
  Package,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  BarChart3,
} from "lucide-react";
import { format, subDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";

import { UnifiedFilters } from "@/components/finance/UnifiedFilters";
import { RevenueHeatmap } from "@/components/finance/RevenueHeatmap";
import { PeriodComparisonChart } from "@/components/finance/PeriodComparisonChart";
import { BookingStatusChart } from "@/components/finance/BookingStatusChart";

interface FinanceData {
  revenue_expected: number;
  revenue_received: number;
  bookings_count: number;
  no_show_rate: number;
  avg_ticket: number;
  daily_revenue: { date: string; expected: number; received: number }[];
  top_services: { name: string; revenue: number; count: number }[];
  staff_performance: { name: string; revenue: number; bookings: number; staffId?: string }[];
  product_sales_revenue: number;
  product_sales_profit: number;
  top_products: { name: string; revenue: number; profit: number; quantity: number }[];
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

// ---------- Variation Badge ----------
function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
        positive ? "text-emerald-400 bg-emerald-400/10" : "text-red-400 bg-red-400/10"
      }`}
    >
      {positive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
}

export default function Finance() {
  const { user } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { dateRange } = useDateRange();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [staff, setStaff] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [allBookingsForStatus, setAllBookingsForStatus] = useState<any[]>([]);
  const [paymentsInPeriod, setPaymentsInPeriod] = useState<any[]>([]);
  const [staffDetails, setStaffDetails] = useState<any[]>([]);
  const [staffServicesMap, setStaffServicesMap] = useState<Record<string, number>>({});

  // Previous period data
  const [prevData, setPrevData] = useState<{
    revenue_expected: number;
    revenue_received: number;
    bookings_count: number;
    avg_ticket: number;
    daily_revenue: { date: string; expected: number }[];
  } | null>(null);

  useEffect(() => {
    if (currentTenant) {
      loadFinanceData();
      loadStaff();
    }
  }, [currentTenant, dateRange, staffFilter]);

  const loadStaff = async () => {
    if (!currentTenant) return;
    const [{ data: staffData }, { data: ssData }] = await Promise.all([
      supabase
        .from("staff")
        .select("id, name, default_commission_percent, product_commission_percent")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true)
        .order("name"),
      supabase
        .from("staff_services")
        .select("staff_id, service_id, commission_percent")
        .in(
          "staff_id",
          (
            await supabase
              .from("staff")
              .select("id")
              .eq("tenant_id", currentTenant.id)
              .eq("active", true)
          ).data?.map((s) => s.id) || []
        ),
    ]);
    setStaff(staffData || []);
    setStaffDetails(staffData || []);
    const ssMap: Record<string, number> = {};
    for (const ss of ssData || []) {
      ssMap[`${ss.staff_id}_${ss.service_id}`] = ss.commission_percent ?? -1;
    }
    setStaffServicesMap(ssMap);
  };

  const loadFinanceData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);

      // Calculate previous period
      const periodDays = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
      const prevFrom = subDays(dateRange.from, periodDays);
      const prevTo = subDays(dateRange.to, periodDays);

      // Current period bookings (confirmed + completed for revenue)
      let query = supabase
        .from("bookings")
        .select(`*, service:services(name, price_cents, id), staff:staff(name, id), customer:customers(name, phone)`)
        .eq("tenant_id", currentTenant.id)
        .in("status", ["confirmed", "completed"])
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());

      if (staffFilter && staffFilter !== "all") query = query.eq("staff_id", staffFilter);

      // All bookings (all statuses) for status chart
      let allQuery = supabase
        .from("bookings")
        .select("id, status, starts_at")
        .eq("tenant_id", currentTenant.id)
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") allQuery = allQuery.eq("staff_id", staffFilter);

      // Previous period bookings
      let prevQuery = supabase
        .from("bookings")
        .select("*, service:services(price_cents)")
        .eq("tenant_id", currentTenant.id)
        .in("status", ["confirmed", "completed"])
        .gte("starts_at", prevFrom.toISOString())
        .lte("starts_at", prevTo.toISOString());
      if (staffFilter && staffFilter !== "all") prevQuery = prevQuery.eq("staff_id", staffFilter);

      const [
        { data: bookingsData },
        { data: allBookingsData },
        { data: prevBookingsData },
        { data: paymentsData },
      ] = await Promise.all([
        query.order("starts_at"),
        allQuery,
        prevQuery.order("starts_at"),
        supabase
          .from("payments")
          .select("amount_cents, status, booking_id")
          .eq("tenant_id", currentTenant.id)
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString()),
      ]);

      setBookings(bookingsData || []);
      setAllBookingsForStatus(allBookingsData || []);
      setPaymentsInPeriod(paymentsData || []);

      await calculateFinanceMetrics(bookingsData || [], prevBookingsData || [], prevFrom, prevTo);
    } catch (error) {
      console.error("Error loading finance data:", error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinanceMetrics = async (
    bookingsData: any[],
    prevBookingsData: any[],
    prevFrom: Date,
    prevTo: Date
  ) => {
    const completedBookings = bookingsData.filter((b) => b.status === "completed");

    let revenueExpected = bookingsData.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
    let revenueReceived = completedBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);

    const bookingsCount = bookingsData.length;
    const dailyRevenue = generateDailyRevenue(bookingsData, dateRange.from, dateRange.to);

    // Top services
    const serviceStats = bookingsData.reduce((acc: any, b: any) => {
      const name = b.service?.name || "Serviço";
      const price = b.service?.price_cents || 0;
      if (!acc[name]) acc[name] = { name, revenue: 0, count: 0 };
      acc[name].revenue += price;
      acc[name].count += 1;
      return acc;
    }, {});
    const topServices = Object.values(serviceStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    // Staff performance
    const staffStats = bookingsData.reduce((acc: any, b: any) => {
      const name = b.staff?.name || "Staff";
      const staffId = b.staff?.id || "";
      const price = b.service?.price_cents || 0;
      if (!acc[name]) acc[name] = { name, revenue: 0, bookings: 0, staffId };
      acc[name].revenue += price;
      acc[name].bookings += 1;
      return acc;
    }, {});
    const staffPerformance = Object.values(staffStats).sort((a: any, b: any) => b.revenue - a.revenue);

    // Product sales
    const { data: productSales } = await supabase
      .from("product_sales")
      .select("sale_price_snapshot_cents, purchase_price_snapshot_cents, quantity, product:products(name)")
      .eq("tenant_id", currentTenant!.id)
      .gte("sale_date", dateRange.from.toISOString())
      .lte("sale_date", dateRange.to.toISOString());

    const productRevenue = productSales?.reduce((s, ps) => s + ps.sale_price_snapshot_cents * ps.quantity, 0) || 0;
    const productProfit =
      productSales?.reduce(
        (s, ps) => s + (ps.sale_price_snapshot_cents - ps.purchase_price_snapshot_cents) * ps.quantity,
        0
      ) || 0;

    const productStats = (productSales || []).reduce((acc: any, sale: any) => {
      const n = sale.product?.name || "Produto";
      const rev = sale.sale_price_snapshot_cents * sale.quantity;
      const prof = (sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity;
      if (!acc[n]) acc[n] = { name: n, revenue: 0, profit: 0, quantity: 0 };
      acc[n].revenue += rev;
      acc[n].profit += prof;
      acc[n].quantity += sale.quantity;
      return acc;
    }, {});
    const topProducts = Object.values(productStats).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5);

    revenueExpected += productRevenue;
    revenueReceived += productRevenue;

    const avgTicket = bookingsCount > 0 ? revenueExpected / bookingsCount : 0;

    setData({
      revenue_expected: revenueExpected,
      revenue_received: revenueReceived,
      bookings_count: bookingsCount,
      no_show_rate: 0,
      avg_ticket: avgTicket,
      daily_revenue: dailyRevenue,
      top_services: topServices as any,
      staff_performance: staffPerformance as any,
      product_sales_revenue: productRevenue,
      product_sales_profit: productProfit,
      top_products: topProducts as any,
    });

    // Previous period
    const prevRevExpected = prevBookingsData.reduce((s, b) => s + (b.service?.price_cents || 0), 0);
    const prevCompleted = prevBookingsData.filter((b) => b.status === "completed");
    const prevRevReceived = prevCompleted.reduce((s, b) => s + (b.service?.price_cents || 0), 0);
    const prevCount = prevBookingsData.length;
    const prevAvgTicket = prevCount > 0 ? prevRevExpected / prevCount : 0;
    const prevDaily = generateDailyRevenue(prevBookingsData, prevFrom, prevTo);

    setPrevData({
      revenue_expected: prevRevExpected,
      revenue_received: prevRevReceived,
      bookings_count: prevCount,
      avg_ticket: prevAvgTicket,
      daily_revenue: prevDaily,
    });
  };

  const generateDailyRevenue = (bks: any[], from: Date, to: Date) => {
    const days: { date: string; expected: number; received: number }[] = [];
    const current = new Date(from);
    while (current <= to) {
      const dayStr = format(current, "yyyy-MM-dd");
      const dayBks = bks.filter((b) => format(new Date(b.starts_at), "yyyy-MM-dd") === dayStr);
      const expected = dayBks.reduce((s, b) => s + (b.service?.price_cents || 0), 0);
      const received = dayBks.filter((b) => b.status === "completed").reduce((s, b) => s + (b.service?.price_cents || 0), 0);
      days.push({ date: format(current, "dd/MM"), expected: expected / 100, received: received / 100 });
      current.setDate(current.getDate() + 1);
    }
    return days;
  };

  // Avg per working day
  const avgPerWorkDay = useMemo(() => {
    if (!data) return 0;
    const daysWithBookings = new Set(
      bookings.map((b) => format(new Date(b.starts_at), "yyyy-MM-dd"))
    ).size;
    return daysWithBookings > 0 ? data.revenue_expected / daysWithBookings : 0;
  }, [data, bookings]);

  // Daily average for chart reference line
  const dailyAvg = useMemo(() => {
    if (!data?.daily_revenue) return 0;
    const withData = data.daily_revenue.filter((d) => d.expected > 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, d) => s + d.expected, 0) / withData.length;
  }, [data]);

  // Staff commission calculation
  const staffWithCommission = useMemo(() => {
    if (!data?.staff_performance) return [];
    const maxRev = Math.max(...data.staff_performance.map((s) => s.revenue), 1);
    return data.staff_performance.map((sp: any) => {
      const detail = staffDetails.find((sd) => sd.id === sp.staffId);
      const commPct = detail?.default_commission_percent || 0;
      const ticketMedio = sp.bookings > 0 ? sp.revenue / sp.bookings : 0;
      const comissao = (sp.revenue * commPct) / 100;
      const progressPct = (sp.revenue / maxRev) * 100;
      return { ...sp, ticketMedio, comissao, progressPct, commPct, isTop: sp.revenue === maxRev };
    });
  }, [data, staffDetails]);

  const exportToCSV = () => {
    if (!data || bookings.length === 0) return;
    const csvContent = [
      ["Data", "Cliente", "Serviço", "Profissional", "Valor", "Status"],
      ...bookings.map((b) => [
        format(new Date(b.starts_at), "dd/MM/yyyy HH:mm"),
        b.customer?.name || "",
        b.service?.name || "",
        b.staff?.name || "",
        `R$ ${((b.service?.price_cents || 0) / 100).toFixed(2)}`,
        b.status === "completed" ? "Concluído" : b.status === "confirmed" ? "Confirmado" : b.status === "cancelled" ? "Cancelado" : b.status === "no_show" ? "Faltou" : b.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Financeiro</h1>
        <p className="text-sm text-muted-foreground">Análise de receitas e performance do negócio</p>
      </div>

      {/* 1. Unified Filters */}
      <UnifiedFilters
        staff={staff}
        staffFilter={staffFilter}
        onStaffFilterChange={setStaffFilter}
        onExport={exportToCSV}
        hasData={!!data && bookings.length > 0}
      />

      <div className="space-y-4 md:space-y-6">
        {/* 2. KPI Cards (5) */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
          {/* Faturamento Previsto */}
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">Fat. Previsto</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {data ? (data.revenue_expected / 100).toFixed(0) : "0"}
                  </p>
                  {prevData && <VariationBadge current={data?.revenue_expected || 0} previous={prevData.revenue_expected} />}
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <Target className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recebido */}
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Recebido</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {data ? (data.revenue_received / 100).toFixed(0) : "0"}
                  </p>
                  {prevData && <VariationBadge current={data?.revenue_received || 0} previous={prevData.revenue_received} />}
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Agendamentos */}
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">{data?.bookings_count || 0}</p>
                  {prevData && <VariationBadge current={data?.bookings_count || 0} previous={prevData.bookings_count} />}
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <Calendar className="h-4 w-4 md:h-5 md:w-5 text-accent" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Médio */}
          <Card>
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Ticket Médio</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {data ? (data.avg_ticket / 100).toFixed(0) : "0"}
                  </p>
                  {prevData && <VariationBadge current={data?.avg_ticket || 0} previous={prevData.avg_ticket} />}
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-warning/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <Wallet className="h-4 w-4 md:h-5 md:w-5 text-warning" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* NEW: Média por Dia Útil */}
          <Card className="col-span-2 lg:col-span-1">
            <CardContent className="p-4 md:p-5">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">Média/Dia Útil</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {(avgPerWorkDay / 100).toFixed(0)}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Dias com atendimento</span>
                </div>
                <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <BarChart3 className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3. Product KPIs (conditional) */}
        {(data?.product_sales_revenue || 0) > 0 && (
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">Fat. Produtos</p>
                    <p className="text-lg md:text-2xl font-bold text-foreground">
                      R$ {(data!.product_sales_revenue / 100).toFixed(0)}
                    </p>
                  </div>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                    <ShoppingCart className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">Lucro Produtos</p>
                    <p className="text-lg md:text-2xl font-bold text-success">
                      R$ {(data!.product_sales_profit / 100).toFixed(0)}
                    </p>
                    <span className="text-[10px] text-success">
                      {data!.product_sales_revenue > 0
                        ? `${((data!.product_sales_profit / data!.product_sales_revenue) * 100).toFixed(0)}% margem`
                        : "0%"}
                    </span>
                  </div>
                  <div className="w-9 h-9 md:w-10 md:h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0 ml-2">
                    <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-success" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 4. Daily Revenue Chart (improved with ComposedChart + ReferenceLine) */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Faturamento Diário</CardTitle>
            <CardDescription className="text-xs md:text-sm">Previsto vs Recebido</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <ComposedChart data={data?.daily_revenue?.filter((d) => d.expected > 0 || d.received > 0) || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#71717a" }} />
                <YAxis tick={{ fontSize: 10, fill: "#71717a" }} width={50} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  labelStyle={{ color: "#a1a1aa" }}
                  formatter={(value: number, name: string) => {
                    const label = name === "expected" ? "Previsto" : "Recebido";
                    return [`R$ ${value.toFixed(2)}`, label];
                  }}
                />
                {dailyAvg > 0 && (
                  <ReferenceLine
                    y={dailyAvg}
                    stroke="#71717a"
                    strokeDasharray="5 5"
                    label={{ value: `Média: R$ ${dailyAvg.toFixed(0)}`, position: "insideTopRight", fill: "#71717a", fontSize: 10 }}
                  />
                )}
                <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2} dot={false} name="expected" />
                <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} dot={false} name="received" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 5. Heatmap */}
        <RevenueHeatmap bookings={bookings} />

        {/* 6. Period Comparison */}
        {prevData && (
          <PeriodComparisonChart
            currentDaily={data?.daily_revenue || []}
            previousDaily={prevData.daily_revenue}
          />
        )}

        {/* 7. Grid: Top Services + Booking Status */}
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Top Services (existing) */}
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Top Serviços</CardTitle>
              <CardDescription className="text-xs md:text-sm">Por faturamento no período</CardDescription>
            </CardHeader>
            <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
              <div className="md:hidden space-y-3">
                {(data?.top_services || []).map((service, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{service.name}</p>
                        <p className="text-xs text-muted-foreground">{service.count} agendamentos</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-success">R$ {(service.revenue / 100).toFixed(0)}</span>
                  </div>
                ))}
                {(!data?.top_services || data.top_services.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                )}
              </div>
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.top_services || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: "#71717a" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#71717a" }} />
                    <Tooltip
                      contentStyle={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                      formatter={(value: number) => [`R$ ${(value / 100).toFixed(2)}`, "Faturamento"]}
                    />
                    <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Chart (NEW) */}
          <BookingStatusChart allBookings={allBookingsForStatus} payments={paymentsInPeriod} />
        </div>

        {/* 8. Staff Performance (improved) */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Performance da Equipe</CardTitle>
            <CardDescription className="text-xs md:text-sm">Faturamento, ticket médio e comissão por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile */}
            <div className="md:hidden space-y-3">
              {staffWithCommission.map((sp, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg bg-muted/30 space-y-2 ${sp.isTop ? "border-l-2 border-emerald-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{sp.name}</p>
                        <p className="text-xs text-muted-foreground">{sp.bookings} agendamentos</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-success">R$ {(sp.revenue / 100).toFixed(0)}</span>
                  </div>
                  <Progress value={sp.progressPct} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Ticket: R$ {(sp.ticketMedio / 100).toFixed(0)}</span>
                    <span>Comissão ({sp.commPct}%): R$ {(sp.comissao / 100).toFixed(0)}</span>
                  </div>
                </div>
              ))}
              {staffWithCommission.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Agendamentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="w-32">Progresso</TableHead>
                    <TableHead className="text-right">Ticket Médio</TableHead>
                    <TableHead className="text-right">Comissão Est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffWithCommission.map((sp, index) => (
                    <TableRow key={index} className={sp.isTop ? "border-l-2 border-emerald-500" : ""}>
                      <TableCell className="font-medium">{sp.name}</TableCell>
                      <TableCell className="text-right">{sp.bookings}</TableCell>
                      <TableCell className="text-right font-medium">R$ {(sp.revenue / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Progress value={sp.progressPct} className="h-2" />
                      </TableCell>
                      <TableCell className="text-right">R$ {(sp.ticketMedio / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        R$ {(sp.comissao / 100).toFixed(2)}
                        <span className="text-[10px] ml-1">({sp.commPct}%)</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* 9. Top Products (kept) */}
        {data?.top_products && data.top_products.length > 0 && (
          <Card>
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                Produtos Mais Vendidos
              </CardTitle>
              <CardDescription className="text-xs md:text-sm">Por quantidade vendida no período</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {data.top_products.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-foreground block">R$ {(product.revenue / 100).toFixed(0)}</span>
                      <span className="text-xs text-success">+R$ {(product.profit / 100).toFixed(0)}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead className="text-right">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_products.map((product, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right">{product.quantity}</TableCell>
                        <TableCell className="text-right">R$ {(product.revenue / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-success font-medium">R$ {(product.profit / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* 10. Recent Bookings (kept) */}
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Últimos Agendamentos</CardTitle>
            <CardDescription className="text-xs md:text-sm">Agendamentos recentes do período</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="md:hidden space-y-3">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{booking.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.service?.name}</p>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {booking.status === "completed"
                        ? "Concluído"
                        : booking.status === "confirmed"
                        ? "Confirmado"
                        : booking.status === "cancelled"
                        ? "Cancelado"
                        : booking.status === "no_show"
                        ? "Faltou"
                        : booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{format(new Date(booking.starts_at), "dd/MM/yyyy HH:mm")}</span>
                    <span className="font-semibold text-success">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.customer?.name}</p>
                          <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(booking.starts_at), "dd/MM/yyyy")}</p>
                          <p className="text-muted-foreground">{format(new Date(booking.starts_at), "HH:mm")}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</p>
                          <Badge
                            variant={
                              booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"
                            }
                            className="text-xs"
                          >
                            {booking.status === "completed"
                              ? "Concluído"
                              : booking.status === "confirmed"
                              ? "Confirmado"
                              : booking.status === "cancelled"
                              ? "Cancelado"
                              : booking.status === "no_show"
                              ? "Faltou"
                              : booking.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
