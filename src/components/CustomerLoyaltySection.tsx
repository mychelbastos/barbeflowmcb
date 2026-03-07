import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Trophy, Gift, ChevronDown, Loader2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerLoyaltySectionProps {
  customerId: string;
  customerName: string;
}

interface LoyaltyCard {
  id: string;
  stamps: number;
  stamps_required: number;
  reward_pending: boolean;
  completed_count: number;
  expires_at: string | null;
  cycle_started_at: string;
  updated_at: string;
}

interface StampDetail {
  id: string;
  stamped_at: string;
  booking: {
    id: string;
    starts_at: string;
    service: { name: string } | null;
    staff: { name: string } | null;
  } | null;
}

export function CustomerLoyaltySection({ customerId, customerName }: CustomerLoyaltySectionProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [card, setCard] = useState<LoyaltyCard | null>(null);
  const [stamps, setStamps] = useState<StampDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [showStamps, setShowStamps] = useState(false);
  const [stampsLoading, setStampsLoading] = useState(false);
  const [showRedeem, setShowRedeem] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const settings = (currentTenant?.settings || {}) as Record<string, any>;
  const loyaltyEnabled = settings.loyalty_enabled || false;
  const rewardType = settings.loyalty_reward_type || "free_service";
  const rewardPercent = settings.loyalty_reward_percent || 100;

  useEffect(() => {
    if (currentTenant && loyaltyEnabled) {
      loadCard();
    } else {
      setLoading(false);
    }
  }, [customerId, currentTenant]);

  const loadCard = async () => {
    if (!currentTenant) return;
    try {
      const { data, error } = await supabase
        .from("loyalty_cards")
        .select("id, stamps, stamps_required, reward_pending, completed_count, expires_at, cycle_started_at, updated_at")
        .eq("tenant_id", currentTenant.id)
        .eq("customer_id", customerId)
        .maybeSingle();

      if (error) throw error;
      setCard(data);
    } catch (err) {
      console.error("Error loading loyalty card:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadStamps = async () => {
    if (!card) return;
    setStampsLoading(true);
    try {
      const { data, error } = await supabase
        .from("loyalty_stamps")
        .select(`
          id, stamped_at,
          booking:bookings(id, starts_at, service:services(name), staff:staff(name))
        `)
        .eq("loyalty_card_id", card.id)
        .order("stamped_at", { ascending: true });

      if (error) throw error;
      setStamps((data || []) as any);
    } catch (err) {
      console.error("Error loading stamps:", err);
    } finally {
      setStampsLoading(false);
    }
  };

  const handleToggleStamps = () => {
    const newState = !showStamps;
    setShowStamps(newState);
    if (newState && stamps.length === 0) {
      loadStamps();
    }
  };

  const handleRedeem = async () => {
    if (!currentTenant) return;
    setRedeeming(true);
    try {
      const { data, error } = await supabase.rpc("redeem_loyalty_reward", {
        p_tenant_id: currentTenant.id,
        p_customer_id: customerId,
      });

      if (error) throw error;

      if ((data as any)?.success) {
        toast({
          title: "Prêmio resgatado!",
          description: `Novo cartão iniciado para ${customerName}.`,
        });
        loadCard();
        setStamps([]);
        setShowStamps(false);
      } else {
        toast({ title: "Nenhum prêmio pendente.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setRedeeming(false);
      setShowRedeem(false);
    }
  };

  if (!loyaltyEnabled) return null;
  if (loading) return null;

  const rewardLabel = rewardType === "free_service" ? "1 serviço grátis" : `${rewardPercent}% de desconto`;

  // No card yet
  if (!card) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Trophy className="h-4 w-4" />
        <span>Fidelidade: —</span>
      </div>
    );
  }

  const progressDots = Array.from({ length: card.stamps_required }, (_, i) =>
    i < card.stamps ? "●" : "○"
  ).join("");

  return (
    <div className={`rounded-lg border p-4 space-y-3 ${
      card.reward_pending
        ? "border-emerald-500/40 bg-emerald-500/5"
        : "border-border bg-card"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className={`h-4 w-4 ${card.reward_pending ? "text-emerald-500" : "text-amber-500"}`} />
          <span className="text-sm font-medium">Fidelidade:</span>
          <span className="text-xs font-mono tracking-wider text-muted-foreground">{progressDots}</span>
          <span className="text-xs text-muted-foreground">
            {card.stamps} de {card.stamps_required}
          </span>
          {card.reward_pending && (
            <Badge className="bg-emerald-500 text-white text-[10px]">🏆 PRÊMIO!</Badge>
          )}
        </div>
      </div>

      {card.expires_at && !card.reward_pending && (
        <p className="text-xs text-muted-foreground">
          Válido até: {format(parseISO(card.expires_at), "dd/MM/yyyy")}
        </p>
      )}

      {card.completed_count > 0 && (
        <p className="text-xs text-muted-foreground">
          Já completou: {card.completed_count} cartão(ões)
        </p>
      )}

      <div className="flex items-center gap-2">
        {card.reward_pending && (
          <Button
            size="sm"
            variant="default"
            className="bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setShowRedeem(true)}
          >
            <Gift className="h-3.5 w-3.5 mr-1.5" />
            Resgatar prêmio
          </Button>
        )}

        {card.stamps > 0 && (
          <Button size="sm" variant="ghost" onClick={handleToggleStamps} className="text-xs">
            <ChevronDown className={`h-3.5 w-3.5 mr-1 transition-transform ${showStamps ? "rotate-180" : ""}`} />
            Ver selos
          </Button>
        )}
      </div>

      {showStamps && (
        <div className="border-t pt-3 space-y-1.5">
          {stampsLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Carregando...
            </div>
          ) : (
            <>
              {stamps.map((stamp, idx) => (
                <div key={stamp.id} className="flex items-center gap-2 text-xs">
                  <span className="text-emerald-500 font-bold">{idx + 1}.</span>
                  <span className="text-muted-foreground">
                    {format(parseISO(stamp.stamped_at), "dd/MM", { locale: ptBR })}
                  </span>
                  <span>—</span>
                  <span>{stamp.booking?.service?.name || "Serviço"}</span>
                  <span className="text-muted-foreground">— {stamp.booking?.staff?.name || ""}</span>
                  <span className="text-emerald-500">✅</span>
                </div>
              ))}
              {/* Remaining unfilled */}
              {Array.from({ length: card.stamps_required - card.stamps }, (_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>○</span>
                  <span>
                    {i === card.stamps_required - card.stamps - 1
                      ? `${card.stamps + i + 1}º selo → 🎁 Prêmio!`
                      : "Próximo selo..."}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      <AlertDialog open={showRedeem} onOpenChange={setShowRedeem}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resgatar prêmio fidelidade?</AlertDialogTitle>
            <AlertDialogDescription>
              {customerName} completou o cartão e tem direito a {rewardLabel}. O cartão será zerado e um novo ciclo começará.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={redeeming}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleRedeem} disabled={redeeming} className="bg-emerald-600 hover:bg-emerald-700">
              {redeeming ? "Resgatando..." : "Confirmar resgate"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
