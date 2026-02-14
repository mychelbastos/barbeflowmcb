import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Banknote, CreditCard, Smartphone, Plus, Trash2, Receipt, Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit_card", label: "Cartão Crédito", icon: CreditCard },
  { value: "debit_card", label: "Cartão Débito", icon: CreditCard },
];

interface PaymentLine {
  id: string;
  method: string;
  amount: string; // decimal string
}

interface Props {
  bookingId: string;
  customerId: string;
  tenantId: string;
  staffId: string | null;
  servicePriceCents: number;
  customerBalance: number; // positive = credit, negative = owes
  hasPaidOnline: boolean;
  onPaymentRecorded: () => void;
}

export function LocalPaymentSection({
  bookingId, customerId, tenantId, staffId,
  servicePriceCents, customerBalance, hasPaidOnline, onPaymentRecorded,
}: Props) {
  const [lines, setLines] = useState<PaymentLine[]>([
    { id: crypto.randomUUID(), method: "cash", amount: "" },
  ]);
  const [keepChangeAsCredit, setKeepChangeAsCredit] = useState(false);
  const [saving, setSaving] = useState(false);

  // Total a cobrar = preço do serviço + dívida anterior (saldo negativo)
  // Se cliente tem crédito (saldo positivo), abate do total
  const totalToCharge = Math.max(0, servicePriceCents - customerBalance);

  const totalReceived = useMemo(() =>
    lines.reduce((sum, l) => sum + Math.round(parseFloat(l.amount || "0") * 100), 0),
    [lines]
  );

  const change = Math.max(0, totalReceived - totalToCharge);
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

  const handleSubmit = async () => {
    if (totalToCharge > 0 && totalReceived <= 0) {
      toast.error("Informe o valor recebido");
      return;
    }
    setSaving(true);
    try {
      const receiptId = crypto.randomUUID();
      const payments = lines
        .filter(l => parseFloat(l.amount || "0") > 0)
        .map(l => ({
          method: l.method,
          amount_cents: Math.round(parseFloat(l.amount) * 100),
        }));

      // Get open cash session if any
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
      });

      if (error) throw error;
      const res = result as any;
      if (!res?.success) {
        if (res?.error === "DUPLICATE_PAYMENT") {
          toast.error("Pagamento já registrado para este agendamento");
        } else {
          throw new Error(res?.error || "Erro desconhecido");
        }
        return;
      }

      let msg = `Pagamento de R$ ${(res.total_received / 100).toFixed(2)} registrado`;
      if (res.change > 0) {
        msg += res.kept_as_credit
          ? `. Crédito de R$ ${(res.change / 100).toFixed(2)} mantido na comanda`
          : `. Troco de R$ ${(res.change / 100).toFixed(2)} devolvido`;
      }
      toast.success(msg);
      onPaymentRecorded();
    } catch (err: any) {
      toast.error("Erro ao registrar pagamento: " + (err.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (hasPaidOnline) {
    return (
      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
        <p className="text-sm font-medium text-emerald-500">✅ Pago online</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Pagamento já registrado via plataforma de pagamento online.
        </p>
      </div>
    );
  }

  const fmt = (cents: number) => `R$ ${(Math.abs(cents) / 100).toFixed(2)}`;

  return (
    <div className="space-y-4 pt-3 border-t border-border">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Receipt className="h-4 w-4" /> Pagamento Local
      </h4>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Valor do serviço</p>
          <p className="font-semibold">{fmt(servicePriceCents)}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/50">
          <p className="text-xs text-muted-foreground">Saldo anterior</p>
          <p className={`font-semibold ${customerBalance < 0 ? "text-red-500" : customerBalance > 0 ? "text-emerald-500" : ""}`}>
            {customerBalance < 0 ? `-${fmt(customerBalance)}` : customerBalance > 0 ? `+${fmt(customerBalance)}` : "R$ 0,00"}
          </p>
        </div>
      </div>
      <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
        <p className="text-xs text-muted-foreground">Total a cobrar</p>
        <p className="font-bold text-lg">{fmt(totalToCharge)}</p>
      </div>

      {/* Payment lines - only show if there's something to pay */}
      {totalToCharge > 0 && (
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Formas de pagamento</Label>
          {lines.map((line, i) => (
            <div key={line.id} className="flex items-center gap-2">
              <Select value={line.method} onValueChange={(v) => updateLine(line.id, "method", v)}>
                <SelectTrigger className="w-36 h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>
                      <span className="flex items-center gap-1.5">
                        <m.icon className="h-3 w-3" /> {m.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <CurrencyInput
                value={line.amount}
                onChange={(v) => updateLine(line.id, "amount", v)}
                className="flex-1 h-9"
              />
              {lines.length > 1 && (
                <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0" onClick={() => removeLine(line.id)}>
                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              )}
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={addLine}>
            <Plus className="h-3 w-3 mr-1" /> Adicionar forma
          </Button>
        </div>
      )}

      {totalToCharge === 0 && (
        <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <p className="text-xs text-emerald-500">
            ✅ O crédito do cliente cobre o valor total. Nenhum pagamento adicional necessário.
          </p>
        </div>
      )}

      {/* Change / remaining */}
      {totalReceived > 0 && (
        <div className="space-y-2">
          {change > 0 && (
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  Troco: {fmt(change)}
                </p>
              </div>
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <Checkbox
                  checked={keepChangeAsCredit}
                  onCheckedChange={(v) => setKeepChangeAsCredit(!!v)}
                />
                <span className="text-xs text-muted-foreground">
                  Não consegui dar troco — salvar como crédito do cliente
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

      {/* Submit */}
      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={saving || (totalToCharge > 0 && totalReceived <= 0)}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        {totalToCharge === 0 ? "Registrar (coberto pelo crédito)" : `Registrar Pagamento ${totalReceived > 0 ? `(${fmt(totalReceived)})` : ""}`}
      </Button>
    </div>
  );
}
