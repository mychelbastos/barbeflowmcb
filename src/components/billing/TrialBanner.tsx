import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Clock, ArrowRight } from "lucide-react";

export function TrialBanner() {
  const { isTrialing, subscription } = useSubscription();
  const navigate = useNavigate();

  if (!isTrialing || !subscription?.trial_end) return null;

  const daysLeft = Math.max(
    0,
    Math.ceil(
      (new Date(subscription.trial_end).getTime() - Date.now()) /
        (1000 * 60 * 60 * 24)
    )
  );

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-500/20">
      <div className="flex items-center justify-between px-4 md:px-6 py-2">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-amber-500 shrink-0" />
          <span className="text-muted-foreground">
            <span className="font-semibold text-amber-500">
              Trial gratuito: {daysLeft} {daysLeft === 1 ? "dia" : "dias"} restantes
            </span>
            <span className="hidden sm:inline">
              {" · "}Todas as funcionalidades liberadas
            </span>
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/app/settings?tab=billing")}
          className="text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 shrink-0"
        >
          Escolher plano
          <ArrowRight className="h-3.5 w-3.5 ml-1" />
        </Button>
      </div>
    </div>
  );
}
