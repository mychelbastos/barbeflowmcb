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
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, ReferenceLine, Cell, Area,
} from "recharts";
import {
  Wallet, TrendingUp, TrendingDown, Calendar, Users, DollarSign, Target,
  Package, ShoppingCart, ArrowUp, ArrowDown, BarChart3, Sparkles, Activity, Zap,
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

// ---------- Animation ----------
const spring = { type: "spring" as const, stiffness: 300, damping: 28 };
const ease = [0.22, 1, 0.36, 1] as const;

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05, delayChildren: 0.08 } },
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, ease } },
} as const;

const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease } },
} as const;

// Premium tooltip style
const tooltipStyle = {
  backgroundColor: "hsl(240 6% 8% / 0.95)",
  border: "1px solid hsl(240 4% 18%)",
  borderRadius: 14,
  boxShadow: "0 12px 40px -8px hsl(0 0% 0% / 0.6)",
  padding: "12px 16px",
  backdropFilter: "blur(12px)",
};

// ---------- Variation Badge ----------
function VariationBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return null;
  const pct = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const positive = pct >= 0;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full ${
        positive
          ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
          : "text-red-400 bg-red-500/10 border border-red-500/20"
      }`}
    >
      {positive ? <ArrowUp className="h-2.5 w-2.5" /> : <ArrowDown className="h-2.5 w-2.5" />}
      {Math.abs(pct).toFixed(0)}%
    </motion.span>
  );
}

// ---------- KPI Card ----------
function KpiCard({
  label, value, subtitle, icon: Icon, gradient, iconColor, variation, delay = 0,
}: {
  label: string; value: string; subtitle?: string; icon: any;
  gradient: string; iconColor: string;
  variation?: { current: number; previous: number }; delay?: number;
}) {
  return (
    <motion.div variants={fadeUp} whileHover={{ y: -4, transition: spring }} whileTap={{ scale: 0.98 }}>
      <div className="group relative cursor-default rounded-2xl glass-panel glass-panel-hover overflow-hidden transition-all duration-500">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
        <div className="relative p-4 md:p-5">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-800/40 flex items-center justify-center backdrop-blur-sm">
              <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
            </div>
            {variation && <VariationBadge current={variation.current} previous={variation.previous} />}
          </div>
          <p className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight leading-none mb-1">{value}</p>
          <p className="text-[11px] text-zinc-500 font-medium">{label}</p>
          {subtitle && <p className="text-[10px] text-zinc-600 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

// ---------- Section wrapper ----------
function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} className={className}>
      {children}
    </motion.div>
  );
}

// ---------- Chart Card wrapper ----------
function ChartCard({ icon: Icon, iconColor, iconBg, title, description, children }: {
  icon: any; iconColor: string; iconBg: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-zinc-800/30">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-zinc-100 tracking-tight">{title}</h3>
          {description && <p className="text-[11px] text-zinc-600">{description}</p>}
        </div>
      </div>
      <div className="p-4 md:p-5">{children}</div>
    </div>
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
  const [prevData, setPrevData] = useState<{
    revenue_expected: number; revenue_received: number; bookings_count: number; avg_ticket: number;
    daily_revenue: { date: string; expected: number }[];
  } | null>(null);

  useEffect(() => {
    if (currentTenant) { loadFinanceData(); loadStaff(); }
  }, [currentTenant, dateRange, staffFilter]);

  const loadStaff = async () => {
    if (!currentTenant) return;
    const [{ data: staffData }, { data: ssData }] = await Promise.all([
      supabase.from("staff").select("id, name, default_commission_percent, product_commission_percent").eq("tenant_id", currentTenant.id).eq("active", true).order("name"),
      supabase.from("staff_services").select("staff_id, service_id, commission_percent").in("staff_id", (await supabase.from("staff").select("id").eq("tenant_id", currentTenant.id).eq("active", true)).data?.map((s) => s.id) || []),
    ]);
    setStaff(staffData || []);
    setStaffDetails(staffData || []);
    const ssMap: Record<string, number> = {};
    for (const ss of ssData || []) { ssMap[`${ss.staff_id}_${ss.service_id}`] = ss.commission_percent ?? -1; }
    setStaffServicesMap(ssMap);
  };

  const loadFinanceData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const periodDays = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
      const prevFrom = subDays(dateRange.from, periodDays);
      const prevTo = subDays(dateRange.to, periodDays);

      let query = supabase.from("bookings").select(`*, service:services(name, price_cents, id), staff:staff(name, id), customer:customers(name, phone)`).eq("tenant_id", currentTenant.id).in("status", ["confirmed", "completed"]).gte("starts_at", dateRange.from.toISOString()).lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") query = query.eq("staff_id", staffFilter);

      let allQuery = supabase.from("bookings").select("id, status, starts_at").eq("tenant_id", currentTenant.id).gte("starts_at", dateRange.from.toISOString()).lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") allQuery = allQuery.eq("staff_id", staffFilter);

      let prevQuery = supabase.from("bookings").select("*, service:services(price_cents)").eq("tenant_id", currentTenant.id).in("status", ["confirmed", "completed"]).gte("starts_at", prevFrom.toISOString()).lte("starts_at", prevTo.toISOString());
      if (staffFilter && staffFilter !== "all") prevQuery = prevQuery.eq("staff_id", staffFilter);

      const [{ data: bookingsData }, { data: allBookingsData }, { data: prevBookingsData }, { data: paymentsData }] = await Promise.all([
        query.order("starts_at"), allQuery, prevQuery.order("starts_at"),
        supabase.from("payments").select("amount_cents, status, booking_id").eq("tenant_id", currentTenant.id).gte("created_at", dateRange.from.toISOString()).lte("created_at", dateRange.to.toISOString()),
      ]);

      setBookings(bookingsData || []);
      setAllBookingsForStatus(allBookingsData || []);
      setPaymentsInPeriod(paymentsData || []);
      await calculateFinanceMetrics(bookingsData || [], prevBookingsData || [], prevFrom, prevTo);
    } catch (error) { console.error("Error loading finance data:", error); } finally { setLoading(false); }
  };

  const calculateFinanceMetrics = async (bookingsData: any[], prevBookingsData: any[], prevFrom: Date, prevTo: Date) => {
    const completedBookings = bookingsData.filter((b) => b.status === "completed");
    let revenueExpected = bookingsData.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
    let revenueReceived = completedBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
    const bookingsCount = bookingsData.length;
    const dailyRevenue = generateDailyRevenue(bookingsData, dateRange.from, dateRange.to);

    const serviceStats = bookingsData.reduce((acc: any, b: any) => {
      const name = b.service?.name || "Serviço"; const price = b.service?.price_cents || 0;
      if (!acc[name]) acc[name] = { name, revenue: 0, count: 0 }; acc[name].revenue += price; acc[name].count += 1; return acc;
    }, {});
    const topServices = Object.values(serviceStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5);

    const staffStats = bookingsData.reduce((acc: any, b: any) => {
      const name = b.staff?.name || "Staff"; const staffId = b.staff?.id || ""; const price = b.service?.price_cents || 0;
      if (!acc[name]) acc[name] = { name, revenue: 0, bookings: 0, staffId }; acc[name].revenue += price; acc[name].bookings += 1; return acc;
    }, {});
    const staffPerformance = Object.values(staffStats).sort((a: any, b: any) => b.revenue - a.revenue);

    const { data: productSales } = await supabase.from("product_sales").select("sale_price_snapshot_cents, purchase_price_snapshot_cents, quantity, product:products(name)").eq("tenant_id", currentTenant!.id).gte("sale_date", dateRange.from.toISOString()).lte("sale_date", dateRange.to.toISOString());
    const productRevenue = productSales?.reduce((s, ps) => s + ps.sale_price_snapshot_cents * ps.quantity, 0) || 0;
    const productProfit = productSales?.reduce((s, ps) => s + (ps.sale_price_snapshot_cents - ps.purchase_price_snapshot_cents) * ps.quantity, 0) || 0;
    const productStats = (productSales || []).reduce((acc: any, sale: any) => {
      const n = sale.product?.name || "Produto"; const rev = sale.sale_price_snapshot_cents * sale.quantity;
      const prof = (sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity;
      if (!acc[n]) acc[n] = { name: n, revenue: 0, profit: 0, quantity: 0 }; acc[n].revenue += rev; acc[n].profit += prof; acc[n].quantity += sale.quantity; return acc;
    }, {});
    const topProducts = Object.values(productStats).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5);

    revenueExpected += productRevenue; revenueReceived += productRevenue;
    const avgTicket = bookingsCount > 0 ? revenueExpected / bookingsCount : 0;

    setData({ revenue_expected: revenueExpected, revenue_received: revenueReceived, bookings_count: bookingsCount, no_show_rate: 0, avg_ticket: avgTicket, daily_revenue: dailyRevenue, top_services: topServices as any, staff_performance: staffPerformance as any, product_sales_revenue: productRevenue, product_sales_profit: productProfit, top_products: topProducts as any });

    const prevRevExpected = prevBookingsData.reduce((s, b) => s + (b.service?.price_cents || 0), 0);
    const prevCompleted = prevBookingsData.filter((b) => b.status === "completed");
    const prevRevReceived = prevCompleted.reduce((s, b) => s + (b.service?.price_cents || 0), 0);
    const prevCount = prevBookingsData.length;
    const prevAvgTicket = prevCount > 0 ? prevRevExpected / prevCount : 0;
    setPrevData({ revenue_expected: prevRevExpected, revenue_received: prevRevReceived, bookings_count: prevCount, avg_ticket: prevAvgTicket, daily_revenue: generateDailyRevenue(prevBookingsData, prevFrom, prevTo) });
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
    const daysWithBookings = new Set(bookings.map((b) => format(new Date(b.starts_at), "yyyy-MM-dd"))).size;
    return daysWithBookings > 0 ? data.revenue_expected / daysWithBookings : 0;
  }, [data, bookings]);

  const dailyAvg = useMemo(() => {
    if (!data?.daily_revenue) return 0;
    const withData = data.daily_revenue.filter((d) => d.expected > 0);
    return withData.length === 0 ? 0 : withData.reduce((s, d) => s + d.expected, 0) / withData.length;
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
        format(new Date(b.starts_at), "dd/MM/yyyy HH:mm"), b.customer?.name || "", b.service?.name || "", b.staff?.name || "",
        `R$ ${((b.service?.price_cents || 0) / 100).toFixed(2)}`,
        b.status === "completed" ? "Concluído" : b.status === "confirmed" ? "Confirmado" : b.status === "cancelled" ? "Cancelado" : b.status === "no_show" ? "Faltou" : b.status,
      ]),
    ].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); const url = URL.createObjectURL(blob);
    link.setAttribute("href", url); link.setAttribute("download", `financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-zinc-800/30 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-zinc-800/20 rounded-lg animate-pulse" />
        </div>
        <div className="h-14 bg-zinc-800/20 rounded-2xl animate-pulse" />
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-5">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-28 bg-zinc-800/20 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="h-72 bg-zinc-800/20 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const statusLabel = (s: string) => s === "completed" ? "Concluído" : s === "confirmed" ? "Confirmado" : s === "cancelled" ? "Cancelado" : s === "no_show" ? "Faltou" : s;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5 md:space-y-7 px-4 md:px-0 pb-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-emerald-400" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight">Financeiro</h1>
          <p className="text-xs md:text-sm text-zinc-600">Análise de receitas e performance</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <UnifiedFilters staff={staff} staffFilter={staffFilter} onStaffFilterChange={setStaffFilter} onExportPDF={exportToCSV} hasData={!!data && bookings.length > 0} />
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={stagger} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <KpiCard label="Fat. Previsto" value={`R$ ${data ? (data.revenue_expected / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`} icon={Target} gradient="from-emerald-500/15 to-emerald-600/5" iconColor="text-emerald-400" variation={prevData ? { current: data?.revenue_expected || 0, previous: prevData.revenue_expected } : undefined} />
        <KpiCard label="Recebido" value={`R$ ${data ? (data.revenue_received / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`} icon={DollarSign} gradient="from-blue-500/15 to-blue-600/5" iconColor="text-blue-400" variation={prevData ? { current: data?.revenue_received || 0, previous: prevData.revenue_received } : undefined} />
        <KpiCard label="Agendamentos" value={`${data?.bookings_count || 0}`} icon={Calendar} gradient="from-violet-500/15 to-violet-600/5" iconColor="text-violet-400" variation={prevData ? { current: data?.bookings_count || 0, previous: prevData.bookings_count } : undefined} />
        <KpiCard label="Ticket Médio" value={`R$ ${data ? (data.avg_ticket / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 }) : "0"}`} icon={Wallet} gradient="from-amber-500/15 to-amber-600/5" iconColor="text-amber-400" variation={prevData ? { current: data?.avg_ticket || 0, previous: prevData.avg_ticket } : undefined} />
        <KpiCard label="Média/Dia Útil" value={`R$ ${(avgPerWorkDay / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} subtitle="Dias com atendimento" icon={BarChart3} gradient="from-pink-500/15 to-pink-600/5" iconColor="text-pink-400" />
      </motion.div>

      {/* Product KPIs */}
      {(data?.product_sales_revenue || 0) > 0 && (
        <Section>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <KpiCard label="Fat. Produtos" value={`R$ ${(data!.product_sales_revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} icon={ShoppingCart} gradient="from-cyan-500/15 to-cyan-600/5" iconColor="text-cyan-400" />
            <KpiCard label="Lucro Produtos" value={`R$ ${(data!.product_sales_profit / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`} subtitle={data!.product_sales_revenue > 0 ? `${((data!.product_sales_profit / data!.product_sales_revenue) * 100).toFixed(0)}% margem` : "0%"} icon={TrendingUp} gradient="from-emerald-500/15 to-emerald-600/5" iconColor="text-emerald-400" />
          </div>
        </Section>
      )}

      {/* Daily Revenue Chart */}
      <Section>
        <ChartCard icon={Zap} iconColor="text-emerald-400" iconBg="bg-emerald-500/10" title="Faturamento Diário" description="Previsto vs Recebido">
          <ResponsiveContainer width="100%" height={280} className="md:!h-[320px]">
            <ComposedChart data={data?.daily_revenue?.filter((d) => d.expected > 0 || d.received > 0) || []}>
              <defs>
                <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="areaGradBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.1} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" strokeOpacity={0.6} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(240 5% 40%)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(240 5% 40%)" }} width={50} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(240 5% 55%)", fontSize: 11, marginBottom: 4 }} formatter={(value: number, name: string) => [`R$ ${value.toFixed(2)}`, name === "expected" ? "Previsto" : "Recebido"]} />
              {dailyAvg > 0 && <ReferenceLine y={dailyAvg} stroke="hsl(240 5% 30%)" strokeDasharray="5 5" strokeOpacity={0.8} label={{ value: `Média: R$ ${dailyAvg.toFixed(0)}`, position: "insideTopRight", fill: "hsl(240 5% 45%)", fontSize: 10 }} />}
              <Area type="monotone" dataKey="expected" fill="url(#areaGrad)" stroke="transparent" />
              <Area type="monotone" dataKey="received" fill="url(#areaGradBlue)" stroke="transparent" />
              <Line type="monotone" dataKey="expected" stroke="#10b981" strokeWidth={2.5} dot={false} name="expected" />
              <Line type="monotone" dataKey="received" stroke="#3b82f6" strokeWidth={2} dot={false} name="received" strokeOpacity={0.8} />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartCard>
      </Section>

      {/* Heatmap */}
      <Section><RevenueHeatmap bookings={bookings} /></Section>

      {/* Period Comparison */}
      {prevData && (
        <Section>
          <PeriodComparisonChart currentDaily={data?.daily_revenue || []} previousDaily={prevData.daily_revenue} />
        </Section>
      )}

      {/* Top Services + Status */}
      <Section>
        <div className="grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2">
          <ChartCard icon={Sparkles} iconColor="text-violet-400" iconBg="bg-violet-500/10" title="Top Serviços" description="Por faturamento no período">
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {(data?.top_services || []).map((service, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>{index + 1}</div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-200">{service.name}</p>
                      <p className="text-[10px] text-zinc-600">{service.count} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-emerald-400 tabular-nums">R$ {(service.revenue / 100).toFixed(0)}</span>
                </motion.div>
              ))}
              {(!data?.top_services || data.top_services.length === 0) && <p className="text-sm text-zinc-600 text-center py-8">Nenhum dado</p>}
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.top_services || []} barSize={36}>
                  <defs>
                    {COLORS.map((c, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 4% 14%)" strokeOpacity={0.6} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: "hsl(240 5% 40%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(240 5% 40%)" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(value: number) => [`R$ ${(value / 100).toFixed(2)}`, "Faturamento"]} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {(data?.top_services || []).map((_, index) => (
                      <Cell key={index} fill={`url(#barGrad${index % COLORS.length})`} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <BookingStatusChart allBookings={allBookingsForStatus} payments={paymentsInPeriod} />
        </div>
      </Section>

      {/* Staff Performance */}
      <Section>
        <ChartCard icon={Users} iconColor="text-blue-400" iconBg="bg-blue-500/10" title="Performance da Equipe" description="Faturamento, ticket médio e comissão">
          {/* Mobile */}
          <div className="md:hidden space-y-2">
            {staffWithCommission.map((sp, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                className={`p-3.5 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/30 transition-colors space-y-2.5 ${sp.isTop ? "border border-emerald-500/20 bg-emerald-500/[0.03]" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sp.isTop ? "bg-emerald-500/10" : "bg-zinc-800/40"}`}>
                      <Users className={`h-4 w-4 ${sp.isTop ? "text-emerald-400" : "text-zinc-500"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-200">{sp.name}</p>
                      <p className="text-[10px] text-zinc-600">{sp.bookings} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-emerald-400 tabular-nums">R$ {(sp.revenue / 100).toFixed(0)}</span>
                </div>
                <Progress value={sp.progressPct} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-zinc-600">
                  <span>Ticket: R$ {(sp.ticketMedio / 100).toFixed(0)}</span>
                  <span>Comissão ({sp.commPct}%): R$ {(sp.comissao / 100).toFixed(0)}</span>
                </div>
              </motion.div>
            ))}
            {staffWithCommission.length === 0 && <p className="text-sm text-zinc-600 text-center py-8">Nenhum dado</p>}
          </div>
          {/* Desktop */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/30 hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider text-zinc-600">Profissional</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Agendamentos</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Faturamento</TableHead>
                  <TableHead className="w-36 text-[11px] uppercase tracking-wider text-zinc-600">Progresso</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Ticket Médio</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Comissão Est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffWithCommission.map((sp, index) => (
                  <TableRow key={index} className={`border-zinc-800/20 hover:bg-zinc-800/20 transition-colors ${sp.isTop ? "bg-emerald-500/[0.03]" : ""}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        {sp.isTop && <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                        <span className="text-zinc-200">{sp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-300">{sp.bookings}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-zinc-100">R$ {(sp.revenue / 100).toFixed(2)}</TableCell>
                    <TableCell><Progress value={sp.progressPct} className="h-1.5" /></TableCell>
                    <TableCell className="text-right tabular-nums text-zinc-300">R$ {(sp.ticketMedio / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-zinc-500 tabular-nums">R$ {(sp.comissao / 100).toFixed(2)} <span className="text-[10px] text-zinc-600">({sp.commPct}%)</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartCard>
      </Section>

      {/* Top Products */}
      {data?.top_products && data.top_products.length > 0 && (
        <Section>
          <ChartCard icon={Package} iconColor="text-amber-400" iconBg="bg-amber-500/10" title="Produtos Mais Vendidos" description="Por quantidade no período">
            <div className="md:hidden space-y-2">
              {data.top_products.map((product, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between p-3 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>{index + 1}</div>
                    <div>
                      <p className="font-semibold text-sm text-zinc-200">{product.name}</p>
                      <p className="text-[10px] text-zinc-600">{product.quantity} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-zinc-200 block tabular-nums">R$ {(product.revenue / 100).toFixed(0)}</span>
                    <span className="text-[10px] text-emerald-400 font-medium">+R$ {(product.profit / 100).toFixed(0)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-zinc-800/30 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-zinc-600">Produto</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Quantidade</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Faturamento</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_products.map((product, index) => (
                    <TableRow key={index} className="border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                      <TableCell className="font-medium text-zinc-200">{product.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-300">{product.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-zinc-300">R$ {(product.revenue / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-emerald-400 font-medium tabular-nums">R$ {(product.profit / 100).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ChartCard>
        </Section>
      )}

      {/* Recent Bookings */}
      <Section>
        <ChartCard icon={Calendar} iconColor="text-blue-400" iconBg="bg-blue-500/10" title="Últimos Agendamentos" description="Agendamentos recentes do período">
          <div className="md:hidden space-y-2">
            {bookings.slice(0, 5).map((booking, i) => (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-3 rounded-xl bg-zinc-800/20 hover:bg-zinc-800/30 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-zinc-200">{booking.customer?.name}</p>
                    <p className="text-[10px] text-zinc-600">{booking.service?.name}</p>
                  </div>
                  <Badge variant={booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px] px-2 py-0.5">{statusLabel(booking.status)}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-600 tabular-nums">{format(new Date(booking.starts_at), "dd/MM/yyyy HH:mm")}</span>
                  <span className="font-bold text-emerald-400 tabular-nums">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-zinc-800/30 hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider text-zinc-600">Cliente</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-zinc-600">Data/Hora</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-zinc-600">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 5).map((booking) => (
                  <TableRow key={booking.id} className="border-zinc-800/20 hover:bg-zinc-800/20 transition-colors">
                    <TableCell>
                      <p className="font-medium text-zinc-200">{booking.customer?.name}</p>
                      <p className="text-xs text-zinc-600">{booking.service?.name}</p>
                    </TableCell>
                    <TableCell className="tabular-nums">
                      <p className="text-zinc-300">{format(new Date(booking.starts_at), "dd/MM/yyyy")}</p>
                      <p className="text-zinc-600 text-xs">{format(new Date(booking.starts_at), "HH:mm")}</p>
                    </TableCell>
                    <TableCell className="text-right">
                      <p className="font-bold tabular-nums text-zinc-100">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</p>
                      <Badge variant={booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px] px-2 py-0.5">{statusLabel(booking.status)}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartCard>
      </Section>
    </motion.div>
  );
}
