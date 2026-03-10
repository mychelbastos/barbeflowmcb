import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CustomerBalanceAlert } from "@/components/CustomerBalanceAlert";
import { ComandaItemsSection, type BookingItem } from "@/components/modals/ComandaItemsSection";
import { ComandaPaymentSection } from "@/components/modals/ComandaPaymentSection";
import { ComandaCloseSection } from "@/components/modals/ComandaCloseSection";
import { NoShowDialog } from "@/components/modals/NoShowDialog";
import { UnifiedComandaModal } from "@/components/modals/UnifiedComandaModal";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User, Phone, Scissors, Clock, Users, Edit,
  CheckCircle, XCircle, MessageCircle, AlertTriangle, RefreshCw, Loader2, ClipboardList,
} from "lucide-react";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

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
  onEdit?: () => void;
  onStatusChange?: (bookingId: string, status: string, booking?: any) => void;
  showActions?: boolean;
  tenantSettings?: any;
}

export function BookingDetailsModal({
  booking, tenantId, open, onOpenChange,
  onEdit, onStatusChange, showActions = false, tenantSettings,
}: Props) {
  const { toast } = useToast();
  const [customerNotes, setCustomerNotes] = useState<string | null>(null);
  const [customerBalance, setCustomerBalance] = useState<number>(0);
  const [bookingItems, setBookingItems] = useState<BookingItem[]>([]);
  const [comandaStatus, setComandaStatus] = useState<string>("open");
  const [balanceKey, setBalanceKey] = useState(0);
  const [prevStatus, setPrevStatus] = useState<string | null>(null);
  const [showNoShowDialog, setShowNoShowDialog] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState<any>(null);
  const [retryingRefund, setRetryingRefund] = useState(false);
  const [relatedBookings, setRelatedBookings] = useState<any[]>([]);
  const [showUnifiedModal, setShowUnifiedModal] = useState(false);
  const paymentSectionRef = useRef<HTMLDivElement>(null);
  const closeSectionRef = useRef<HTMLDivElement>(null);

  const loadData = useCallback(async () => {
    if (!booking || !open) return;

    const customerId = booking.customer_id;

    // Load all data in parallel
    // Load all data in parallel
    const [custRes, balRes, itemsRes, statusRes, payRes] = await Promise.all([
      customerId
        ? supabase.from("customers").select("notes").eq("id", customerId).single()
        : Promise.resolve({ data: null }),
      customerId
        ? supabase.from("customer_balance_entries").select("type, amount_cents")
            .eq("customer_id", customerId).eq("tenant_id", tenantId)
        : Promise.resolve({ data: null }),
      supabase.from("booking_items")
        .select("*, staff:staff(name)")
        .eq("booking_id", booking.id)
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true }),
      supabase.from("bookings").select("comanda_status").eq("id", booking.id).single(),
      supabase.from("payments")
        .select("id, amount_cents, status, refund_cents, refund_status, forfeit_percent, external_id")
        .eq("booking_id", booking.id)
        .maybeSingle(),
    ]);

    setCustomerNotes(custRes.data?.notes || null);

    const balTotal = (balRes.data || []).reduce((sum: number, e: any) =>
      sum + (e.type === "credit" ? e.amount_cents : -e.amount_cents), 0);
    setCustomerBalance(balTotal);

    const mappedItems: BookingItem[] = (itemsRes.data || []).map((d: any) => ({
      id: d.id,
      type: d.type,
      ref_id: d.ref_id,
      title: d.title,
      quantity: d.quantity,
      unit_price_cents: d.unit_price_cents,
      total_price_cents: d.total_price_cents,
      discount_cents: d.discount_cents || 0,
      staff_id: d.staff_id,
      staff_name: d.staff?.name || null,
      paid_status: d.paid_status,
      paid_at: d.paid_at,
      payment_id: d.payment_id,
      receipt_id: d.receipt_id,
      purchase_price_cents: d.purchase_price_cents,
    }));
    setBookingItems(mappedItems);

    setComandaStatus(statusRes.data?.comanda_status || "open");
    setPaymentInfo(payRes.data || null);
  }, [booking?.id, open, tenantId]);

  // Load related bookings for unified comanda
  useEffect(() => {
    if (!booking || !open) {
      setRelatedBookings([]);
      return;
    }
    const checkRelated = async () => {
      try {
        const { data } = await supabase.rpc("get_related_bookings", {
          p_booking_id: booking.id,
        });
        setRelatedBookings(data && data.length > 1 ? (data as any[]) : []);
      } catch {
        setRelatedBookings([]);
      }
    };
    checkRelated();
  }, [booking?.id, open]);

  useEffect(() => {
    if (!booking || !open) {
      setCustomerNotes(null);
      setCustomerBalance(0);
      setBookingItems([]);
      setComandaStatus("open");
      return;
    }
    loadData();
  }, [booking?.id, open, loadData]);

  // Auto-scroll to payment/close section when booking transitions to completed
  useEffect(() => {
    if (!booking || !open) {
      setPrevStatus(null);
      return;
    }
    const justCompleted = prevStatus && prevStatus !== "completed" && booking.status === "completed";
    setPrevStatus(booking.status);

    if (justCompleted) {
      // Wait for DOM to update with completed sections
      const timer = setTimeout(() => {
        const hasUnpaid = bookingItems.some(i => i.paid_status === "unpaid");
        const isBenefit = !!booking.customer_package_id || !!booking.customer_subscription_id;
        const target = hasUnpaid && !isBenefit ? paymentSectionRef.current : closeSectionRef.current;
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [booking?.status, open]);

  if (!booking) return null;

  const status = STATUS_CONFIG[booking.status] || STATUS_CONFIG.pending;
  const isRecurring = booking.is_recurring;
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";
  const isNoShow = booking.status === "no_show";
  const isBenefitBooking = !!booking.customer_package_id || !!booking.customer_subscription_id;
  const comandaClosed = comandaStatus === "closed";

  const handleRefresh = () => {
    loadData();
    setBalanceKey(prev => prev + 1);
  };

  const retryRefund = async (paymentId: string) => {
    setRetryingRefund(true);
    try {
      await supabase.from("payments").update({
        refund_status: "pending",
        status: "refund_pending",
      }).eq("id", paymentId);

      const { data: { session } } = await supabase.auth.getSession();
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const resp = await fetch(`${supabaseUrl}/functions/v1/mp-refund-payment`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ payment_id: paymentId, tenant_id: tenantId }),
      });
      const data = await resp.json();
      if (data.success) {
        toast({ title: "Reembolso processado!" });
      } else {
        toast({ title: "Reembolso falhou novamente", variant: "destructive" });
      }
      handleRefresh();
    } catch {
      toast({ title: "Erro ao tentar reembolso", variant: "destructive" });
    } finally {
      setRetryingRefund(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            Comanda
            {comandaClosed && (
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20 ml-2">
                Fechada
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes do agendamento e comanda</DialogDescription>
        </DialogHeader>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1"
        >
          {/* ═══════════════ SEÇÃO 1: DADOS DO BOOKING ═══════════════ */}
          <div className="p-3 rounded-xl bg-muted/50 border border-border space-y-2.5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <User className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm">{booking.customer?.name}</p>
                {booking.customer?.phone && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {booking.customer.phone}
                  </p>
                )}
              </div>
              <Badge variant={status.variant} className="text-[10px]">{status.label}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Scissors className="h-3 w-3" />
                <span className="truncate">{booking.service?.name}</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{format(new Date(booking.starts_at), "dd/MM HH:mm", { locale: ptBR })} — {format(new Date(booking.ends_at), "HH:mm")}</span>
              </div>
              {booking.staff?.name && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{booking.staff.name}</span>
                </div>
              )}
              {isBenefitBooking && (
                <div className="flex gap-1.5">
                  {booking.customer_package_id && (
                    <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20">Pacote</Badge>
                  )}
                  {booking.customer_subscription_id && (
                    <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">Assinatura</Badge>
                  )}
                </div>
              )}
            </div>

            {/* Customer notes */}
            {customerNotes && (
              <div className="p-2 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                <p className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">📋 Observações</p>
                <p className="text-xs text-foreground/80 whitespace-pre-wrap mt-0.5">{customerNotes}</p>
              </div>
            )}

            {booking.notes && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">Nota:</span> {booking.notes}
              </p>
            )}
          </div>

          {/* Balance alert */}
          <CustomerBalanceAlert key={balanceKey} customerId={booking.customer_id} tenantId={tenantId} />

          {/* ═══════════════ SEÇÃO 2: ITENS DA COMANDA ═══════════════ */}
          {!isRecurring && !isCancelled && !isNoShow && (
            <>
              <Separator />
              <ComandaItemsSection
                bookingId={booking.id}
                tenantId={tenantId}
                items={bookingItems}
                onItemsChange={handleRefresh}
                comandaClosed={comandaClosed}
                bookingStartsAt={booking.starts_at}
              />
            </>
          )}

          {/* ═══════════════ SEÇÃO 3: PAGAMENTO ═══════════════ */}
          {/* Benefit banner */}
          {!isRecurring && isCompleted && isBenefitBooking && !comandaClosed && (
            <>
              <Separator />
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400 text-center">
                  🎫 Serviço coberto por {booking.customer_package_id ? "pacote" : "assinatura"}
                </p>
              </div>
            </>
          )}

          {/* Payment section: show for non-benefit OR benefit with unpaid extras */}
          {!isRecurring && isCompleted && !isCancelled && booking.customer_id &&
            (!isBenefitBooking || bookingItems.some(i => i.paid_status === "unpaid")) && (
            <div ref={paymentSectionRef}>
              <Separator />
              <ComandaPaymentSection
                bookingId={booking.id}
                customerId={booking.customer_id}
                tenantId={tenantId}
                staffId={booking.staff_id || null}
                items={bookingItems}
                customerBalance={customerBalance}
                onPaymentRecorded={handleRefresh}
                comandaClosed={comandaClosed}
              />
            </div>
          )}

          {/* ═══════════════ SEÇÃO 4: FECHAR COMANDA ═══════════════ */}
          {!isRecurring && isCompleted && !isCancelled && (
            <div ref={closeSectionRef}>
              <Separator />
              <ComandaCloseSection
                bookingId={booking.id}
                tenantId={tenantId}
                items={bookingItems}
                comandaClosed={comandaClosed}
                commissionBasis={(booking as any)?.tenant_commission_basis}
                onClose={handleRefresh}
              />
            </div>
          )}

          {/* ═══════════════ NO-SHOW REFUND INFO ═══════════════ */}
          {isNoShow && paymentInfo && paymentInfo.refund_cents > 0 && (
            <>
              <Separator />
              <div className="p-3 rounded-xl border space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium">Não compareceu</span>
                </div>
                <div className="text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Retenção:</span>
                    <span className="font-medium text-destructive">
                      R$ {((paymentInfo.amount_cents - paymentInfo.refund_cents) / 100).toFixed(2)} ({paymentInfo.forfeit_percent}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reembolso:</span>
                    <span className="font-medium text-emerald-600">
                      R$ {(paymentInfo.refund_cents / 100).toFixed(2)}
                      {paymentInfo.refund_status === "approved" && " ✅"}
                      {paymentInfo.refund_status === "pending" && " ⏳"}
                      {paymentInfo.refund_status === "failed" && " ⚠️"}
                    </span>
                  </div>
                </div>
                {paymentInfo.refund_status === "failed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2"
                    disabled={retryingRefund}
                    onClick={() => retryRefund(paymentInfo.id)}
                  >
                    {retryingRefund ? (
                      <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Processando...</>
                    ) : (
                      <><RefreshCw className="h-3 w-3 mr-1" /> Tentar reembolso novamente</>
                    )}
                  </Button>
                )}
              </div>
            </>
          )}

        </motion.div>

        {/* ═══════════════ AÇÕES (sticky bottom) ═══════════════ */}
        {showActions && !isRecurring && (
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border flex-shrink-0">
            {!isCancelled && !isCompleted && !isNoShow && onEdit && (
              <Button size="sm" variant="outline" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" /> Editar
              </Button>
            )}
            {booking.status === "confirmed" && onStatusChange && (
              <Button size="sm" variant="outline" onClick={() => { onStatusChange(booking.id, "completed", booking); }}>
                <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" /> Concluir
              </Button>
            )}
            {(booking.status === "confirmed" || booking.status === "completed") && !isNoShow && (
              <Button size="sm" variant="outline" onClick={() => setShowNoShowDialog(true)}>
                <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" /> Faltou
              </Button>
            )}
            {!isCancelled && !isNoShow && onStatusChange && (
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

        {/* No-Show Dialog */}
        <NoShowDialog
          open={showNoShowDialog}
          onOpenChange={setShowNoShowDialog}
          bookingId={booking.id}
          tenantId={tenantId}
          tenantSettings={tenantSettings}
          onComplete={() => {
            handleRefresh();
            if (onStatusChange) onStatusChange(booking.id, "no_show", booking);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
