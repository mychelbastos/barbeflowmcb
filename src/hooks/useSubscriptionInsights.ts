import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, subDays } from "date-fns";

// ── Receivables ──
export function useReceivables(tenantId: string | undefined, month: Date) {
  const monthStart = startOfMonth(month).toISOString();
  const monthEnd = endOfMonth(month).toISOString();

  return useQuery({
    queryKey: ["subscription-receivables", tenantId, monthStart],
    queryFn: async () => {
      // 1. Paid payments in the month
      const { data: payments } = await supabase
        .from("subscription_payments")
        .select("id, amount_cents, status, paid_at, subscription_id")
        .eq("tenant_id", tenantId!)
        .eq("status", "paid")
        .gte("paid_at", monthStart)
        .lte("paid_at", monthEnd);

      // 2. Active subscriptions with next_payment in the month
      const { data: subscriptions } = await supabase
        .from("customer_subscriptions")
        .select("id, next_payment_date, status, customer:customers(name, phone), plan:subscription_plans(name, price_cents)")
        .eq("tenant_id", tenantId!)
        .in("status", ["active", "authorized"]);

      // Build paid map
      const paidSubIds = new Set((payments || []).map(p => p.subscription_id));

      // Items from paid payments
      const paidItems = (payments || []).map(p => {
        const sub = (subscriptions || []).find(s => s.id === p.subscription_id);
        return {
          id: p.id,
          date: p.paid_at,
          status: "paid" as const,
          customerName: (sub?.customer as any)?.name || "—",
          planName: (sub?.plan as any)?.name || "—",
          amountCents: p.amount_cents,
        };
      });

      // Items from upcoming/overdue (not yet paid)
      const now = new Date();
      const upcomingItems = (subscriptions || [])
        .filter(s => {
          if (!s.next_payment_date) return false;
          if (paidSubIds.has(s.id)) return false;
          const d = new Date(s.next_payment_date);
          return d >= new Date(monthStart) && d <= new Date(monthEnd);
        })
        .map(s => {
          const d = new Date(s.next_payment_date!);
          return {
            id: s.id,
            date: s.next_payment_date!,
            status: (d < now ? "overdue" : "upcoming") as "overdue" | "upcoming",
            customerName: (s.customer as any)?.name || "—",
            planName: (s.plan as any)?.name || "—",
            amountCents: (s.plan as any)?.price_cents || 0,
          };
        });

      const all = [...paidItems, ...upcomingItems].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const totalPaid = paidItems.reduce((s, i) => s + i.amountCents, 0);
      const totalPending = upcomingItems.reduce((s, i) => s + i.amountCents, 0);

      return {
        items: all,
        totalPaid,
        totalPending,
        totalExpected: totalPaid + totalPending,
        totalSubs: all.length,
      };
    },
    enabled: !!tenantId,
  });
}

// ── Calendar Events ──
export function useSubscriptionEvents(tenantId: string | undefined, month: Date) {
  const monthStart = startOfMonth(month).toISOString();
  const monthEnd = endOfMonth(month).toISOString();

  return useQuery({
    queryKey: ["subscription-events", tenantId, monthStart],
    queryFn: async () => {
      const [{ data: subs }, { data: payments }] = await Promise.all([
        supabase
          .from("customer_subscriptions")
          .select("id, status, started_at, cancelled_at, current_period_start, customer:customers(name, phone), plan:subscription_plans(name, price_cents)")
          .eq("tenant_id", tenantId!),
        supabase
          .from("subscription_payments")
          .select("id, subscription_id, amount_cents, status, paid_at")
          .eq("tenant_id", tenantId!)
          .eq("status", "paid")
          .gte("paid_at", monthStart)
          .lte("paid_at", monthEnd),
      ]);

      type SubEvent = {
        date: string;
        type: "new" | "renewal" | "cancelled" | "payment";
        customerName: string;
        planName: string;
        priceCents: number;
        icon: string;
      };

      const events: SubEvent[] = [];
      const ms = new Date(monthStart).getTime();
      const me = new Date(monthEnd).getTime();

      for (const s of subs || []) {
        const customer = s.customer as any;
        const plan = s.plan as any;
        const name = customer?.name || "—";
        const planName = plan?.name || "—";
        const price = plan?.price_cents || 0;

        if (s.started_at) {
          const d = new Date(s.started_at).getTime();
          if (d >= ms && d <= me) {
            events.push({ date: s.started_at, type: "new", customerName: name, planName, priceCents: price, icon: "🟢" });
          }
        }

        if (s.cancelled_at) {
          const d = new Date(s.cancelled_at).getTime();
          if (d >= ms && d <= me) {
            events.push({ date: s.cancelled_at, type: "cancelled", customerName: name, planName, priceCents: price, icon: "🔴" });
          }
        }

        if (s.current_period_start && s.started_at) {
          const cps = new Date(s.current_period_start).getTime();
          const sa = new Date(s.started_at).getTime();
          if (cps >= ms && cps <= me && Math.abs(cps - sa) > 86400000) {
            events.push({ date: s.current_period_start, type: "renewal", customerName: name, planName, priceCents: price, icon: "🔄" });
          }
        }
      }

      for (const p of payments || []) {
        const sub = (subs || []).find(s => s.id === p.subscription_id);
        const customer = sub?.customer as any;
        const plan = sub?.plan as any;
        events.push({
          date: p.paid_at!,
          type: "payment",
          customerName: customer?.name || "—",
          planName: plan?.name || "—",
          priceCents: p.amount_cents,
          icon: "💰",
        });
      }

      events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      // MRR: sum of active subscriptions
      const mrr = (subs || [])
        .filter(s => s.status === "active" || s.status === "authorized")
        .reduce((sum, s) => sum + ((s.plan as any)?.price_cents || 0), 0);

      const newCount = events.filter(e => e.type === "new").length;
      const renewalCount = events.filter(e => e.type === "renewal").length;
      const cancelledCount = events.filter(e => e.type === "cancelled").length;

      return { events, mrr, newCount, renewalCount, cancelledCount };
    },
    enabled: !!tenantId,
  });
}

// ── Delinquents ──
export function useDelinquents(tenantId: string | undefined) {
  return useQuery({
    queryKey: ["subscription-delinquents", tenantId],
    queryFn: async () => {
      const now = new Date().toISOString();
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();

      const [{ data: subs }, { data: payments }] = await Promise.all([
        supabase
          .from("customer_subscriptions")
          .select("id, status, next_payment_date, failed_at, customer:customers(name, phone, email), plan:subscription_plans(name, price_cents)")
          .eq("tenant_id", tenantId!)
          .in("status", ["active", "authorized", "past_due"])
          .lt("next_payment_date", now),
        supabase
          .from("subscription_payments")
          .select("subscription_id, status, paid_at")
          .eq("tenant_id", tenantId!)
          .eq("status", "paid")
          .gte("paid_at", thirtyDaysAgo),
      ]);

      const delinquents = (subs || []).filter(sub => {
        const hasPaid = (payments || []).some(
          p => p.subscription_id === sub.id && new Date(p.paid_at!) > new Date(sub.next_payment_date!)
        );
        return !hasPaid;
      });

      const totalOverdue = delinquents.reduce((s, d) => s + ((d.plan as any)?.price_cents || 0), 0);
      const avgDays = delinquents.length
        ? Math.round(
            delinquents.reduce((s, d) => {
              return s + Math.max(0, Math.floor((Date.now() - new Date(d.next_payment_date!).getTime()) / 86400000));
            }, 0) / delinquents.length
          )
        : 0;

      return { delinquents, totalOverdue, avgDays };
    },
    enabled: !!tenantId,
    refetchInterval: 60000,
  });
}
