import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CustomerBalanceAlert } from "@/components/CustomerBalanceAlert";
import { LocalPaymentSection } from "@/components/modals/LocalPaymentSection";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User, Phone, Scissors, Clock, Users, TrendingUp, Edit,
  CheckCircle, XCircle, MessageCircle, CreditCard,
} from "lucide-react";
import { motion } from "framer-motion";

const ease = [0.16, 1, 0.3, 1] as const;

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "destructive" | "secondary" | "outline" }> = {
  confirmed: { label: "Confirmado", variant: "default" },
  completed: { label: "Concluído", variant: "secondary" },
  cancelled: { label: "Cancelado", variant: "destructive" },
  no_show: { label: "Faltou", variant: "destructive" },
  pending: { label: "Pendente", variant: "outline" },
};

interface Props {
  booking: any;
  tenantId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // Actions - only shown when provided
  onEdit?: () => void;
  onStatusChange?: (bookingId: string, status: string, booking?: any) => void;
  showActions?: boolean;
}

export function BookingDetailsModal({
  booking, tenantId, open, onOpenChange,
  onEdit, onStatusChange, showActions = false,
}: Props) {
  const [customerNotes, setCustomerNotes] = useState<string | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [hasPaidOnline, setHasPaidOnline] = useState(false);
  const [onlinePaymentInfo, setOnlinePaymentInfo] = useState<{ amount_cents: number; updated_at: string; external_id: string | null } | null>(null);
  const [paymentRecorded, setPaymentRecorded] = useState(false);
  const [balanceKey, setBalanceKey] = useState(0);

  useEffect(() => {
    if (!booking || !open) {
      setCustomerNotes(null);
      setCustomerBalance(0);
      setHasPaidOnline(false);
      setPaymentRecorded(false);
      return;
    }
    loadBookingDetails();
  }, [booking?.id, open]);

  const loadBookingDetails = async () => {
    if (!booking) return;

    // Load customer notes, balance, and online payment status in parallel
    // Customer notes
    if (booking.customer_id) {
      const { data: custData } = await supabase
        .from("customers")
        .select("notes")
        .eq("id", booking.customer_id)
        .single();
      setCustomerNotes(custData?.notes || null);

      const { data: balData } = await supabase
        .from("customer_balance_entries")
        .select("type, amount_cents")
        .eq("customer_id", booking.customer_id)
        .eq("tenant_id", tenantId);
      const total = (balData || []).reduce((sum, e) =>
        sum + (e.type === "credit" ? e.amount_cents : -e.amount_cents), 0
      );
      setCustomerBalance(total);
    }

    // Check if paid online or locally
    if (!booking.is_recurring) {
      const { data: payData } = await supabase
        .from("payments")
        .select("status, amount_cents, updated_at, external_id")
        .eq("booking_id", booking.id)
        .eq("status", "paid")
        .limit(1);
      const paidOnline = (payData || []).length > 0;
      setHasPaidOnline(paidOnline);
      if (paidOnline && payData?.[0]) {
        setOnlinePaymentInfo({
          amount_cents: payData[0].amount_cents,
          updated_at: payData[0].updated_at,
          external_id: payData[0].external_id,
        });
      } else {
        setOnlinePaymentInfo(null);
      }

      // Check if local payment already recorded
      const { data: localPayData } = await supabase
        .from("customer_balance_entries")
        .select("id")
        .eq("booking_id", booking.id)
        .eq("tenant_id", tenantId)
        .or("description.ilike.Pagamento local%,description.eq.Serviço realizado")
        .limit(1);
      if ((localPayData || []).length > 0) {
        setPaymentRecorded(true);
      }
    }
  };

  if (!booking) return null;

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isRecurring = booking.is_recurring;
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const servicePriceCents = booking.service?.price_cents || 0;
  const isBenefitBooking = !!booking.customer_package_id || !!booking.customer_subscription_id;

  const handlePaymentRecorded = () => {
    setPaymentRecorded(true);
    setBalanceKey(prev => prev + 1);
    // Reload balance
    if (booking.customer_id) {
      supabase
        .from("customer_balance_entries")
        .select("type, amount_cents")
        .eq("customer_id", booking.customer_id)
        .eq("tenant_id", tenantId)
        .then(({ data }) => {
          const total = (data || []).reduce((sum, e) =>
            sum + (e.type === "credit" ? e.amount_cents : -e.amount_cents), 0
          );
          setCustomerBalance(total);
        });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Detalhes do Agendamento</DialogTitle>
          <DialogDescription className="sr-only">Informações do agendamento</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="space-y-4"
        >
          {/* Customer header */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center">
                <User className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-bold text-foreground">{booking.customer?.name}</p>
                {isRecurring && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20 mt-0.5 inline-block">
                    Cliente Fixo
                  </span>
                )}
              </div>
            </div>
            {booking.customer?.phone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5" />
                <span>{booking.customer.phone}</span>
              </div>
            )}
          </div>

          {/* Details rows */}
          <div className="space-y-3">
            {[
              { icon: Scissors, label: "Serviço", value: booking.service?.name },
              {
                icon: Clock, label: "Horário",
                value: `${format(new Date(booking.starts_at), "dd/MM 'às' HH:mm", { locale: ptBR })} — ${format(new Date(booking.ends_at), "HH:mm")}`,
              },
              ...(booking.staff?.name ? [{ icon: Users, label: "Profissional", value: booking.staff.name }] : []),
              {
                icon: TrendingUp, label: "Valor",
                value: isBenefitBooking ? "Incluso no plano/pacote" : `R$ ${(servicePriceCents / 100).toFixed(2)}`,
                highlight: !isBenefitBooking,
              },
            ].map((item, i) => (
              <div key={i} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <item.icon className="h-3.5 w-3.5" />
                  <span>{item.label}</span>
                </div>
                <span className={`text-sm font-semibold ${(item as any).highlight ? "text-primary font-bold" : "text-foreground"}`}>
                  {item.value}
                </span>
              </div>
            ))}

            {/* Benefit badges */}
            {isBenefitBooking && (
              <div className="flex gap-2">
                {booking.customer_package_id && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Pacote</Badge>
                )}
                {booking.customer_subscription_id && (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px]">Assinatura</Badge>
                )}
              </div>
            )}

            {/* Status */}
            {!isRecurring && (
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-muted-foreground">Status</span>
                <Badge variant={status.variant}>{status.label}</Badge>
              </div>
            )}
          </div>

          {/* Balance alert */}
          <CustomerBalanceAlert key={balanceKey} customerId={booking.customer_id} tenantId={tenantId} />

          {/* Customer notes */}
          {customerNotes && (
            <div className="p-2.5 bg-amber-500/5 border border-amber-500/20 rounded-lg">
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-1 font-semibold">📋 Observações / Anamnese</p>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap">{customerNotes}</p>
            </div>
          )}

          {/* Booking notes */}
          {booking.notes && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1 font-medium">Observações do Agendamento</p>
              <p className="text-sm text-foreground/80">{booking.notes}</p>
            </div>
          )}

          {/* Payment status banners */}
          {hasPaidOnline && onlinePaymentInfo && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <p className="text-sm font-medium text-emerald-500">✅ Pago online</p>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>Valor: R$ {(onlinePaymentInfo.amount_cents / 100).toFixed(2)}</p>
                <p>Data: {format(parseISO(onlinePaymentInfo.updated_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                {onlinePaymentInfo.external_id && <p>ID MP: #{onlinePaymentInfo.external_id}</p>}
              </div>
            </div>
          )}

          {paymentRecorded && !hasPaidOnline && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-sm font-medium text-emerald-500">✅ Pago no balcão</p>
            </div>
          )}

          {/* Payment section - only for completed bookings without benefits, not yet paid */}
          {isCompleted && !isBenefitBooking && !paymentRecorded && !hasPaidOnline && booking.customer_id && (
            <LocalPaymentSection
              bookingId={booking.id}
              customerId={booking.customer_id}
              tenantId={tenantId}
              staffId={booking.staff_id || null}
              servicePriceCents={servicePriceCents}
              customerBalance={customerBalance}
              hasPaidOnline={false}
              onPaymentRecorded={handlePaymentRecorded}
            />
          )}

          {/* Pending warning for completed but unpaid */}
          {isCompleted && !isBenefitBooking && !paymentRecorded && !hasPaidOnline && !booking.customer_id && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <p className="text-sm font-medium text-amber-500">⚠️ Pendente</p>
            </div>
          )}

          {/* Actions */}
          {showActions && !isRecurring && (
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
              {!isCancelled && !isCompleted && onEdit && (
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-1" /> Editar
                </Button>
              )}
              {booking.status === "confirmed" && onStatusChange && (
                <Button size="sm" variant="outline" onClick={() => { onStatusChange(booking.id, "completed", booking); onOpenChange(false); }}>
                  <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" /> Concluir
                </Button>
              )}
              {!isCancelled && onStatusChange && (
                <Button size="sm" variant="destructive" onClick={() => { onStatusChange(booking.id, "cancelled", booking); onOpenChange(false); }}>
                  <XCircle className="h-4 w-4 mr-1" /> Cancelar
                </Button>
              )}
              {booking.customer?.phone && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const digits = booking.customer.phone.replace(/\D/g, "");
                    const phone = digits.startsWith("55") ? digits : "55" + digits;
                    window.open(`https://web.whatsapp.com/send?phone=${phone}`, "_blank");
                  }}
                >
                  <MessageCircle className="h-4 w-4 mr-1 text-emerald-500" /> WhatsApp
                </Button>
              )}
            </div>
          )}
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
