import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, format, isSameDay } from "date-fns";

export interface CashRevenueData {
  /** Total income (kind=income) excluding supply */
  totalIncome: number;
  /** Total supply income (kind=income, source=supply) */
  totalSupply: number;
  /** Total expenses (kind=expense) */
  totalExpense: number;
  /** Income from booking_service source */
  bookingServiceIncome: number;
  /** Income from booking_product source */
  bookingProductIncome: number;
  /** Legacy booking source (for backwards compat) */
  bookingIncome: number;
  /** Income from subscription/package sources */
  subscriptionIncome: number;
  packageIncome: number;
  /** Daily breakdown of income (excluding supply) */
  dailyIncome: { date: string; label: string; income: number; cumulative: number }[];
  /** Number of closed comandas in period (based on cash_entries existence) */
  closedComandas: number;
  /** Ticket médio: bookingServiceIncome / closedComandas */
  avgTicket: number;
}

interface UseCashRevenueOptions {
  tenantId: string | undefined;
  dateRange: { from: Date; to: Date };
  staffFilter?: string;
}

export function useCashRevenue({ tenantId, dateRange, staffFilter }: UseCashRevenueOptions) {
  const [data, setData] = useState<CashRevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const loadIdRef = useRef(0);
  const [reloadTrigger, setReloadTrigger] = useState(0);

  // Stabilize date range as ISO strings to avoid re-triggering on same dates
  const fromISO = dateRange.from.toISOString();
  const toISO = dateRange.to.toISOString();

  useEffect(() => {
    if (!tenantId) { setData(null); setLoading(false); return; }

    const currentLoadId = ++loadIdRef.current;

    const load = async () => {
      try {
        setLoading(true);

        // Build query for cash_entries in the period
        let query = supabase
          .from("cash_entries")
          .select("amount_cents, kind, source, payment_method, occurred_at, staff_id, booking_id")
          .eq("tenant_id", tenantId)
          .gte("occurred_at", fromISO)
          .lte("occurred_at", toISO);

        if (staffFilter && staffFilter !== "all") {
          query = query.eq("staff_id", staffFilter);
        }

        const { data: entries, error } = await query;

        // Bail if this load is stale
        if (currentLoadId !== loadIdRef.current) return;
        if (error) throw error;

        const allEntries = entries || [];

        // Classify entries
        const incomeEntries = allEntries.filter(e => e.kind === "income");
        const expenseEntries = allEntries.filter(e => e.kind === "expense");

        const supplyEntries = incomeEntries.filter(e => e.source === "supply");
        const revenueEntries = incomeEntries.filter(e => e.source !== "supply");

        const totalIncome = revenueEntries.reduce((s, e) => s + e.amount_cents, 0);
        const totalSupply = supplyEntries.reduce((s, e) => s + e.amount_cents, 0);
        const totalExpense = expenseEntries.reduce((s, e) => s + e.amount_cents, 0);

        // Granular source breakdown
        const bookingServiceIncome = revenueEntries
          .filter(e => e.source === "booking_service" || e.source === "booking")
          .reduce((s, e) => s + e.amount_cents, 0);

        const bookingProductIncome = revenueEntries
          .filter(e => e.source === "booking_product" || e.source === "product_sale" || e.source === "product")
          .reduce((s, e) => s + e.amount_cents, 0);

        const bookingIncome = bookingServiceIncome + bookingProductIncome;

        const subscriptionIncome = revenueEntries
          .filter(e => e.source === "subscription")
          .reduce((s, e) => s + e.amount_cents, 0);

        const packageIncome = revenueEntries
          .filter(e => e.source === "package_sale" || e.source === "package")
          .reduce((s, e) => s + e.amount_cents, 0);

        // Daily breakdown
        const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
        let cumulative = 0;
        const dailyIncome = days.map(day => {
          const dayIncome = revenueEntries
            .filter(e => isSameDay(new Date(e.occurred_at), day))
            .reduce((s, e) => s + e.amount_cents, 0);
          cumulative += dayIncome;
          return {
            date: format(day, "dd/MM"),
            label: format(day, "dd MMM"),
            income: dayIncome / 100,
            cumulative: Math.round(cumulative / 100),
          };
        });

        // Closed comandas
        const bookingIds = [...new Set(
          revenueEntries
            .filter(e => e.booking_id && (e.source === "booking_service" || e.source === "booking"))
            .map(e => e.booking_id!)
        )];

        let comandaCount = 0;
        if (bookingIds.length > 0) {
          let comandaQuery = supabase
            .from("bookings")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", tenantId)
            .eq("comanda_status", "closed")
            .in("id", bookingIds);

          if (staffFilter && staffFilter !== "all") {
            comandaQuery = comandaQuery.eq("staff_id", staffFilter);
          }

          const { count } = await comandaQuery;
          
          // Bail if stale
          if (currentLoadId !== loadIdRef.current) return;
          
          comandaCount = count || 0;
        }

        const avgTicket = comandaCount > 0 ? bookingServiceIncome / comandaCount : 0;

        setData({
          totalIncome,
          totalSupply,
          totalExpense,
          bookingServiceIncome,
          bookingProductIncome,
          bookingIncome,
          subscriptionIncome,
          packageIncome,
          dailyIncome,
          closedComandas: comandaCount,
          avgTicket,
        });
      } catch (error) {
        if (currentLoadId !== loadIdRef.current) return;
        console.error("useCashRevenue error:", error);
        setData(null);
      } finally {
        if (currentLoadId === loadIdRef.current) {
          setLoading(false);
        }
      }
    };

    load();
  }, [tenantId, fromISO, toISO, staffFilter, reloadTrigger]);

  const reload = () => { setReloadTrigger(t => t + 1); };

  return { data, loading, reload };
}
