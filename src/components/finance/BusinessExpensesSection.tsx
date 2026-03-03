import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Props {
  tenantId: string;
  startDate: string;
  endDate: string;
  totalIncome: number; // cents
}

const COLORS = ["#ef4444", "#f59e0b", "#3b82f6", "#10b981", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16", "#06b6d4", "#a855f7"];

export function BusinessExpensesSection({ tenantId, startDate, endDate, totalIncome }: Props) {
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["business-expenses", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data: entries } = await supabase
        .from("cash_entries")
        .select("amount_cents, expense_category_id, notes, occurred_at, payment_method")
        .eq("tenant_id", tenantId)
        .eq("kind", "expense")
        .not("expense_category_id", "is", null)
        .gte("occurred_at", startDate)
        .lte("occurred_at", endDate)
        .order("occurred_at", { ascending: false });

      if (!entries?.length) return { categories: [], entries: [], total: 0 };

      // Fetch categories
      const catIds = [...new Set(entries.map(e => e.expense_category_id).filter(Boolean))];
      const { data: cats } = await supabase
        .from("expense_categories")
        .select("id, name, icon")
        .in("id", catIds);

      const catMap = new Map((cats || []).map(c => [c.id, c]));

      const grouped: Record<string, { name: string; icon: string; total: number; entries: any[] }> = {};
      let total = 0;
      for (const e of entries) {
        const cat = catMap.get(e.expense_category_id!);
        const key = e.expense_category_id!;
        if (!grouped[key]) grouped[key] = { name: cat?.name || "Outros", icon: cat?.icon || "📦", total: 0, entries: [] };
        grouped[key].total += e.amount_cents;
        grouped[key].entries.push(e);
        total += e.amount_cents;
      }

      const categories = Object.entries(grouped)
        .map(([id, data]) => ({ id, ...data, pct: total > 0 ? (data.total / total) * 100 : 0 }))
        .sort((a, b) => b.total - a.total);

      return { categories, entries, total };
    },
    enabled: !!tenantId,
  });

  if (isLoading || !data) return null;
  if (data.categories.length === 0) return null;

  const netResult = totalIncome - data.total;
  const PAYMENT_LABELS: Record<string, string> = { cash: "Dinheiro", pix: "PIX", credit_card: "Cartão Crédito", debit_card: "Cartão Débito", other: "Outro", transfer: "Transferência" };

  return (
    <div className="space-y-4">
      {/* Expense breakdown */}
      <div className="rounded-2xl glass-panel overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground tracking-tight">Despesas do Negócio</h3>
            <p className="text-[11px] text-muted-foreground">Total: {formatBRL(data.total)}</p>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {data.categories.map((cat, i) => (
            <Collapsible key={cat.id} open={expandedCat === cat.id} onOpenChange={(open) => setExpandedCat(open ? cat.id : null)}>
              <CollapsibleTrigger className="w-full">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer">
                  <span className="text-lg">{cat.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold tabular-nums">{formatBRL(cat.total)}</span>
                        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expandedCat === cat.id ? "rotate-180" : ""}`} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-muted/40 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${cat.pct}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">{cat.pct.toFixed(0)}%</span>
                    </div>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="pl-10 pr-3 pb-2 space-y-1">
                  {cat.entries.map((e: any, j: number) => (
                    <div key={j} className="flex items-center justify-between py-1.5 text-xs text-muted-foreground">
                      <span>{format(new Date(e.occurred_at), "dd/MM", { locale: ptBR })} · {PAYMENT_LABELS[e.payment_method] || e.payment_method || "—"} · {e.notes || "—"}</span>
                      <span className="font-medium text-foreground tabular-nums">{formatBRL(e.amount_cents)}</span>
                    </div>
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      </div>

      {/* Net result */}
      <div className="rounded-2xl glass-panel p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${netResult >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
            {netResult >= 0 ? <TrendingUp className="h-4 w-4 text-emerald-500" /> : <TrendingDown className="h-4 w-4 text-red-500" />}
          </div>
          <h3 className="text-sm font-bold text-foreground">Resultado do Período</h3>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Receita Total</span>
            <span className="font-medium text-emerald-500 tabular-nums">{formatBRL(totalIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Despesas Total</span>
            <span className="font-medium text-red-500 tabular-nums">{formatBRL(data.total)}</span>
          </div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold">Resultado</span>
            <span className={`font-bold tabular-nums ${netResult >= 0 ? "text-emerald-500" : "text-red-500"}`}>
              {formatBRL(Math.abs(netResult))} {netResult >= 0 ? "✅" : "❌"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
