import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Lock, Loader2, CheckCircle2, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { BookingItem } from "./ComandaItemsSection";

interface Props {
  bookingId: string;
  tenantId: string;
  items: BookingItem[];
  comandaClosed: boolean;
  commissionBasis?: string;
  onClose: () => void;
}

export function ComandaCloseSection({ bookingId, tenantId, items, comandaClosed, commissionBasis, onClose }: Props) {
  const [closing, setClosing] = useState(false);
  const [acceptDebt, setAcceptDebt] = useState(false);

  const hasUnpaid = items.some(i => i.paid_status === "unpaid");
  const allSettled = !hasUnpaid;

  const handleClose = async () => {
    setClosing(true);
    try {
      const { data, error } = await supabase.rpc("close_comanda_with_commissions", {
        p_booking_id: bookingId,
        p_tenant_id: tenantId,
        p_commission_basis: commissionBasis || "theoretical",
      });

      if (error) throw error;

      const result = data as any;
      if (result && !result.success) {
        throw new Error(result.error || "Erro ao fechar comanda");
      }

      const snaps = result?.snapshots_created || 0;
      const totalComm = result?.total_commission_cents || 0;
      const commFormatted = (totalComm / 100).toFixed(2);

      toast.success(
        snaps > 0
          ? `Comanda fechada — ${snaps} comissão(ões) gerada(s): R$ ${commFormatted}`
          : "Comanda fechada com sucesso"
      );
      onClose();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("INVALID_COMMISSION_PERCENT")) {
        toast.error("Percentual de comissão inválido (deve ser entre 0% e 100%). Corrija nas configurações do profissional.");
      } else if (msg.includes("NEGATIVE_COMMISSION_NOT_ALLOWED")) {
        toast.error("Erro: comissão resultou em valor negativo. Verifique os valores dos itens e percentuais.");
      } else {
        toast.error("Erro ao fechar comanda: " + msg);
      }
    } finally {
      setClosing(false);
    }
  };

  const [reopening, setReopening] = useState(false);

  const handleReopen = async () => {
    setReopening(true);
    try {
      const { data, error } = await supabase.rpc("reopen_comanda", {
        p_booking_id: bookingId,
        p_tenant_id: tenantId,
      });
      if (error) throw error;
      const result = data as any;
      if (result && !result.success) throw new Error(result.error || "Erro ao reabrir");
      const deleted = result?.commissions_deleted || 0;
      toast.success(deleted > 0 ? `Comanda reaberta — ${deleted} comissão(ões) removida(s)` : "Comanda reaberta");
      onClose();
    } catch (err: any) {
      toast.error("Erro ao reabrir comanda: " + (err.message || ""));
    } finally {
      setReopening(false);
    }
  };

  if (comandaClosed) {
    return (
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-muted/50 border border-border flex items-center gap-2 justify-center">
          <Lock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-medium">Comanda fechada</span>
          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
            Finalizada
          </Badge>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" className="w-full" disabled={reopening}>
              {reopening ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Reabrir Comanda
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reabrir comanda?</AlertDialogTitle>
              <AlertDialogDescription>
                As comissões geradas serão removidas e poderão ser recalculadas ao fechar novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleReopen}>Reabrir</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <Lock className="h-4 w-4" /> Fechar Comanda
      </h4>

      {hasUnpaid && (
        <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            ⚠️ Existem itens pendentes. Ao fechar com pendência, o débito será registrado.
          </p>
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={acceptDebt}
              onCheckedChange={(v) => setAcceptDebt(!!v)}
            />
            <span className="text-xs text-muted-foreground">
              Fechar com pendência (registrar débito)
            </span>
          </label>
        </div>
      )}

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            className="w-full"
            variant={allSettled ? "default" : "outline"}
            disabled={closing || (hasUnpaid && !acceptDebt)}
          >
            {closing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Fechar Comanda
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar comanda?</AlertDialogTitle>
            <AlertDialogDescription>
              Após fechar, a edição será travada e as comissões serão geradas automaticamente.
              {hasUnpaid && " O débito pendente será registrado no saldo do cliente."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
