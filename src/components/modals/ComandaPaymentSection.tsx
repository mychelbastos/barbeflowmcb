import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Banknote, CreditCard, Smartphone, Plus, Trash2, Receipt, Loader2, Gift, Percent, X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookingItem } from "./ComandaItemsSection";

const METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit_card", label: "Cartão Crédito", icon: CreditCard },
  { value: "debit_card", label: "Cartão Débito", icon: CreditCard },
  { value: "courtesy", label: "Cortesia", icon: Gift },
];

interface PaymentLine {
  id: string;
  method: string;
  amount: string;
}

interface Props {
  bookingId: string;
  customerId: string;
  tenantId: string;
  staffId: string | null;
  items: BookingItem[];
  customerBalance: number;
  onPaymentRecorded: () => void;
  comandaClosed: boolean;
}

export function ComandaPaymentSection({
  bookingId, customerId, tenantId, staffId,
  items, customerBalance, onPaymentRecorded, comandaClosed,
}: Props) {
  const [lines, setLines] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: "cash", amount: "" },
  ]);
  const [keepChangeAsCredit, setKeepChangeAsCredit] = useState(false);
  const [saving, setSaving] = useState(false);

  const effectivePrice = (i: BookingItem) => i.total_price_cents - (i.discount_cents || 0);

  const totalUnpaid = useMemo(() =>
    items.filter(i => i.paid_status === "unpaid").reduce((sum, i) => sum + effectivePrice(i), 0),
    [items]
  );

  const totalPaid = useMemo(() =>
    items.filter(i => i.paid_status !== "unpaid").reduce((sum, i) => sum + effectivePrice(i), 0),
    [items]
  );

  const totalToCharge = Math.max(0, totalUnpaid - customerBalance);

  const totalReceived = useMemo(() =>
    lines.reduce((sum, l) => sum + Math.round(parseFloat(l.amount || "0") * 100), 0),
    [lines]
  );

  const totalCourtesy = useMemo(() =>
    lines.filter(l => l.method === "courtesy").reduce((sum, l) => sum + Math.round(parseFloat(l.amount || "0") * 100), 0),
    [lines]
  );

  const totalRealMoney = totalReceived - totalCourtesy;
  const change = Math.max(0, totalRealMoney - Math.max(0, totalToCharge - totalCourtesy));
  const remaining = Math.max(0, totalToCharge - totalReceived);

  const addLine = () => {
    setLines(prev => [...prev, { id: crypto.randomUUID(), method: "pix", amount: "" }]);
  };

  const removeLine = (id: string) => {
    if (lines.length <= 1) return;
    setLines(prev => prev.filter(l => l.id !== id));
  };

  const updateLine = (id: string, field: keyof PaymentLine, value: string) => {
    setLines(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
  };

  const fillCourtesy = (lineId: string) => {
    // Auto-fill courtesy with total unpaid amount
    setLines(prev => prev.map(l =>
      l.id === lineId && l.method === "courtesy"
        ? { ...l, amount: (totalToCharge / 100).toFixed(2) }
        : l
    ));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const receiptId = crypto.randomUUID();
      const payments = lines
        .filter(l => parseFloat(l.amount || "0") > 0)
        .map(l => ({
          method: l.method,
          amount_cents: Math.round(parseFloat(l.amount) * 100),
        }));

      const { data: openSession } = await supabase
        .from("cash_sessions")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("status", "open")
        .limit(1)
        .maybeSingle();

      const { data: result, error } = await supabase.rpc("record_local_payment_for_booking", {
        p_booking_id: bookingId,
        p_tenant_id: tenantId,
        p_customer_id: customerId,
        p_receipt_id: receiptId,
        p_payments: payments,
        p_keep_change_as_credit: keepChangeAsCredit,
        p_cash_session_id: openSession?.id || null,
        p_staff_id: staffId || null,
        p_extra_items: [],
      });

      if (error) throw error;
      const res = result as any;
      if (!res?.success) {
        if (res?.error === "DUPLICATE_PAYMENT") {
          toast.error("Pagamento já registrado");
        } else {
          throw new Error(res?.error || "Erro desconhecido");
        }
        return;
      }

      let msg = `Pagamento registrado`;
      if (res.total_courtesy > 0) {
        msg = `Cortesia de R$ ${(res.total_courtesy / 100).toFixed(2)} registrada`;
      }
      if (res.total_received > 0 && res.total_received > res.total_courtesy) {
        msg = `Pagamento de R$ ${((res.total_received - (res.total_courtesy || 0)) / 100).toFixed(2)} registrado`;
        if (res.total_courtesy > 0) {
          msg += ` + Cortesia R$ ${(res.total_courtesy / 100).toFixed(2)}`;
        }
      }
      if (res.change > 0) {
        msg += res.kept_as_credit
          ? `. Crédito de R$ ${(res.change / 100).toFixed(2)} mantido`
          : `. Troco de R$ ${(res.change / 100).toFixed(2)} devolvido`;
      }
      toast.success(msg);
      onPaymentRecorded();
    } catch (err: any) {
      toast.error("Erro ao registrar: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  const fmt = (cents: number) => `R$ ${(Math.abs(cents) / 100).toFixed(2)}`;

  if (comandaClosed) {
    return (
      <div className="p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-sm text-muted-foreground text-center">Comanda fechada — pagamento encerrado</p>
      </div>
    );
  }

  if (totalUnpaid <= 0) {
    return (
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <p className="text-sm font-medium text-emerald-500 text-center">✅ Todos os itens estão quitados</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Receipt className="h-4 w-4" /> Pagamento
      </h4>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-muted-foreground">Pendente</p>
          <p className="font-bold text-red-500">{fmt(totalUnpaid)}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-muted-foreground">Já pago</p>
          <p className="font-bold text-emerald-500">{fmt(totalPaid)}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50 text-center">
          <p className="text-muted-foreground">Saldo cliente</p>
          <p className={`font-bold ${customerBalance < 0 ? "text-red-500" : customerBalance > 0 ? "text-emerald-500" : ""}`}>
            {customerBalance !== 0 ? (customerBalance > 0 ? `+${fmt(customerBalance)}` : `-${fmt(customerBalance)}`) : "R$ 0,00"}
          </p>
        </div>
      </div>

      {/* Total to charge */}
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground">Total a cobrar agora</p>
        <p className="font-bold text-lg">{fmt(totalToCharge)}</p>
      </div>

      {/* Payment lines */}
      <div className="space-y-2">
        <Label className="text-xs text-muted-foreground">Formas de pagamento</Label>
        {lines.map((line) => {
          const methodCfg = METHODS.find(m => m.value === line.method);
          const isCourtesy = line.method === "courtesy";

          return (
            <div key={line.id} className={`flex items-center gap-2 ${isCourtesy ? "bg-purple-500/5 rounded-lg p-1.5" : ""}`}>
              <Select value={line.method} onValueChange={(v) => {
                updateLine(line.id, "method", v);
                if (v === "courtesy") {
                  fillCourtesy(line.id);
                }
              }}>
                <SelectTrigger className={`w-36 h-9 text-xs ${isCourtesy ? "border-purple-500/30" : ""}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className={`flex items-center gap-1.5 ${m.value === "courtesy" ? "text-purple-500" : ""}`}>
                        <m.icon className="h-3 w-3" /> {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CurrencyInput
                value={line.amount}
                onChange={(v) => updateLine(line.id, "amount", v)}
                className={`flex-1 h-9 ${isCourtesy ? "border-purple-500/30" : ""}`}
              />
              {lines.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => removeLine(line.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          );
        })}
        <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addLine}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar forma
        </Button>
      </div>

      {/* Courtesy info */}
      {totalCourtesy > 0 && (
        <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <p className="text-sm font-medium text-purple-500 flex items-center gap-1.5">
            <Gift className="h-3.5 w-3.5" /> Cortesia: {fmt(totalCourtesy)}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            O valor será registrado no financeiro mas não conta como receita real
          </p>
        </div>
      )}

      {/* Change / remaining */}
      {totalReceived > 0 && (
        <div className="space-y-2">
          {change > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Troco: {fmt(change)}
              </p>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <Checkbox
                  checked={keepChangeAsCredit}
                  onCheckedChange={(v) => setKeepChangeAsCredit(!!v)}
                />
                <span className="text-xs text-muted-foreground">
                  Manter como crédito do cliente
                </span>
              </label>
            </div>
          )}
          {remaining > 0 && (
            <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs text-red-500">
                Faltam {fmt(remaining)} — cliente ficará com saldo pendente
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bulk discount */}
      {totalUnpaid > 0 && <BulkDiscountButton items={items} onApplied={onPaymentRecorded} />}

      {/* Submit */}
      <Button className="w-full" onClick={handleSubmit} disabled={saving}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Registrar Pagamento {totalReceived > 0 ? `(${fmt(totalReceived)})` : ""}
      </Button>
    </div>
  );
}

/* ── Bulk Discount Button (inline component) ── */
function BulkDiscountButton({ items, onApplied }: { items: BookingItem[]; onApplied: () => void }) {
  const [open, setOpen] = useState(false);
  const [percent, setPercent] = useState("");

  const unpaidItems = items.filter(i => i.paid_status === "unpaid");
  const totalDiscount = items.reduce((s, i) => s + (i.discount_cents || 0), 0);
  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  const apply = async () => {
    const pct = Math.min(100, Math.max(0, parseFloat(percent || "0")));
    if (pct <= 0) return;
    await Promise.all(
      unpaidItems.map(item =>
        supabase.from("booking_items").update({
          discount_cents: Math.round(item.total_price_cents * pct / 100),
        }).eq("id", item.id)
      )
    );
    toast.success(`Desconto de ${pct}% aplicado em ${unpaidItems.length} item(ns)`);
    setOpen(false);
    setPercent("");
    onApplied();
  };

  const removeAll = async () => {
    await Promise.all(
      items.filter(i => (i.discount_cents || 0) > 0).map(item =>
        supabase.from("booking_items").update({ discount_cents: 0 }).eq("id", item.id)
      )
    );
    toast.success("Descontos removidos");
    onApplied();
  };

  if (totalDiscount > 0) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-1.5 h-9 px-3 rounded-md border border-border bg-muted/50 text-sm text-muted-foreground">
          <Percent className="h-3.5 w-3.5" />
          <span>Desconto aplicado: <strong className="text-foreground">−{fmt(totalDiscount)}</strong></span>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={removeAll}>
          <X className="h-3.5 w-3.5 text-muted-foreground" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="w-full h-9 text-xs">
          <Percent className="h-3.5 w-3.5 mr-1.5" /> Aplicar desconto
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="center">
        <div className="space-y-2">
          <p className="text-xs font-medium text-foreground">Desconto % em todos os itens pendentes</p>
          <div className="flex items-center gap-2">
            <Input
              type="number" min="0" max="100"
              placeholder="Ex: 10"
              value={percent}
              onChange={(e) => setPercent(e.target.value)}
              className="h-8 text-sm"
            />
            <span className="text-xs text-muted-foreground">%</span>
          </div>
          <Button size="sm" className="w-full h-7 text-xs" onClick={apply}>Aplicar</Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
