import { useState, useMemo } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Banknote, CreditCard, Smartphone, CheckCircle, Loader2,
  Clock, Users, Scissors, AlertTriangle, XCircle, Calendar,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { formatBRL } from "@/utils/formatBRL";

const METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit_card", label: "Crédito", icon: CreditCard },
  { value: "debit_card", label: "Débito", icon: CreditCard },
] as const;

interface RelatedBooking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name: string;
  service_price_cents: number;
  staff_id: string | null;
  staff_name: string | null;
  items: any[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerName: string;
  bookings: RelatedBooking[];
  onConcluded: () => void;
  onStatusChange?: (bookingId: string, status: string, booking?: any) => void;
}

export function UnifiedComandaModal({
  open, onOpenChange, customerName, bookings, onConcluded, onStatusChange,
}: Props) {
  const { toast } = useToast();
  const [selectedMethod, setSelectedMethod] = useState("pix");
  const [discountInput, setDiscountInput] = useState("");
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  // Only actionable bookings (confirmed status)
  const actionableBookings = useMemo(
    () => bookings.filter(b => b.status === "confirmed"),
    [bookings]
  );

  // Compute totals from booking_items if available, fallback to service_price_cents
  const getBookingTotal = (b: RelatedBooking) => {
    if (b.items && b.items.length > 0) {
      return b.items.reduce((sum: number, item: any) => {
        const effective = (item.total_price_cents || 0) - (item.discount_cents || 0);
        return sum + (item.paid_status === "covered" || item.paid_status === "courtesy" ? 0 : effective);
      }, 0);
    }
    return b.service_price_cents || 0;
  };

  const subtotalCents = useMemo(
    () => actionableBookings.reduce((sum, b) => sum + getBookingTotal(b), 0),
    [actionableBookings]
  );

  const discountCents = Math.round(parseFloat(discountInput || "0") * 100);
  const totalCents = Math.max(0, subtotalCents - discountCents);

  const dateLabel = bookings.length > 0
    ? format(new Date(bookings[0].starts_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : "";

  const handleConcludeAll = async () => {
    if (actionableBookings.length === 0) return;
    setProcessing(true);
    try {
      const { data, error } = await supabase.rpc("conclude_unified_bookings", {
        p_booking_ids: actionableBookings.map(b => b.id),
        p_payment_method: selectedMethod,
        p_discount_cents: discountCents,
        p_notes: notes || null,
      });

      if (error) throw error;

      const result = data as any;
      if (result?.success) {
        toast({
          title: `${result.bookings_concluded} serviço${result.bookings_concluded > 1 ? "s" : ""} concluído${result.bookings_concluded > 1 ? "s" : ""}`,
          description: formatBRL(result.final_cents),
        });
        onConcluded();
        onOpenChange(false);
      } else {
        toast({ title: "Erro ao concluir", description: "Tente novamente.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro ao concluir", description: err.message, variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">
            Comanda Unificada — {customerName}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3" />
            {dateLabel} · {actionableBookings.length} serviço{actionableBookings.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1"
        >
          {/* ═══════ ITENS AGRUPADOS POR BOOKING ═══════ */}
          {bookings.map((b, idx) => {
            const isConcluded = b.status === "completed";
            const isCancelled = b.status === "cancelled";
            const isNoShow = b.status === "no_show";
            const isInactive = isConcluded || isCancelled || isNoShow;
            const time = format(new Date(b.starts_at), "HH:mm");

            return (
              <div key={b.id} className={`rounded-xl border p-3 space-y-2 ${isInactive ? "opacity-50" : "bg-muted/30"}`}>
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span className="font-medium">{time}</span>
                    {b.staff_name && (
                      <>
                        <span className="text-muted-foreground/40">·</span>
                        <Users className="h-3 w-3" />
                        <span>{b.staff_name}</span>
                      </>
                    )}
                  </div>
                  {isConcluded && <Badge variant="secondary" className="text-[10px]">Concluído</Badge>}
                  {isCancelled && <Badge variant="destructive" className="text-[10px]">Cancelado</Badge>}
                  {isNoShow && <Badge variant="destructive" className="text-[10px]">Faltou</Badge>}
                </div>

                {/* Items */}
                {b.items && b.items.length > 0 ? (
                  b.items.map((item: any, i: number) => {
                    const isCovered = item.paid_status === "covered" || item.paid_status === "courtesy";
                    const effective = (item.total_price_cents || 0) - (item.discount_cents || 0);
                    return (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Scissors className="h-3 w-3 text-muted-foreground" />
                          <span className={isCovered ? "line-through text-muted-foreground" : ""}>
                            {item.title}
                          </span>
                          {isCovered && (
                            <Badge variant="outline" className="text-[9px] bg-amber-500/10 text-amber-500 border-amber-500/20">
                              coberto
                            </Badge>
                          )}
                        </div>
                        <span className={`font-medium tabular-nums ${isCovered ? "text-muted-foreground line-through" : ""}`}>
                          {formatBRL(effective)}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Scissors className="h-3 w-3 text-muted-foreground" />
                      <span>{b.service_name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{formatBRL(b.service_price_cents)}</span>
                  </div>
                )}

                {/* Individual actions */}
                {!isInactive && (
                  <div className="flex gap-2 pt-1">
                    {onStatusChange && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-amber-500 hover:text-amber-400"
                          onClick={() => { onStatusChange(b.id, "no_show"); }}
                        >
                          <AlertTriangle className="h-3 w-3 mr-1" /> Faltou
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-destructive hover:text-destructive/80"
                          onClick={() => { onStatusChange(b.id, "cancelled"); }}
                        >
                          <XCircle className="h-3 w-3 mr-1" /> Cancelar
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {/* ═══════ TOTAIS E PAGAMENTO ═══════ */}
          {actionableBookings.length > 0 && (
            <>
              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums">{formatBRL(subtotalCents)}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <Label className="text-muted-foreground text-sm">Desconto</Label>
                  <div className="w-32">
                    <CurrencyInput
                      value={discountInput}
                      onValueChange={setDiscountInput}
                      placeholder="R$ 0,00"
                      className="h-8 text-right text-sm"
                    />
                  </div>
                </div>

                <Separator />

                <div className="flex justify-between text-base font-bold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatBRL(totalCents)}</span>
                </div>
              </div>

              {/* Payment method */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Forma de pagamento</Label>
                <div className="grid grid-cols-4 gap-2">
                  {METHODS.map(m => {
                    const Icon = m.icon;
                    const isActive = selectedMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        onClick={() => setSelectedMethod(m.value)}
                        className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs transition-all ${
                          isActive
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="leading-tight">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Observação (opcional)"
                className="h-16 text-sm resize-none"
              />

              {/* CTA */}
              <Button
                className="w-full"
                size="lg"
                disabled={processing || actionableBookings.length === 0}
                onClick={handleConcludeAll}
              >
                {processing ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
                ) : (
                  <><CheckCircle className="h-4 w-4 mr-2" /> Concluir tudo ({actionableBookings.length} serviço{actionableBookings.length !== 1 ? "s" : ""})</>
                )}
              </Button>
            </>
          )}

          {actionableBookings.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              Nenhum serviço pendente para concluir.
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
