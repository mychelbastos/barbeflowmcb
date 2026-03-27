import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Users, DollarSign, ChevronRight, Lock, CreditCard, Globe, Gift, Repeat } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { SubscriptionCommissionTotals } from "@/components/subscriptions/SubscriptionCommissionDashboard";

interface CommissionDetail {
  id: string;
  tenant_id: string;
  booking_id: string;
  booking_item_id: string;
  staff_id: string;
  staff_name: string;
  item_type: string;
  item_title: string;
  base_amount_cents: number;
  commission_percent: number;
  commission_cents: number;
  payment_source: string;
  commission_type: string;
  customer_name: string;
  booking_date: string;
  created_at: string;
}

interface StaffCommission {
  staffId: string;
  staffName: string;
  totalCommission: number;
  details: CommissionDetail[];
  bySource: Record<string, { count: number; total: number }>;
}

const SOURCE_CONFIG: Record<string, { label: string; icon: React.ElementType; badgeClass: string; cardClass: string }> = {
  local: {
    label: "Presencial",
    icon: CreditCard,
    badgeClass: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    cardClass: "bg-blue-500/10 border-blue-500/30",
  },
  online: {
    label: "Online",
    icon: Globe,
    badgeClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    cardClass: "bg-emerald-500/10 border-emerald-500/30",
  },
  cortesia: {
    label: "Cortesia",
    icon: Gift,
    badgeClass: "bg-muted text-muted-foreground border-border",
    cardClass: "bg-muted/50 border-border",
  },
  assinatura: {
    label: "Assinatura",
    icon: Repeat,
    badgeClass: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    cardClass: "bg-violet-500/10 border-violet-500/30",
  },
};

function getSourceKey(detail: CommissionDetail): string {
  if (detail.commission_type === "assinatura") return "assinatura";
  return detail.payment_source || "local";
}

function SourceBadge({ source }: { source: string }) {
  const cfg = SOURCE_CONFIG[source] || SOURCE_CONFIG.local;
  const Icon = cfg.icon;
  return (
    <Badge className={`${cfg.badgeClass} text-[10px] gap-1 font-medium`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </Badge>
  );
}

interface CommissionsTabProps {
  subscriptionTotals?: SubscriptionCommissionTotals | null;
}

export function CommissionsTab({ subscriptionTotals }: CommissionsTabProps) {
  const { currentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const [details, setDetails] = useState<CommissionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommission | null>(null);

  useEffect(() => {
    if (currentTenant) loadDetails();
  }, [currentTenant, dateRange]);

  const loadDetails = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const fromISO = format(dateRange.from, "yyyy-MM-dd");
      const toISO = format(dateRange.to, "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("commission_details" as any)
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .gte("booking_date", fromISO)
        .lte("booking_date", toISO)
        .order("booking_date", { ascending: false });

      if (error) throw error;
      setDetails((data || []) as unknown as CommissionDetail[]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Aggregate by staff
  const commissions = useMemo(() => {
    const map: Record<string, StaffCommission> = {};

    details.forEach((d) => {
      if (!map[d.staff_id]) {
        map[d.staff_id] = {
          staffId: d.staff_id,
          staffName: d.staff_name || "Profissional",
          totalCommission: 0,
          details: [],
          bySource: {},
        };
      }
      const entry = map[d.staff_id];
      entry.details.push(d);
      entry.totalCommission += d.commission_cents;

      const key = getSourceKey(d);
      if (!entry.bySource[key]) entry.bySource[key] = { count: 0, total: 0 };
      entry.bySource[key].count++;
      entry.bySource[key].total += d.commission_cents;
    });

    return Object.values(map)
      .filter((c) => c.totalCommission > 0 || c.details.length > 0)
      .sort((a, b) => b.totalCommission - a.totalCommission);
  }, [details]);

  // Global totals by source
  const globalBySource = useMemo(() => {
    const result: Record<string, { count: number; total: number }> = {
      local: { count: 0, total: 0 },
      online: { count: 0, total: 0 },
      assinatura: { count: 0, total: 0 },
      cortesia: { count: 0, total: 0 },
    };
    details.forEach((d) => {
      const key = getSourceKey(d);
      if (!result[key]) result[key] = { count: 0, total: 0 };
      result[key].count++;
      result[key].total += d.commission_cents;
    });
    return result;
  }, [details]);

  const totalCommission = commissions.reduce((s, c) => s + c.totalCommission, 0);
  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" />
            <span>
              Comissões são geradas automaticamente ao fechar cada comanda.
              Os valores são imutáveis (snapshot no momento do fechamento).
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Summary cards by source */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(["local", "online", "assinatura", "cortesia"] as const).map((key) => {
          const cfg = SOURCE_CONFIG[key];
          const Icon = cfg.icon;
          const data = globalBySource[key];
          return (
            <Card key={key} className={`border ${cfg.cardClass}`}>
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{cfg.label}</span>
                </div>
                <p className="text-lg font-bold">{fmt(data.total)}</p>
                <p className="text-[10px] text-muted-foreground">{data.count} item{data.count !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profissionais</p>
                <p className="text-lg font-bold">{commissions.length}</p>
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
                <p className="text-xs text-muted-foreground">Total Comissões</p>
                <p className="text-lg font-bold text-emerald-400">{fmt(totalCommission)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma comissão gerada no período. Feche comandas para gerar comissões.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead className="text-center">Itens</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow
                  key={c.staffId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedStaff(c)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.staffName}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {Object.entries(c.bySource).map(([key, val]) => (
                        val.count > 0 && (
                          <span key={key} className="text-[10px] text-muted-foreground">
                            {SOURCE_CONFIG[key]?.label || key}: {val.count}
                          </span>
                        )
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{c.details.length}</TableCell>
                  <TableCell className="text-right">
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      {fmt(c.totalCommission)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes — {selectedStaff?.staffName}
              <Badge variant="secondary" className="text-xs">
                <Lock className="h-3 w-3 mr-1" /> Snapshot
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-4">
              {/* Source summary for this staff */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {(["local", "online", "assinatura", "cortesia"] as const).map((key) => {
                  const cfg = SOURCE_CONFIG[key];
                  const val = selectedStaff.bySource[key];
                  if (!val || val.count === 0) return null;
                  return (
                    <div key={key} className={`p-2 rounded-lg border text-center ${cfg.cardClass}`}>
                      <p className="text-[10px] font-medium">{cfg.label}</p>
                      <p className="text-sm font-bold">{fmt(val.total)}</p>
                      <p className="text-[10px] text-muted-foreground">{val.count} item{val.count !== 1 ? "s" : ""}</p>
                    </div>
                  );
                })}
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                <p className="text-xs text-muted-foreground">Total a Pagar</p>
                <p className="text-xl font-bold text-emerald-400">{fmt(selectedStaff.totalCommission)}</p>
              </div>

              {/* All items with badges */}
              <div className="space-y-1 max-h-[40vh] overflow-y-auto">
                {selectedStaff.details.map((d) => (
                  <div key={d.id} className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-muted/20 gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <SourceBadge source={getSourceKey(d)} />
                        <span className="font-medium truncate">{d.item_title}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                        <span>{d.customer_name || "—"}</span>
                        <span>•</span>
                        <span>{d.booking_date ? format(new Date(d.booking_date), "dd/MM", { locale: ptBR }) : "—"}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs shrink-0">
                      {d.commission_type !== "assinatura" && (
                        <>
                          <span className="text-muted-foreground">{fmt(d.base_amount_cents)}</span>
                          <span className="text-muted-foreground">{d.commission_percent}%</span>
                        </>
                      )}
                      {d.commission_type === "assinatura" && (
                        <span className="text-muted-foreground">ficha</span>
                      )}
                      <span className="text-emerald-400 font-medium">
                        {d.commission_cents > 0 ? `+${fmt(d.commission_cents)}` : fmt(d.commission_cents)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
