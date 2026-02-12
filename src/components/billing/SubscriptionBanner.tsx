import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { dashPath } from "@/lib/hostname";
import { AlertCircle, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

export function SubscriptionBanner() {
  const { subscription, isTrialing, isPastDue, isCanceled, isReadOnly, hasActiveSubscription, loading } = useSubscription();
  const navigate = useNavigate();
  const [portalLoading, setPortalLoading] = useState(false);

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch { /* ignore */ } finally {
      setPortalLoading(false);
    }
  };

  if (loading || (hasActiveSubscription && !isTrialing)) return null;

  // Trial banner
  if (isTrialing && subscription?.trial_end) {
    const daysLeft = Math.max(0, Math.ceil((new Date(subscription.trial_end).getTime() - Date.now()) / 86400000));
    return (
      <div className="mx-4 md:mx-6 mt-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
        <Clock className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-sm text-amber-300 flex-1">
          Trial gratuito — <strong>{daysLeft} {daysLeft === 1 ? "dia restante" : "dias restantes"}</strong>
        </span>
        <Button size="sm" variant="outline" className="border-amber-500/30 text-amber-300 hover:bg-amber-500/10 h-8 text-xs" onClick={() => navigate(dashPath("/app/settings?tab=billing"))}>
          Ver plano
        </Button>
      </div>
    );
  }

  // Past due banner
  if (isPastDue) {
    return (
      <div className="mx-4 md:mx-6 mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-sm text-red-300 flex-1">
          Pagamento pendente — atualize seu cartão para manter o acesso.
        </span>
        <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10 h-8 text-xs" onClick={openPortal} disabled={portalLoading}>
          Atualizar pagamento
        </Button>
      </div>
    );
  }

  // Canceled/unpaid banner
  if (isCanceled || isReadOnly) {
    return (
      <div className="mx-4 md:mx-6 mt-3 rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-3 flex items-center gap-3 flex-wrap">
        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
        <span className="text-sm text-red-300 flex-1">
          Assinatura inativa — reative para continuar usando o modoGESTOR.
        </span>
        <Button size="sm" variant="outline" className="border-red-500/30 text-red-300 hover:bg-red-500/10 h-8 text-xs" onClick={() => navigate(dashPath("/app/settings?tab=billing"))}>
          Reativar
        </Button>
      </div>
    );
  }

  return null;
}
