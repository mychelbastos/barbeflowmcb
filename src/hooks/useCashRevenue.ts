import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eachDayOfInterval, format, isSameDay } from "date-fns";

export interface CashRevenueData {
  /** Total income (kind=income) excluding supply */
  totalIncome: number;
  /** Total supply income (kind=income, source=supply) */
  totalSupply: number;
  /** Total expenses (kind=expense) */
  totalExpense: number;
  /** Income from booking source only */
  bookingIncome: number;
  /** Income from product source only (source contains 'product' or booking items of type product) */
  productIncome: number;
  /** Income from subscription/package sources */
  benefitSalesIncome: number;
  /** Daily breakdown of income (excluding supply) */
  dailyIncome: { date: string; label: string; income: number; cumulative: number }[];
  /** Number of closed comandas in period */
  closedComandas: number;
  /** Ticket médio: bookingIncome / closedComandas */
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

  const load = useCallback(async () => {
    if (!tenantId) { setData(null); setLoading(false); return; }

    try {
      setLoading(true);

      // Build query for cash_entries in the period
      let query = supabase
        .from("cash_entries")
        .select("amount_cents, kind, source, payment_method, occurred_at, staff_id, booking_id")
        .eq("tenant_id", tenantId)
        .gte("occurred_at", dateRange.from.toISOString())
        .lte("occurred_at", dateRange.to.toISOString());

      if (staffFilter && staffFilter !== "all") {
        query = query.eq("staff_id", staffFilter);
      }

      const { data: entries, error } = await query;
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

      const bookingIncome = revenueEntries
        .filter(e => e.source === "booking")
        .reduce((s, e) => s + e.amount_cents, 0);

      // Product income: source that indicates product sale
      // In the current schema, product sales via comanda go through source='booking'
      // but standalone product sales might use a different source. 
      // For now, we identify product-specific income by looking at cash_entries 
      // where source contains product-related terms
      const productIncome = revenueEntries
        .filter(e => e.source === "product_sale" || e.source === "product")
        .reduce((s, e) => s + e.amount_cents, 0);

      const benefitSalesIncome = revenueEntries
        .filter(e => e.source === "subscription" || e.source === "package_sale" || e.source === "package")
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

      // Closed comandas count for ticket médio
      let comandaQuery = supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("comanda_status", "closed")
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());

      if (staffFilter && staffFilter !== "all") {
        comandaQuery = comandaQuery.eq("staff_id", staffFilter);
      }

      const { count: closedComandas } = await comandaQuery;
      const comandaCount = closedComandas || 0;

      const avgTicket = comandaCount > 0 ? bookingIncome / comandaCount : 0;

      setData({
        totalIncome,
        totalSupply,
        totalExpense,
        bookingIncome,
        productIncome,
        benefitSalesIncome,
        dailyIncome,
        closedComandas: comandaCount,
        avgTicket,
      });
    } catch (error) {
      console.error("useCashRevenue error:", error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId, dateRange.from, dateRange.to, staffFilter]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, reload: load };
}
