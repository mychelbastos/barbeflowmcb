import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { supabase } from "@/integrations/supabase/client";
import { NoTenantState } from "@/components/NoTenantState";
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
  Package, ShoppingCart, ArrowUp, ArrowDown, BarChart3, Sparkles, Activity, Zap, AlertTriangle,
} from "lucide-react";
import { format, subDays, differenceInCalendarDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";

import { UnifiedFilters } from "@/components/finance/UnifiedFilters";
import { RevenueHeatmap } from "@/components/finance/RevenueHeatmap";
import { PeriodComparisonChart } from "@/components/finance/PeriodComparisonChart";
import { BookingStatusChart } from "@/components/finance/BookingStatusChart";
import { useCashRevenue } from "@/hooks/useCashRevenue";

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

const tooltipStyle = {
  backgroundColor: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 14,
  boxShadow: "0 12px 40px -8px hsl(var(--foreground) / 0.1)",
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
          ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
          : "text-red-600 dark:text-red-400 bg-red-500/10 border border-red-500/20"
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
            <div className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center backdrop-blur-sm">
              <Icon className={`h-[18px] w-[18px] ${iconColor}`} />
            </div>
            {variation && <VariationBadge current={variation.current} previous={variation.previous} />}
          </div>
          <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-none mb-1">{value}</p>
          <p className="text-[11px] text-muted-foreground font-medium">{label}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground/80 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </motion.div>
  );
}

function Section({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div variants={sectionVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} className={className}>
      {children}
    </motion.div>
  );
}

function ChartCard({ icon: Icon, iconColor, iconBg, title, description, children }: {
  icon: any; iconColor: string; iconBg: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl glass-panel overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
        <div className={`w-8 h-8 rounded-xl ${iconBg} flex items-center justify-center`}>
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground tracking-tight">{title}</h3>
          {description && <p className="text-[11px] text-muted-foreground">{description}</p>}
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
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [staff, setStaff] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [allBookingsForStatus, setAllBookingsForStatus] = useState<any[]>([]);
  const [paymentsInPeriod, setPaymentsInPeriod] = useState<any[]>([]);
  const [staffDetails, setStaffDetails] = useState<any[]>([]);
  const [staffServicesMap, setStaffServicesMap] = useState<Record<string, number>>({});
  const [openBalance, setOpenBalance] = useState(0);
  const [topServices, setTopServices] = useState<{ name: string; revenue: number; count: number }[]>([]);
  const [staffPerformance, setStaffPerformance] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; revenue: number; profit: number; quantity: number }[]>([]);
  const [productRevenue, setProductRevenue] = useState(0);
  const [productProfit, setProductProfit] = useState(0);

  // Previous period for variation badges
  const periodDays = differenceInCalendarDays(dateRange.to, dateRange.from) + 1;
  const prevFrom = subDays(dateRange.from, periodDays);
  const prevTo = subDays(dateRange.to, periodDays);

  // Cash revenue - current period (source of truth)
  const { data: cashData, loading: cashLoading } = useCashRevenue({
    tenantId: currentTenant?.id,
    dateRange,
    staffFilter,
  });

  // Cash revenue - previous period (for variation badges)
  const { data: prevCashData } = useCashRevenue({
    tenantId: currentTenant?.id,
    dateRange: { from: prevFrom, to: prevTo },
    staffFilter,
  });

  useEffect(() => {
    if (currentTenant) { loadSupportData(); loadStaff(); }
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

  // Load supplementary data (bookings for status chart, top services, staff performance, products)
  const loadSupportData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);

      let query = supabase.from("bookings").select(`*, service:services(name, price_cents, id), staff:staff(name, id), customer:customers(name, phone)`)
        .eq("tenant_id", currentTenant.id).in("status", ["confirmed", "completed"])
        .gte("starts_at", dateRange.from.toISOString()).lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") query = query.eq("staff_id", staffFilter);

      let allQuery = supabase.from("bookings").select("id, status, starts_at")
        .eq("tenant_id", currentTenant.id)
        .gte("starts_at", dateRange.from.toISOString()).lte("starts_at", dateRange.to.toISOString());
      if (staffFilter && staffFilter !== "all") allQuery = allQuery.eq("staff_id", staffFilter);

      const [{ data: bookingsData }, { data: allBookingsData }, { data: paymentsData }] = await Promise.all([
        query.order("starts_at"),
        allQuery,
        supabase.from("payments").select("amount_cents, status, booking_id").eq("tenant_id", currentTenant.id).gte("created_at", dateRange.from.toISOString()).lte("created_at", dateRange.to.toISOString()),
      ]);

      setBookings(bookingsData || []);
      setAllBookingsForStatus(allBookingsData || []);
      setPaymentsInPeriod(paymentsData || []);

      // Top services (still based on bookings for service breakdown)
      const serviceStats = (bookingsData || []).reduce((acc: any, b: any) => {
        const name = b.service?.name || "Serviço"; const price = b.service?.price_cents || 0;
        if (!acc[name]) acc[name] = { name, revenue: 0, count: 0 }; acc[name].revenue += price; acc[name].count += 1; return acc;
      }, {});
      setTopServices(Object.values(serviceStats).sort((a: any, b: any) => b.revenue - a.revenue).slice(0, 5) as any);

      // Staff performance
      const staffStats = (bookingsData || []).reduce((acc: any, b: any) => {
        const name = b.staff?.name || "Staff"; const staffId = b.staff?.id || ""; const price = b.service?.price_cents || 0;
        if (!acc[name]) acc[name] = { name, revenue: 0, bookings: 0, staffId }; acc[name].revenue += price; acc[name].bookings += 1; return acc;
      }, {});
      setStaffPerformance(Object.values(staffStats).sort((a: any, b: any) => b.revenue - a.revenue) as any);

      // Products
      const { data: productSales } = await supabase.from("product_sales").select("sale_price_snapshot_cents, purchase_price_snapshot_cents, quantity, product:products(name)")
        .eq("tenant_id", currentTenant.id).gte("sale_date", dateRange.from.toISOString()).lte("sale_date", dateRange.to.toISOString());
      const pRev = productSales?.reduce((s, ps) => s + ps.sale_price_snapshot_cents * ps.quantity, 0) || 0;
      const pProfit = productSales?.reduce((s, ps) => s + (ps.sale_price_snapshot_cents - ps.purchase_price_snapshot_cents) * ps.quantity, 0) || 0;
      setProductRevenue(pRev);
      setProductProfit(pProfit);
      const productStats = (productSales || []).reduce((acc: any, sale: any) => {
        const n = sale.product?.name || "Produto"; const rev = sale.sale_price_snapshot_cents * sale.quantity;
        const prof = (sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity;
        if (!acc[n]) acc[n] = { name: n, revenue: 0, profit: 0, quantity: 0 }; acc[n].revenue += rev; acc[n].profit += prof; acc[n].quantity += sale.quantity; return acc;
      }, {});
      setTopProducts(Object.values(productStats).sort((a: any, b: any) => b.quantity - a.quantity).slice(0, 5) as any);

      // Open balance
      const { data: balances } = await supabase.from("customer_balance_entries").select("type, amount_cents").eq("tenant_id", currentTenant.id);
      const totalCredits = (balances || []).filter((b: any) => b.type === "credit").reduce((s: number, b: any) => s + b.amount_cents, 0);
      const totalDebits = (balances || []).filter((b: any) => b.type === "debit").reduce((s: number, b: any) => s + b.amount_cents, 0);
      setOpenBalance(totalDebits - totalCredits);
    } catch (error) { console.error("Error loading finance data:", error); } finally { setLoading(false); }
  };

  const dailyAvg = useMemo(() => {
    if (!cashData?.dailyIncome) return 0;
    const withData = cashData.dailyIncome.filter((d) => d.income > 0);
    return withData.length === 0 ? 0 : withData.reduce((s, d) => s + d.income, 0) / withData.length;
  }, [cashData]);

  const staffWithCommission = useMemo(() => {
    if (!staffPerformance.length) return [];
    const maxRev = Math.max(...staffPerformance.map((s: any) => s.revenue), 1);
    return staffPerformance.map((sp: any) => {
      const detail = staffDetails.find((sd) => sd.id === sp.staffId);
      const commPct = detail?.default_commission_percent || 0;
      const ticketMedio = sp.bookings > 0 ? sp.revenue / sp.bookings : 0;
      const comissao = (sp.revenue * commPct) / 100;
      const progressPct = (sp.revenue / maxRev) * 100;
      return { ...sp, ticketMedio, comissao, progressPct, commPct, isTop: sp.revenue === maxRev };
    });
  }, [staffPerformance, staffDetails]);

  const exportToCSV = () => {
    if (bookings.length === 0) return;
    const csvContent = [
      ["Data", "Cliente", "Serviço", "Profissional", "Valor", "Status"],
      ...bookings.map((b) => [
        format(new Date(b.starts_at), "dd/MM/yyyy HH:mm"), b.customer?.name || "", b.service?.name || "", b.staff?.name || "",
        `R$ ${((b.service?.price_cents || 0) / 100).toFixed(2)}`,
        b.status === "completed" ? "Concluído" : b.status === "confirmed" ? "Confirmado" : b.status,
      ]),
    ].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a"); const url = URL.createObjectURL(blob);
    link.setAttribute("href", url); link.setAttribute("download", `financeiro-${format(new Date(), "yyyy-MM-dd")}.csv`);
    link.style.visibility = "hidden"; document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const isLoading = tenantLoading || loading || cashLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 px-4 md:px-0">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted/30 rounded-xl animate-pulse" />
          <div className="h-4 w-72 bg-muted/20 rounded-lg animate-pulse" />
        </div>
        <div className="h-14 bg-muted/20 rounded-2xl animate-pulse" />
        <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-muted/20 rounded-2xl animate-pulse" style={{ animationDelay: `${i * 80}ms` }} />
          ))}
        </div>
        <div className="h-72 bg-muted/20 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const fmtCents = (v: number) => `R$ ${(v / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}`;
  const statusLabel = (s: string) => s === "completed" ? "Concluído" : s === "confirmed" ? "Confirmado" : s === "cancelled" ? "Cancelado" : s === "no_show" ? "Faltou" : s;

  return (
    <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-5 md:space-y-7 px-4 md:px-0 pb-8">
      {/* Header */}
      <motion.div variants={fadeUp} className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/10 flex items-center justify-center">
          <Activity className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground tracking-tight">Financeiro</h1>
          <p className="text-xs md:text-sm text-muted-foreground">Receita real baseada em cash_entries</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={fadeUp}>
        <UnifiedFilters staff={staff} staffFilter={staffFilter} onStaffFilterChange={setStaffFilter} onExportPDF={exportToCSV} hasData={bookings.length > 0} />
      </motion.div>

      {/* KPI Cards — all from cash_entries */}
      <motion.div variants={stagger} className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <KpiCard
          label="Receita Real"
          value={fmtCents(cashData?.totalIncome || 0)}
          subtitle="Pagamentos confirmados"
          icon={DollarSign}
          gradient="from-primary/15 to-primary/5"
          iconColor="text-primary"
          variation={prevCashData ? { current: cashData?.totalIncome || 0, previous: prevCashData.totalIncome } : undefined}
        />
        <KpiCard
          label="Agendamentos"
          value={`${bookings.length}`}
          icon={Calendar}
          gradient="from-violet-500/15 to-violet-600/5"
          iconColor="text-violet-500"
        />
        <KpiCard
          label="Ticket Médio"
          value={fmtCents(cashData?.avgTicket || 0)}
          subtitle={`${cashData?.closedComandas || 0} comandas fechadas`}
          icon={Wallet}
          gradient="from-amber-500/15 to-amber-600/5"
          iconColor="text-amber-500"
          variation={prevCashData ? { current: cashData?.avgTicket || 0, previous: prevCashData.avgTicket } : undefined}
        />
        <KpiCard
          label="Em Aberto"
          value={fmtCents(openBalance)}
          subtitle="Saldo pendente clientes"
          icon={AlertTriangle}
          gradient="from-red-500/15 to-red-600/5"
          iconColor="text-red-500"
        />
      </motion.div>

      {/* Product KPIs */}
      {productRevenue > 0 && (
        <Section>
          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <KpiCard label="Fat. Produtos" value={fmtCents(productRevenue)} icon={ShoppingCart} gradient="from-cyan-500/15 to-cyan-600/5" iconColor="text-cyan-500" />
            <KpiCard label="Lucro Produtos" value={fmtCents(productProfit)} subtitle={productRevenue > 0 ? `${((productProfit / productRevenue) * 100).toFixed(0)}% margem` : "0%"} icon={TrendingUp} gradient="from-primary/15 to-primary/5" iconColor="text-primary" />
          </div>
        </Section>
      )}

      {/* Daily Revenue Chart — from cash_entries */}
      {cashData && (
        <Section>
          <ChartCard icon={Zap} iconColor="text-primary" iconBg="bg-primary/10" title="Receita Diária" description="Baseado em cash_entries">
            <ResponsiveContainer width="100%" height={280} className="md:!h-[320px]">
              <ComposedChart data={cashData.dailyIncome.filter((d) => d.income > 0)}>
                <defs>
                  <linearGradient id="areaGradIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={50} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11, marginBottom: 4 }} formatter={(value: number) => [`R$ ${value.toFixed(2)}`, "Receita"]} />
                {dailyAvg > 0 && <ReferenceLine y={dailyAvg} stroke="hsl(var(--muted-foreground))" strokeDasharray="5 5" strokeOpacity={0.8} label={{ value: `Média: R$ ${dailyAvg.toFixed(0)}`, position: "insideTopRight", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />}
                <Area type="monotone" dataKey="income" fill="url(#areaGradIncome)" stroke="transparent" />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={false} name="income" />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartCard>
        </Section>
      )}

      {/* Heatmap */}
      <Section><RevenueHeatmap bookings={bookings} /></Section>

      {/* Period Comparison */}
      {prevCashData && cashData && (
        <Section>
          <PeriodComparisonChart
            currentDaily={cashData.dailyIncome.map(d => ({ date: d.date, expected: d.income, received: d.income }))}
            previousDaily={prevCashData.dailyIncome.map(d => ({ date: d.date, expected: d.income, received: d.income }))}
          />
        </Section>
      )}

      {/* Top Services + Status */}
      <Section>
        <div className="grid gap-4 md:gap-5 grid-cols-1 lg:grid-cols-2">
          <ChartCard icon={Sparkles} iconColor="text-violet-500" iconBg="bg-violet-500/10" title="Top Serviços" description="Por faturamento no período">
            {/* Mobile */}
            <div className="md:hidden space-y-2">
              {topServices.map((service, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>{index + 1}</div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{service.name}</p>
                      <p className="text-[10px] text-muted-foreground">{service.count} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary tabular-nums">R$ {(service.revenue / 100).toFixed(0)}</span>
                </motion.div>
              ))}
              {topServices.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado</p>}
            </div>
            {/* Desktop */}
            <div className="hidden md:block">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topServices} barSize={36}>
                  <defs>
                    {COLORS.map((c, i) => (
                      <linearGradient key={i} id={`barGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={c} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={c} stopOpacity={0.4} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.6} />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} labelStyle={{ color: "hsl(var(--muted-foreground))", fontSize: 11 }} itemStyle={{ color: "hsl(var(--primary))", fontSize: 12, fontWeight: 700 }} formatter={(value: number) => [`R$ ${(value / 100).toFixed(2)}`, "Faturamento"]} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
                  <Bar dataKey="revenue" radius={[8, 8, 0, 0]}>
                    {topServices.map((_, index) => (
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
        <ChartCard icon={Users} iconColor="text-blue-500" iconBg="bg-blue-500/10" title="Performance da Equipe" description="Faturamento, ticket médio e comissão">
          <div className="md:hidden space-y-2">
            {staffWithCommission.map((sp, index) => (
              <motion.div key={index} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04 }}
                className={`p-3.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors space-y-2.5 ${sp.isTop ? "border border-emerald-500/20 bg-emerald-500/[0.03]" : ""}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${sp.isTop ? "bg-primary/10" : "bg-muted"}`}>
                      <Users className={`h-4 w-4 ${sp.isTop ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{sp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{sp.bookings} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-bold text-sm text-primary tabular-nums">R$ {(sp.revenue / 100).toFixed(0)}</span>
                </div>
                <Progress value={sp.progressPct} className="h-1.5" />
                <div className="flex justify-between text-[10px] text-muted-foreground">
                  <span>Ticket: R$ {(sp.ticketMedio / 100).toFixed(0)}</span>
                  <span>Comissão ({sp.commPct}%): R$ {(sp.comissao / 100).toFixed(0)}</span>
                </div>
              </motion.div>
            ))}
            {staffWithCommission.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Nenhum dado</p>}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Profissional</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Agendamentos</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Faturamento</TableHead>
                  <TableHead className="w-36 text-[11px] uppercase tracking-wider text-muted-foreground">Progresso</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Ticket Médio</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Comissão Est.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staffWithCommission.map((sp, index) => (
                  <TableRow key={index} className={`border-border/50 hover:bg-muted/30 transition-colors ${sp.isTop ? "bg-emerald-500/[0.03]" : ""}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2.5">
                        {sp.isTop && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                        <span className="text-foreground">{sp.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-foreground/80">{sp.bookings}</TableCell>
                    <TableCell className="text-right font-bold tabular-nums text-foreground">R$ {(sp.revenue / 100).toFixed(2)}</TableCell>
                    <TableCell><Progress value={sp.progressPct} className="h-1.5" /></TableCell>
                    <TableCell className="text-right tabular-nums text-foreground/80">R$ {(sp.ticketMedio / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right text-muted-foreground tabular-nums">R$ {(sp.comissao / 100).toFixed(2)} <span className="text-[10px] text-muted-foreground/70">({sp.commPct}%)</span></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </ChartCard>
      </Section>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <Section>
          <ChartCard icon={Package} iconColor="text-amber-500" iconBg="bg-amber-500/10" title="Produtos Mais Vendidos" description="Por quantidade no período">
            <div className="md:hidden space-y-2">
              {topProducts.map((product, index) => (
                <motion.div key={index} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.04 }} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold" style={{ backgroundColor: `${COLORS[index % COLORS.length]}15`, color: COLORS[index % COLORS.length] }}>{index + 1}</div>
                    <div>
                      <p className="font-semibold text-sm text-foreground">{product.name}</p>
                      <p className="text-[10px] text-muted-foreground">{product.quantity} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sm text-foreground block tabular-nums">R$ {(product.revenue / 100).toFixed(0)}</span>
                    <span className="text-[10px] text-primary font-medium">+R$ {(product.profit / 100).toFixed(0)}</span>
                  </div>
                </motion.div>
              ))}
            </div>
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Produto</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Quantidade</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Faturamento</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product, index) => (
                    <TableRow key={index} className="border-border/50 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium text-foreground">{product.name}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">{product.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">R$ {(product.revenue / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-primary font-medium tabular-nums">R$ {(product.profit / 100).toFixed(2)}</TableCell>
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
        <ChartCard icon={Calendar} iconColor="text-blue-500" iconBg="bg-blue-500/10" title="Últimos Agendamentos" description="Agendamentos recentes do período">
          <div className="md:hidden space-y-2">
            {bookings.slice(0, 5).map((booking, i) => (
              <motion.div key={booking.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{booking.customer?.name}</p>
                    <p className="text-[10px] text-muted-foreground">{booking.service?.name}</p>
                  </div>
                  <Badge variant={booking.status === "confirmed" ? "default" : booking.status === "cancelled" ? "destructive" : "secondary"} className="text-[10px] px-2 py-0.5">{statusLabel(booking.status)}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground tabular-nums">{format(new Date(booking.starts_at), "dd/MM/yyyy HH:mm")}</span>
                  <span className="font-bold text-emerald-500 tabular-nums">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Cliente</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Serviço</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Profissional</TableHead>
                  <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground">Data/Hora</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Valor</TableHead>
                  <TableHead className="text-right text-[11px] uppercase tracking-wider text-muted-foreground">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.slice(0, 5).map((booking, i) => (
                  <TableRow key={booking.id} className="border-border/50 hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium text-foreground">{booking.customer?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{booking.service?.name}</TableCell>
                    <TableCell className="text-muted-foreground">{booking.staff?.name}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{format(new Date(booking.starts_at), "dd/MM HH:mm")}</TableCell>
                    <TableCell className="text-right font-bold text-foreground tabular-nums">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</TableCell>
                    <TableCell className="text-right"><Badge variant="outline" className="text-[10px]">{statusLabel(booking.status)}</Badge></TableCell>
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
