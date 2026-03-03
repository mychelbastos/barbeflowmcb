import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Ticket, DollarSign, ChevronDown, ChevronUp, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/utils/formatBRL";

interface StaffBreakdown {
  staff_id: string;
  staff_name: string;
  tokens: number;
  estimated_commission_cents: number;
}

interface SubscriptionSummary {
  subscription_id: string;
  customer_name: string;
  plan_name: string;
  plan_price_cents: number;
  period_start: string;
  period_end: string;
  commission_mode: string;
  pool_percent: number;
  fixed_amount_cents: number;
  total_tokens: number;
  estimated_pool_cents: number;
  staff_breakdown: StaffBreakdown[];
}

interface Props {
  periodStart?: string;
  periodEnd?: string;
}

export function SubscriptionCommissionDashboard({ periodStart, periodEnd }: Props) {
  const { currentTenant } = useTenant();
  const [summaries, setSummaries] = useState<SubscriptionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [settlingAll, setSettlingAll] = useState(false);
  const [confirmSettle, setConfirmSettle] = useState<SubscriptionSummary | null>(null);
  const [confirmSettleAll, setConfirmSettleAll] = useState(false);
  const [registerInCash, setRegisterInCash] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const params: any = { p_tenant_id: currentTenant.id };
      if (periodStart) params.p_period_start = periodStart;
      if (periodEnd) params.p_period_end = periodEnd;
      const { data, error } = await (supabase.rpc as any)("get_subscription_commission_summary", params);
      if (error) throw error;
      setSummaries((data || []) as SubscriptionSummary[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant, periodStart, periodEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const getCashSessionId = async (): Promise<string | null> => {
    if (!registerInCash || !currentTenant) return null;
    const { data } = await supabase
      .from("cash_sessions")
      .select("id")
      .eq("tenant_id", currentTenant.id)
      .eq("status", "open")
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  };

  const handleSettle = async (summary: SubscriptionSummary) => {
    if (!currentTenant) return;
    setSettlingId(summary.subscription_id);
    try {
      const cashSessionId = await getCashSessionId();
      const { data, error } = await (supabase.rpc as any)("settle_subscription_commission", {
        p_customer_subscription_id: summary.subscription_id,
        p_tenant_id: currentTenant.id,
        p_period_start: summary.period_start,
        p_period_end: summary.period_end,
        p_cash_session_id: cashSessionId,
      });
      if (error) throw error;
      const result = data as any;
      if (result && !result.success) throw new Error(result.error || "Erro");
      toast.success(`Comissões liquidadas: ${formatBRL(result.total_distributed_cents || 0)}`);
      loadData();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("ALREADY_SETTLED")) {
        toast.info("Período já liquidado");
      } else {
        toast.error("Erro ao liquidar: " + msg);
      }
    } finally {
      setSettlingId(null);
      setConfirmSettle(null);
    }
  };

  const handleSettleAll = async () => {
    if (!currentTenant) return;
    setSettlingAll(true);
    try {
      const cashSessionId = await getCashSessionId();
      const { data, error } = await (supabase.rpc as any)("settle_all_subscription_commissions", {
        p_tenant_id: currentTenant.id,
        p_cash_session_id: cashSessionId,
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`${result.settled_count || 0} assinatura(s) liquidada(s)`);
      loadData();
    } catch (err: any) {
      toast.error("Erro ao liquidar: " + (err.message || ""));
    } finally {
      setSettlingAll(false);
      setConfirmSettleAll(false);
    }
  };

  const totalTokens = summaries.reduce((s, i) => s + i.total_tokens, 0);
  const totalEstimated = summaries.reduce((s, i) => s + i.estimated_pool_cents, 0);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (summaries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhuma ficha de comissão pendente. As fichas são geradas ao fechar comandas de assinantes.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Ticket className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Fichas Pendentes</p>
                <p className="text-lg font-bold">{totalTokens}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Estimativa Total</p>
                <p className="text-lg font-bold text-emerald-400">{formatBRL(totalEstimated)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Settle all button */}
      <Button
        variant="default"
        className="w-full"
        onClick={() => setConfirmSettleAll(true)}
        disabled={settlingAll}
      >
        {settlingAll ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
        Liquidar Todas ({summaries.length} assinatura{summaries.length !== 1 ? "s" : ""})
      </Button>

      {/* Per-subscription cards */}
      {summaries.map((s) => {
        const expanded = expandedId === s.subscription_id;
        const modeLabel = s.commission_mode === "fixed_per_service"
          ? `Fixo: ${formatBRL(s.fixed_amount_cents)}/atendimento`
          : `Rateio ${s.pool_percent}%`;

        return (
          <Card key={s.subscription_id} className="overflow-hidden">
            <div
              className="p-4 cursor-pointer hover:bg-muted/30 transition-colors"
              onClick={() => setExpandedId(expanded ? null : s.subscription_id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{s.customer_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {s.plan_name} — {formatBRL(s.plan_price_cents)}/mês
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-[10px]">
                      {s.period_start} → {s.period_end}
                    </Badge>
                    <Badge variant="secondary" className="text-[10px]">
                      {modeLabel}
                    </Badge>
                    <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-[10px]">
                      {s.total_tokens} ficha{s.total_tokens !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-emerald-400">{formatBRL(s.estimated_pool_cents)}</span>
                  {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                </div>
              </div>
            </div>

            {expanded && (
              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                {/* Staff breakdown */}
                {(s.staff_breakdown || []).map((staff) => (
                  <div key={staff.staff_id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-muted/20 text-sm">
                    <span className="font-medium">{staff.staff_name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{staff.tokens} ficha{staff.tokens !== 1 ? "s" : ""}</span>
                      <span className="text-emerald-400 font-medium">{formatBRL(staff.estimated_commission_cents)}</span>
                    </div>
                  </div>
                ))}

                <Button
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={settlingId === s.subscription_id}
                  onClick={(e) => { e.stopPropagation(); setConfirmSettle(s); }}
                >
                  {settlingId === s.subscription_id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                  )}
                  Liquidar esta assinatura
                </Button>
              </div>
            )}
          </Card>
        );
      })}

      {/* Confirm single settle */}
      <AlertDialog open={!!confirmSettle} onOpenChange={() => setConfirmSettle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liquidar Comissões</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>Período: {confirmSettle?.period_start} a {confirmSettle?.period_end}</p>
                <div className="space-y-1">
                  {(confirmSettle?.staff_breakdown || []).map((staff) => (
                    <div key={staff.staff_id} className="flex justify-between text-sm">
                      <span>{staff.staff_name} — {staff.tokens} ficha{staff.tokens !== 1 ? "s" : ""}</span>
                      <span className="font-medium">{formatBRL(staff.estimated_commission_cents)}</span>
                    </div>
                  ))}
                </div>
                <p className="font-semibold">Total: {formatBRL(confirmSettle?.estimated_pool_cents || 0)}</p>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <Checkbox checked={registerInCash} onCheckedChange={(v) => setRegisterInCash(!!v)} />
                  <span className="text-sm">Registrar no caixa automaticamente</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmSettle && handleSettle(confirmSettle)}>
              Confirmar Liquidação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm settle all */}
      <AlertDialog open={confirmSettleAll} onOpenChange={setConfirmSettleAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Liquidar Todas as Comissões</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>{summaries.length} assinatura{summaries.length !== 1 ? "s" : ""} com fichas pendentes</p>
                <p className="font-semibold">Total estimado: {formatBRL(totalEstimated)}</p>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                  <Checkbox checked={registerInCash} onCheckedChange={(v) => setRegisterInCash(!!v)} />
                  <span className="text-sm">Registrar no caixa automaticamente</span>
                </label>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleSettleAll}>Confirmar Liquidação</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
