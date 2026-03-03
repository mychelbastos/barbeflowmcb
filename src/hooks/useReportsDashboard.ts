import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ReportDateRange } from "@/components/reports/ReportPeriodFilter";
import { subDays, differenceInDays, parseISO } from "date-fns";

interface DashboardData {
  revenue: number;
  completedBookings: number;
  uniqueClients: number;
  newClients: number;
  cancelledBookings: number;
  paymentMethods: { name: string; value: number }[];
  topServices: { name: string; count: number; revenue: number }[];
  staffRevenue: { name: string; revenue: number; bookings: number }[];
  topClients: { name: string; count: number }[];
  dailyBookings: { date: string; count: number }[];
  genderBreakdown: { name: string; value: number }[];
  peakHours: { hour: string; count: number }[];
}

interface PrevPeriodData {
  revenue: number;
  completedBookings: number;
  uniqueClients: number;
  cancelledBookings: number;
}

function getPrevRange(range: ReportDateRange): ReportDateRange {
  const start = parseISO(range.startDate);
  const end = parseISO(range.endDate);
  const days = differenceInDays(end, start) + 1;
  const prevEnd = subDays(start, 1);
  const prevStart = subDays(prevEnd, days - 1);
  return {
    startDate: prevStart.toISOString(),
    endDate: prevEnd.toISOString(),
  };
}

async function fetchDashboard(tenantId: string, range: ReportDateRange): Promise<DashboardData> {
  const { startDate, endDate } = range;

  const [
    revenueRes,
    bookingsRes,
    cancelledRes,
    paymentRes,
    serviceItemsRes,
    staffItemsRes,
    customersRes,
    allCustomersGender,
  ] = await Promise.all([
    supabase
      .from("cash_entries")
      .select("amount_cents")
      .eq("tenant_id", tenantId)
      .eq("kind", "income")
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    supabase
      .from("bookings")
      .select("customer_id, starts_at")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("starts_at", startDate)
      .lte("starts_at", endDate),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "cancelled")
      .gte("starts_at", startDate)
      .lte("starts_at", endDate),
    supabase
      .from("cash_entries")
      .select("payment_method, amount_cents")
      .eq("tenant_id", tenantId)
      .eq("kind", "income")
      .gte("occurred_at", startDate)
      .lte("occurred_at", endDate),
    supabase
      .from("booking_items")
      .select("title, quantity, booking_id")
      .eq("tenant_id", tenantId)
      .eq("type", "service"),
    supabase
      .from("booking_items")
      .select("staff_id, unit_price_cents, quantity, booking_id")
      .eq("tenant_id", tenantId)
      .not("staff_id", "is", null),
    supabase
      .from("customers")
      .select("id, created_at")
      .eq("tenant_id", tenantId)
      .gte("created_at", startDate)
      .lte("created_at", endDate),
    supabase
      .from("customers")
      .select("gender")
      .eq("tenant_id", tenantId),
  ]);

  // Revenue
  const revenue = revenueRes.data?.reduce((s, e) => s + e.amount_cents, 0) || 0;

  // Completed bookings & unique clients
  const completedBookings = bookingsRes.data?.length || 0;
  const uniqueClientIds = new Set(bookingsRes.data?.map((b) => b.customer_id));
  const uniqueClients = uniqueClientIds.size;

  // New clients
  const newClients = customersRes.data?.length || 0;

  // Cancelled
  const cancelledBookings = cancelledRes.count || 0;

  // Payment methods
  const pmMap = new Map<string, number>();
  const pmLabels: Record<string, string> = {
    cash: "Dinheiro",
    pix: "PIX",
    credit_card: "Crédito",
    debit_card: "Débito",
    online: "Online (MP)",
  };
  paymentRes.data?.forEach((e) => {
    const key = e.payment_method || "cash";
    pmMap.set(key, (pmMap.get(key) || 0) + e.amount_cents);
  });
  const paymentMethods = Array.from(pmMap.entries())
    .map(([k, v]) => ({ name: pmLabels[k] || k, value: v }))
    .sort((a, b) => b.value - a.value);

  // We need booking IDs for period to filter items
  const periodBookingIds = new Set(bookingsRes.data?.map((b) => b.customer_id ? undefined : undefined));
  
  // For services and staff, we need to cross-reference with bookings in period
  // Fetch booking ids for period
  const { data: periodBookings } = await supabase
    .from("bookings")
    .select("id, customer_id, starts_at")
    .eq("tenant_id", tenantId)
    .in("status", ["completed", "confirmed"])
    .eq("comanda_status", "closed")
    .gte("starts_at", startDate)
    .lte("starts_at", endDate);

  const bookingIdSet = new Set(periodBookings?.map((b) => b.id) || []);

  // Top services
  const svcMap = new Map<string, { count: number; revenue: number }>();
  serviceItemsRes.data?.forEach((item) => {
    if (!bookingIdSet.has(item.booking_id)) return;
    const cur = svcMap.get(item.title) || { count: 0, revenue: 0 };
    cur.count += item.quantity;
    svcMap.set(item.title, cur);
  });
  const topServices = Array.from(svcMap.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Staff revenue
  const { data: staffList } = await supabase
    .from("staff")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("active", true);

  const staffMap = new Map<string, { name: string; revenue: number; bookings: number }>();
  staffList?.forEach((s) => staffMap.set(s.id, { name: s.name, revenue: 0, bookings: 0 }));

  staffItemsRes.data?.forEach((item) => {
    if (!bookingIdSet.has(item.booking_id)) return;
    if (!item.staff_id) return;
    const cur = staffMap.get(item.staff_id);
    if (cur) {
      cur.revenue += item.unit_price_cents * item.quantity;
      cur.bookings += 1;
    }
  });
  const staffRevenue = Array.from(staffMap.values())
    .filter((s) => s.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue);

  // Top clients
  const clientCountMap = new Map<string, number>();
  periodBookings?.forEach((b) => {
    clientCountMap.set(b.customer_id, (clientCountMap.get(b.customer_id) || 0) + 1);
  });
  const topClientIds = Array.from(clientCountMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  let topClients: { name: string; count: number }[] = [];
  if (topClientIds.length > 0) {
    const { data: clientNames } = await supabase
      .from("customers")
      .select("id, name")
      .in("id", topClientIds.map(([id]) => id));
    const nameMap = new Map(clientNames?.map((c) => [c.id, c.name]) || []);
    topClients = topClientIds.map(([id, count]) => ({
      name: nameMap.get(id) || "Desconhecido",
      count,
    }));
  }

  // Daily bookings
  const dayMap = new Map<string, number>();
  periodBookings?.forEach((b) => {
    const day = b.starts_at.slice(0, 10);
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });
  const dailyBookings = Array.from(dayMap.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Gender breakdown
  const gMap = new Map<string, number>();
  const gLabels: Record<string, string> = { M: "Masculino", F: "Feminino", O: "Outro" };
  allCustomersGender.data?.forEach((c) => {
    const key = c.gender || "N";
    gMap.set(key, (gMap.get(key) || 0) + 1);
  });
  const genderBreakdown = Array.from(gMap.entries())
    .map(([k, v]) => ({ name: gLabels[k] || "Não informado", value: v }))
    .sort((a, b) => b.value - a.value);

  // Peak hours
  const hourMap = new Map<number, number>();
  periodBookings?.forEach((b) => {
    const h = new Date(b.starts_at).getHours();
    hourMap.set(h, (hourMap.get(h) || 0) + 1);
  });
  const peakHours = Array.from(hourMap.entries())
    .map(([h, count]) => ({ hour: `${h}h`, count }))
    .sort((a, b) => parseInt(a.hour) - parseInt(b.hour));

  return {
    revenue,
    completedBookings,
    uniqueClients,
    newClients,
    cancelledBookings,
    paymentMethods,
    topServices,
    staffRevenue,
    topClients,
    dailyBookings,
    genderBreakdown,
    peakHours,
  };
}

async function fetchPrevPeriod(tenantId: string, range: ReportDateRange): Promise<PrevPeriodData> {
  const prev = getPrevRange(range);

  const [revenueRes, bookingsRes, cancelledRes] = await Promise.all([
    supabase
      .from("cash_entries")
      .select("amount_cents")
      .eq("tenant_id", tenantId)
      .eq("kind", "income")
      .gte("occurred_at", prev.startDate)
      .lte("occurred_at", prev.endDate),
    supabase
      .from("bookings")
      .select("customer_id")
      .eq("tenant_id", tenantId)
      .eq("status", "completed")
      .gte("starts_at", prev.startDate)
      .lte("starts_at", prev.endDate),
    supabase
      .from("bookings")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "cancelled")
      .gte("starts_at", prev.startDate)
      .lte("starts_at", prev.endDate),
  ]);

  return {
    revenue: revenueRes.data?.reduce((s, e) => s + e.amount_cents, 0) || 0,
    completedBookings: bookingsRes.data?.length || 0,
    uniqueClients: new Set(bookingsRes.data?.map((b) => b.customer_id)).size,
    cancelledBookings: cancelledRes.count || 0,
  };
}

export function useReportsDashboard(tenantId: string, range: ReportDateRange, compareEnabled: boolean) {
  const dashboard = useQuery({
    queryKey: ["reports-dashboard", tenantId, range.startDate, range.endDate],
    queryFn: () => fetchDashboard(tenantId, range),
    enabled: !!tenantId,
    staleTime: 5 * 60 * 1000,
  });

  const prevPeriod = useQuery({
    queryKey: ["reports-dashboard-prev", tenantId, range.startDate, range.endDate],
    queryFn: () => fetchPrevPeriod(tenantId, range),
    enabled: !!tenantId && compareEnabled,
    staleTime: 5 * 60 * 1000,
  });

  return { dashboard, prevPeriod };
}

export function calcChange(current: number, previous: number): { text: string; type: "positive" | "negative" | "neutral" } {
  if (previous === 0) return { text: "", type: "neutral" };
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct > 0) return { text: `↑ +${pct}%`, type: "positive" };
  if (pct < 0) return { text: `↓ ${pct}%`, type: "negative" };
  return { text: "= 0%", type: "neutral" };
}
