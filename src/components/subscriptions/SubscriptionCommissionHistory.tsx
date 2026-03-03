import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2, Calendar } from "lucide-react";
import { formatBRL } from "@/utils/formatBRL";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SettlementItem {
  staff_id: string;
  tokens_count: number;
  commission_cents: number;
  staff: { name: string } | null;
}

interface Settlement {
  id: string;
  period_start: string;
  period_end: string;
  subscription_amount_cents: number;
  pool_amount_cents: number;
  pool_percent: number;
  total_tokens: number;
  commission_mode: string;
  status: string;
  settled_at: string | null;
  customer_subscriptions: {
    customers: { name: string } | null;
    subscription_plans: { name: string; price_cents: number } | null;
  } | null;
  subscription_commission_settlement_items: SettlementItem[];
}

interface Props {
  periodStart?: string;
  periodEnd?: string;
}

export function SubscriptionCommissionHistory({ periodStart, periodEnd }: Props) {
  const { currentTenant } = useTenant();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant, periodStart, periodEnd]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      let query = (supabase
        .from("subscription_commission_settlements" as any)
        .select(`
          *,
          customer_subscriptions!inner(
            customers(name),
            subscription_plans(name, price_cents)
          ),
          subscription_commission_settlement_items(
            staff_id,
            tokens_count,
            commission_cents,
            staff:staff(name)
          )
        `)
        .eq("tenant_id", currentTenant.id) as any);
      if (periodStart) query = query.gte("period_start", periodStart);
      if (periodEnd) query = query.lte("period_end", periodEnd);
      const { data, error } = await query
        .order("settled_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setSettlements((data || []) as Settlement[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (settlements.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma liquidação realizada no período selecionado.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {settlements.map((s) => {
        const customerName = (s.customer_subscriptions as any)?.customers?.name || "Cliente";
        const planName = (s.customer_subscriptions as any)?.subscription_plans?.name || "Plano";
        const items = s.subscription_commission_settlement_items || [];
        const totalPaid = items.reduce((sum, i) => sum + i.commission_cents, 0);

        return (
          <Card key={s.id}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{customerName}</p>
                  <p className="text-xs text-muted-foreground">{planName} — Pool: {formatBRL(s.pool_amount_cents)}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {s.settled_at && (
                    <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(s.settled_at), "dd/MM/yyyy", { locale: ptBR })}
                    </span>
                  )}
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Liquidado
                  </Badge>
                </div>
              </div>

              <div className="space-y-1">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 px-2 rounded bg-muted/20 text-xs">
                    <span>{(item.staff as any)?.name || "Profissional"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{item.tokens_count} ficha{item.tokens_count !== 1 ? "s" : ""}</span>
                      <span className="text-emerald-400 font-medium">{formatBRL(item.commission_cents)}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="text-right text-xs text-muted-foreground">
                Total distribuído: <span className="font-semibold text-foreground">{formatBRL(totalPaid)}</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
