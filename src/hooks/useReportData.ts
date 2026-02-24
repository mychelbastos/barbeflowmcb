import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Revenue Evolution ──
export function useRevenueEvolution(tenantId: string, start: string, end: string) {
  return useQuery({
    queryKey: ["rpt-revenue-evolution", tenantId, start, end],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, starts_at, booking_items(total_price_cents)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("starts_at", start)
        .lt("starts_at", end);

      if (!bookings) return [];

      const monthly: Record<string, { month: string; revenue: number; orders: number; totals: number[] }> = {};
      for (const b of bookings) {
        const m = format(new Date(b.starts_at), "yyyy-MM");
        if (!monthly[m]) monthly[m] = { month: m, revenue: 0, orders: 0, totals: [] };
        const total = (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
        monthly[m].revenue += total;
        monthly[m].orders += 1;
        monthly[m].totals.push(total);
      }

      return Object.values(monthly)
        .sort((a, b) => a.month.localeCompare(b.month))
        .map((m) => ({
          month: m.month,
          label: format(parseISO(m.month + "-01"), "MMM/yy", { locale: ptBR }),
          revenue: m.revenue,
          orders: m.orders,
          avgTicket: m.orders > 0 ? Math.round(m.revenue / m.orders) : 0,
        }));
    },
    enabled: !!tenantId,
  });
}

// ── Payment Methods ──
export function usePaymentMethodReport(tenantId: string, start: string, end: string) {
  return useQuery({
    queryKey: ["rpt-payment-methods", tenantId, start, end],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_entries")
        .select("payment_method, amount_cents")
        .eq("tenant_id", tenantId)
        .eq("kind", "income")
        .gte("occurred_at", start)
        .lt("occurred_at", end);

      if (!data) return [];

      const grouped: Record<string, { method: string; count: number; total: number }> = {};
      for (const e of data) {
        const m = e.payment_method || "other";
        if (!grouped[m]) grouped[m] = { method: m, count: 0, total: 0 };
        grouped[m].count += 1;
        grouped[m].total += e.amount_cents;
      }

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: !!tenantId,
  });
}

// ── Cash Flow ──
export function useCashFlowReport(tenantId: string, start: string, end: string) {
  return useQuery({
    queryKey: ["rpt-cashflow", tenantId, start, end],
    queryFn: async () => {
      const { data } = await supabase
        .from("cash_entries")
        .select("id, kind, source, payment_method, amount_cents, occurred_at, notes, staff_id, staff:staff_id(name)")
        .eq("tenant_id", tenantId)
        .gte("occurred_at", start)
        .lt("occurred_at", end)
        .order("occurred_at", { ascending: false });

      return data || [];
    },
    enabled: !!tenantId,
  });
}

// ── Staff Revenue ──
export function useStaffRevenueReport(tenantId: string, start: string, end: string) {
  return useQuery({
    queryKey: ["rpt-staff-revenue", tenantId, start, end],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, staff_id, staff:staff_id(name, photo_url), booking_items(total_price_cents)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("starts_at", start)
        .lt("starts_at", end);

      if (!bookings) return [];

      const grouped: Record<string, { staffId: string; name: string; photo: string | null; orders: number; revenue: number }> = {};
      for (const b of bookings) {
        if (!b.staff_id) continue;
        const staffData = b.staff as any;
        const name = staffData?.name || "Sem profissional";
        const photo = staffData?.photo_url || null;
        if (!grouped[b.staff_id]) grouped[b.staff_id] = { staffId: b.staff_id, name, photo, orders: 0, revenue: 0 };
        const total = (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
        grouped[b.staff_id].revenue += total;
        grouped[b.staff_id].orders += 1;
      }

      return Object.values(grouped).sort((a, b) => b.revenue - a.revenue);
    },
    enabled: !!tenantId,
  });
}

// ── Staff Services ──
export function useStaffServicesReport(tenantId: string, start: string, end: string, staffId?: string | null) {
  return useQuery({
    queryKey: ["rpt-staff-services", tenantId, start, end, staffId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, staff_id, staff:staff_id(name), service_id, service:service_id(name), booking_items(total_price_cents, type)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("starts_at", start)
        .lt("starts_at", end);

      if (staffId && staffId !== "all") q = q.eq("staff_id", staffId);

      const { data: bookings } = await q;
      if (!bookings) return [];

      const grouped: Record<string, { staffName: string; serviceName: string; count: number; revenue: number }> = {};
      for (const b of bookings) {
        const sn = (b.staff as any)?.name || "—";
        const svn = (b.service as any)?.name || "—";
        const key = `${b.staff_id}_${b.service_id}`;
        if (!grouped[key]) grouped[key] = { staffName: sn, serviceName: svn, count: 0, revenue: 0 };
        const svcItems = (b.booking_items || []).filter((i: any) => i.type === "service");
        grouped[key].count += 1;
        grouped[key].revenue += svcItems.reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
      }

      return Object.values(grouped).sort((a, b) => b.count - a.count);
    },
    enabled: !!tenantId,
  });
}

// ── Staff Clients ──
export function useStaffClientsReport(tenantId: string, start: string, end: string, staffId?: string | null) {
  return useQuery({
    queryKey: ["rpt-staff-clients", tenantId, start, end, staffId],
    queryFn: async () => {
      let q = supabase
        .from("bookings")
        .select("id, staff_id, staff:staff_id(name), customer_id, customer:customer_id(name, phone, email), booking_items(total_price_cents)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .gte("starts_at", start)
        .lt("starts_at", end);

      if (staffId && staffId !== "all") q = q.eq("staff_id", staffId);

      const { data: bookings } = await q;
      if (!bookings) return [];

      const grouped: Record<string, { staffName: string; customerName: string; phone: string; email: string; count: number; total: number }> = {};
      for (const b of bookings) {
        const sn = (b.staff as any)?.name || "—";
        const c = b.customer as any;
        const key = `${b.staff_id}_${b.customer_id}`;
        if (!grouped[key]) grouped[key] = { staffName: sn, customerName: c?.name || "—", phone: c?.phone || "", email: c?.email || "", count: 0, total: 0 };
        grouped[key].count += 1;
        grouped[key].total += (b.booking_items || []).reduce((s: number, i: any) => s + (i.total_price_cents || 0), 0);
      }

      return Object.values(grouped).sort((a, b) => b.total - a.total);
    },
    enabled: !!tenantId,
  });
}

// ── Birthday Clients ──
export function useBirthdayClientsReport(tenantId: string, month: number) {
  return useQuery({
    queryKey: ["rpt-birthdays", tenantId, month],
    queryFn: async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email, birthday")
        .eq("tenant_id", tenantId)
        .not("birthday", "is", null);

      if (!customers) return [];

      const filtered = customers.filter((c) => {
        if (!c.birthday) return false;
        const d = new Date(c.birthday);
        return d.getMonth() + 1 === month;
      });

      // Get last booking for each
      const ids = filtered.map((c) => c.id);
      const { data: bookings } = await supabase
        .from("bookings")
        .select("customer_id, starts_at")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .in("customer_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"])
        .order("starts_at", { ascending: false });

      const lastVisit: Record<string, string> = {};
      for (const b of bookings || []) {
        if (!lastVisit[b.customer_id]) lastVisit[b.customer_id] = b.starts_at;
      }

      return filtered
        .map((c) => ({ ...c, lastVisit: lastVisit[c.id] || null }))
        .sort((a, b) => {
          const da = new Date(a.birthday!).getDate();
          const db = new Date(b.birthday!).getDate();
          return da - db;
        });
    },
    enabled: !!tenantId && month > 0,
  });
}

// ── Inactive Clients ──
export function useInactiveClientsReport(tenantId: string, daysThreshold: number) {
  return useQuery({
    queryKey: ["rpt-inactive", tenantId, daysThreshold],
    queryFn: async () => {
      const { data: bookings } = await supabase
        .from("bookings")
        .select("customer_id, starts_at, service:service_id(name), customer:customer_id(name, phone, email)")
        .eq("tenant_id", tenantId)
        .eq("status", "completed")
        .order("starts_at", { ascending: false });

      if (!bookings) return [];

      const latest: Record<string, { customerName: string; phone: string; email: string; lastVisit: string; lastService: string }> = {};
      for (const b of bookings) {
        if (latest[b.customer_id]) continue;
        const c = b.customer as any;
        latest[b.customer_id] = {
          customerName: c?.name || "—",
          phone: c?.phone || "",
          email: c?.email || "",
          lastVisit: b.starts_at,
          lastService: (b.service as any)?.name || "—",
        };
      }

      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - daysThreshold);

      return Object.entries(latest)
        .filter(([, v]) => new Date(v.lastVisit) < cutoff)
        .map(([id, v]) => ({
          customerId: id,
          ...v,
          daysSince: Math.floor((Date.now() - new Date(v.lastVisit).getTime()) / 86400000),
        }))
        .sort((a, b) => b.daysSince - a.daysSince);
    },
    enabled: !!tenantId && daysThreshold > 0,
  });
}
