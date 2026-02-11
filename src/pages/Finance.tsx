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
  Sparkles,
  Activity,
  Zap,
} from "lucide-react";
import { format, subDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

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

const COLORS = ["#10B981", "#3B82F6", "#8B5CF6", "#F59E0B", "#EF4444"];

// ---------- Animation variants ----------
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.1 },
  },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring" as const, stiffness: 300, damping: 24 },
  },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 200, damping: 20 },
  },
} as const;

// ---------- Variation Badge ----------
function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-0.5 text-[10px] font-semibold px-2 py-0.5 rounded-full backdrop-blur-sm ${
        positive
          ? "text-emerald-300 bg-emerald-500/15 ring-1 ring-emerald-500/20"
          : "text-red-300 bg-red-500/15 ring-1 ring-red-500/20"
      }`}
    >
      {positive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </motion.span>
  );
}

// ---------- KPI Card Component ----------
function KpiCard({
  label,
  value,
  subtitle,
  icon: Icon,
  iconColor,
  iconBg,
  variation,
  delay = 0,
  glowColor,
}: {
  label: string;
  value: string;
  subtitle?: string;
  icon: any;
  iconColor: string;
  iconBg: string;
  variation?: { current: number; previous: number };
  delay?: number;
  glowColor?: string;
}) {
  return (
    <motion.div variants={itemVariants}>
      <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 hover:shadow-accent/5 hover:shadow-lg">
        {glowColor && (
          <div
            className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl"
            style={{ background: glowColor }}
          />
        )}
        <CardContent className="p-4 md:p-5 relative">
          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1 space-y-1">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">{label}</p>
              <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">{value}</p>
              <div className="flex items-center gap-2">
                {variation && <VariationBadge current={variation.current} previous={variation.previous} />}
                {subtitle && <span className="text-[10px] text-muted-foreground">{subtitle}</span>}
              </div>
            </div>
            <div
              className={`w-10 h-10 md:w-11 md:h-11 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 ml-3 ring-1 ring-white/5 group-hover:scale-110 transition-transform duration-300`}
            >
              <Icon className={`h-4.5 w-4.5 md:h-5 md:w-5 ${iconColor}`} />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ---------- Section wrapper ----------
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      variants={sectionVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-50px" }}
      className={className}
    >
      {children}
    </motion.div>
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

      const periodDays = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
      const prevFrom = subDays(dateRange.from, periodDays);
      const prevTo = subDays(dateRange.to, periodDays);

      let query = supabase
        .from("bookings")
        .select(`*, service:services(name, price_cents, id), staff:staff(name, id), customer:customers(name, phone)`)
        .eq("tenant_id", currentTenant.id)
        .in("status", ["confirmed", "completed"])
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());

      if (staffFilter && staffFilter !== "all") query = query.eq("staff_id", staffFilter);

      let allQuery = supabase
        .from("bookings")
        .select("id, status, starts_at")
        .eq("tenant_id", currentTenant.id)
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") allQuery = allQuery.eq("staff_id", staffFilter);

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

    const serviceStats = bookingsData.reduce((acc: any, b: any) => {
      const name = b.service?.name || "Serviço";
      const price = b.service?.price_cents || 0;
      if (!acc[name]) acc[name] = { name, revenue: 0, count: 0 };
      acc[name].revenue += price;
      acc[name].count += 1;
      return acc;
    }, {});
    const topServices = Object.values(serviceStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

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

  const avgPerWorkDay = useMemo(() => {
    if (!data) return 0;
    const daysWithBookings = new Set(
      bookings.map((b) => format(new Date(b.starts_at), "yyyy-MM-dd"))
    ).size;
    return daysWithBookings > 0 ? data.revenue_expected / daysWithBookings : 0;
  }, [data, bookings]);

  const dailyAvg = useMemo(() => {
    if (!data?.daily_revenue) return 0;
    const withData = data.daily_revenue.filter((d) => d.expected > 0);
    if (withData.length === 0) return 0;
    return withData.reduce((s, d) => s + d.expected, 0) / withData.length;
  }, [data]);

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
      <div className="space-y-6 px-4 md:px-0">
        {/* Skeleton loading with shimmer */}
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-muted/30 rounded-lg animate-pulse" />
        </div>
        <div className="h-14 bg-muted/30 rounded-2xl animate-pulse" />
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/30 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 100}ms` }} />
          ))}
        </div>
        <div className="h-72 bg-muted/30 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-5 md:space-y-8 px-4 md:px-0 pb-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center ring-1 ring-primary/20">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Financeiro</h1>
          <p className="text-xs md:text-sm text-muted-foreground/70">Análise de receitas e performance do negócio</p>
        </div>
      </motion.div>

      {/* 1. Unified Filters */}
      <motion.div variants={itemVariants}>
        <UnifiedFilters
          staff={staff}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
          onExport={exportToCSV}
          hasData={!!data && bookings.length > 0}
        />
      </motion.div>

      {/* 2. KPI Cards */}
      <motion.div variants={containerVariants} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <KpiCard
          label="Fat. Previsto"
          value={`R$ ${data ? (data.revenue_expected / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`}
          icon={Target}
          iconColor="text-primary"
          iconBg="bg-primary/10"
          variation={prevData ? { current: data?.revenue_expected || 0, previous: prevData.revenue_expected } : undefined}
          glowColor="hsl(160 84% 39% / 0.08)"
        />
        <KpiCard
          label="Recebido"
          value={`R$ ${data ? (data.revenue_received / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`}
          icon={DollarSign}
          iconColor="text-success"
          iconBg="bg-success/10"
          variation={prevData ? { current: data?.revenue_received || 0, previous: prevData.revenue_received } : undefined}
          glowColor="hsl(142 71% 45% / 0.08)"
        />
        <KpiCard
          label="Agendamentos"
          value={`${data?.bookings_count || 0}`}
          icon={Calendar}
          iconColor="text-accent"
          iconBg="bg-accent/10"
          variation={prevData ? { current: data?.bookings_count || 0, previous: prevData.bookings_count } : undefined}
          glowColor="hsl(160 84% 39% / 0.08)"
        />
        <KpiCard
          label="Ticket Médio"
          value={`R$ ${data ? (data.avg_ticket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`}
          icon={Wallet}
          iconColor="text-warning"
          iconBg="bg-warning/10"
          variation={prevData ? { current: data?.avg_ticket || 0, previous: prevData.avg_ticket } : undefined}
          glowColor="hsl(38 92% 50% / 0.08)"
        />
        <motion.div variants={itemVariants} className="col-span-2 lg:col-span-1">
          <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl hover:border-primary/30 transition-all duration-500 hover:shadow-accent/5 hover:shadow-lg">
            <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-2xl bg-primary/10" />
            <CardContent className="p-4 md:p-5 relative">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">Média/Dia Útil</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight">
                    R$ {(avgPerWorkDay / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                  </p>
                  <span className="text-[10px] text-muted-foreground">Dias com atendimento</span>
                </div>
                <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-3 ring-1 ring-white/5 group-hover:scale-110 transition-transform duration-300">
                  <BarChart3 className="h-4.5 w-4.5 md:h-5 md:w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* 3. Product KPIs (conditional) */}
      {(data?.product_sales_revenue || 0) > 0 && (
        <Section>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <KpiCard
              label="Fat. Produtos"
              value={`R$ ${(data!.product_sales_revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              icon={ShoppingCart}
              iconColor="text-primary"
              iconBg="bg-primary/10"
              glowColor="hsl(160 84% 39% / 0.08)"
            />
            <KpiCard
              label="Lucro Produtos"
              value={`R$ ${(data!.product_sales_profit / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`}
              subtitle={data!.product_sales_revenue > 0 ? `${((data!.product_sales_profit / data!.product_sales_revenue) * 100).toFixed(0)}% margem` : "0%"}
              icon={TrendingUp}
              iconColor="text-success"
              iconBg="bg-success/10"
              glowColor="hsl(142 71% 45% / 0.08)"
            />
          </div>
        </Section>
      )}

      {/* 4. Daily Revenue Chart */}
      <Section>
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                <Zap className="h-4 w-4 text-primary" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg tracking-tight">Faturamento Diário</CardTitle>
                <CardDescription className="text-xs text-muted-foreground/60">Previsto vs Recebido</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
            <ResponsiveContainer width="100%" height={250} className="md:!h-[300px]">
              <ComposedChart data={data?.daily_revenue?.filter((d) => d.expected > 0 || d.received > 0) || []}>
                <defs>
                  <linearGradient id="expectedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} axisLine={{ stroke: "hsl(240 4% 16%)" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 45%)" }} width={50} axisLine={{ stroke: "hsl(240 4% 16%)" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(240 5% 10%)",
                    border: "1px solid hsl(240 4% 20%)",
                    borderRadius: 12,
                    boxShadow: "0 8px 32px -8px hsl(0 0% 0% / 0.5)",
                    padding: "10px 14px",
                  }}
                  labelStyle={{ color: "hsl(240 5% 65%)", fontSize: 11 }}
                  formatter={(value: number, name: string) => {
                    const label = name === "expected" ? "Previsto" : "Recebido";
                    return [`R$ ${value.toFixed(2)}`, label];
                  }}
                />
                {dailyAvg > 0 && (
                  <ReferenceLine
                    y={dailyAvg}
                    stroke="hsl(240 5% 45%)"
                    strokeDasharray="5 5"
                    strokeOpacity={0.6}
                    label={{ value: `Média: R$ ${dailyAvg.toFixed(0)}`, position: "insideTopRight", fill: "hsl(240 5% 55%)", fontSize: 10 }}
                  />
                )}
                <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2.5} dot={false} name="expected" />
                <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} dot={false} name="received" strokeOpacity={0.7} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Section>

      {/* 5. Heatmap */}
      <Section>
        <RevenueHeatmap bookings={bookings} />
      </Section>

      {/* 6. Period Comparison */}
      {prevData && (
        <Section>
          <PeriodComparisonChart
            currentDaily={data?.daily_revenue || []}
            previousDaily={prevData.daily_revenue}
          />
        </Section>
      )}

      {/* 7. Grid: Top Services + Booking Status */}
      <Section>
        <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
          {/* Top Services */}
          <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2 md:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg tracking-tight">Top Serviços</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/60">Por faturamento no período</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
              <div className="md:hidden space-y-2">
                {(data?.top_services || []).map((service, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ring-1 ring-white/5"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{service.name}</p>
                        <p className="text-[10px] text-muted-foreground">{service.count} agendamentos</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-success">R$ {(service.revenue / 100).toFixed(0)}</span>
                  </motion.div>
                ))}
                {(!data?.top_services || data.top_services.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
                )}
              </div>
              <div className="hidden md:block">
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data?.top_services || []} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 16%)" strokeOpacity={0.5} />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: "hsl(240 5% 45%)" }} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(240 5% 45%)" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(240 5% 10%)",
                        border: "1px solid hsl(240 4% 20%)",
                        borderRadius: 12,
                        boxShadow: "0 8px 32px -8px hsl(0 0% 0% / 0.5)",
                      }}
                      formatter={(value: number) => [`R$ ${(value / 100).toFixed(2)}`, "Faturamento"]}
                    />
                    <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                      {(data?.top_services || []).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Booking Status Chart */}
          <BookingStatusChart allBookings={allBookingsForStatus} payments={paymentsInPeriod} />
        </div>
      </Section>

      {/* 8. Staff Performance */}
      <Section>
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                <Users className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg tracking-tight">Performance da Equipe</CardTitle>
                <CardDescription className="text-xs text-muted-foreground/60">Faturamento, ticket médio e comissão por profissional</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {staffWithCommission.map((sp, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`p-3.5 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors space-y-2.5 ${
                    sp.isTop ? "ring-1 ring-primary/30 bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${sp.isTop ? "bg-primary/15" : "bg-muted/50"}`}>
                        <Users className={`h-4 w-4 ${sp.isTop ? "text-primary" : "text-muted-foreground"}`} />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{sp.name}</p>
                        <p className="text-[10px] text-muted-foreground">{sp.bookings} agendamentos</p>
                      </div>
                    </div>
                    <span className="font-semibold text-sm text-success">R$ {(sp.revenue / 100).toFixed(0)}</span>
                  </div>
                  <Progress value={sp.progressPct} className="h-1.5" />
                  <div className="flex justify-between text-[10px] text-muted-foreground">
                    <span>Ticket: R$ {(sp.ticketMedio / 100).toFixed(0)}</span>
                    <span>Comissão ({sp.commPct}%): R$ {(sp.comissao / 100).toFixed(0)}</span>
                  </div>
                </motion.div>
              ))}
              {staffWithCommission.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado disponível</p>
              )}
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Profissional</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Agendamentos</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Faturamento</TableHead>
                    <TableHead className="w-36 text-[11px] uppercase tracking-wider text-muted-foreground/60">Progresso</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Ticket Médio</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Comissão Est.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffWithCommission.map((sp, index) => (
                    <TableRow
                      key={index}
                      className={`border-border/20 hover:bg-muted/20 transition-colors ${
                        sp.isTop ? "bg-primary/5 hover:bg-primary/10" : ""
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2.5">
                          {sp.isTop && <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />}
                          {sp.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{sp.bookings}</TableCell>
                      <TableCell className="text-right font-semibold tabular-nums">R$ {(sp.revenue / 100).toFixed(2)}</TableCell>
                      <TableCell>
                        <Progress value={sp.progressPct} className="h-1.5" />
                      </TableCell>
                      <TableCell className="text-right tabular-nums">R$ {(sp.ticketMedio / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-muted-foreground tabular-nums">
                        R$ {(sp.comissao / 100).toFixed(2)}
                        <span className="text-[10px] ml-1 text-muted-foreground/60">({sp.commPct}%)</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </Section>

      {/* 9. Top Products */}
      {data?.top_products && data.top_products.length > 0 && (
        <Section>
          <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
            <CardHeader className="pb-2 md:pb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                  <Package className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base md:text-lg tracking-tight">Produtos Mais Vendidos</CardTitle>
                  <CardDescription className="text-xs text-muted-foreground/60">Por quantidade vendida no período</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-2">
                {data.top_products.map((product, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ring-1 ring-white/5"
                        style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-sm text-foreground">{product.name}</p>
                        <p className="text-[10px] text-muted-foreground">{product.quantity} unidades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="font-semibold text-sm text-foreground block">R$ {(product.revenue / 100).toFixed(0)}</span>
                      <span className="text-[10px] text-success">+R$ {(product.profit / 100).toFixed(0)}</span>
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Produto</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Quantidade</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Faturamento</TableHead>
                      <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Lucro</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.top_products.map((product, index) => (
                      <TableRow key={index} className="border-border/20 hover:bg-muted/20 transition-colors">
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{product.quantity}</TableCell>
                        <TableCell className="text-right tabular-nums">R$ {(product.revenue / 100).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-success font-medium tabular-nums">R$ {(product.profit / 100).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </Section>
      )}

      {/* 10. Recent Bookings */}
      <Section>
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-xl">
          <CardHeader className="pb-2 md:pb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center ring-1 ring-accent/20">
                <Calendar className="h-4 w-4 text-accent" />
              </div>
              <div>
                <CardTitle className="text-base md:text-lg tracking-tight">Últimos Agendamentos</CardTitle>
                <CardDescription className="text-xs text-muted-foreground/60">Agendamentos recentes do período</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="md:hidden space-y-2">
              {bookings.slice(0, 5).map((booking, i) => (
                <motion.div
                  key={booking.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="p-3 rounded-xl bg-muted/20 hover:bg-muted/30 transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{booking.customer?.name}</p>
                      <p className="text-[10px] text-muted-foreground">{booking.service?.name}</p>
                    </div>
                    <Badge
                      variant={
                        booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"
                      }
                      className="text-[10px] px-2 py-0.5"
                    >
                      {booking.status === "completed" ? "Concluído" : booking.status === "confirmed" ? "Confirmado" : booking.status === "cancelled" ? "Cancelado" : booking.status === "no_show" ? "Faltou" : booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{format(new Date(booking.starts_at), "dd/MM/yyyy HH:mm")}</span>
                    <span className="font-semibold text-success tabular-nums">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Cliente</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60">Data/Hora</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground/60">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id} className="border-border/20 hover:bg-muted/20 transition-colors">
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.customer?.name}</p>
                          <p className="text-xs text-muted-foreground">{booking.service?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm tabular-nums">
                          <p>{format(new Date(booking.starts_at), "dd/MM/yyyy")}</p>
                          <p className="text-muted-foreground">{format(new Date(booking.starts_at), "HH:mm")}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium tabular-nums">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</p>
                          <Badge
                            variant={
                              booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"
                            }
                            className="text-[10px] px-2 py-0.5"
                          >
                            {booking.status === "completed" ? "Concluído" : booking.status === "confirmed" ? "Confirmado" : booking.status === "cancelled" ? "Cancelado" : booking.status === "no_show" ? "Faltou" : booking.status}
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
      </Section>
    </motion.div>
  );
}
