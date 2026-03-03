import { useState } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { CommissionsTab } from "@/components/CommissionsTab";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { useDateRange } from "@/contexts/DateRangeContext";
import { SubscriptionCommissionDashboard } from "@/components/subscriptions/SubscriptionCommissionDashboard";
import { SubscriptionCommissionHistory } from "@/components/subscriptions/SubscriptionCommissionHistory";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Ticket, History } from "lucide-react";
import { format } from "date-fns";

export default function CommissionsPage() {
  usePageTitle("Comissões");
  const { dateRange } = useDateRange();
  const [showHistory, setShowHistory] = useState(false);

  const periodStart = format(dateRange.from, "yyyy-MM-dd");
  const periodEnd = format(dateRange.to, "yyyy-MM-dd");

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <DateRangeSelector className="overflow-x-auto" />
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Comissões</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Cálculo automático de comissões por profissional
        </p>
      </div>
      <CommissionsTab />

      {/* Subscription Commissions Section */}
      <div className="border-t border-border pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Ticket className="h-5 w-5 text-violet-400" />
          <h2 className="text-lg font-bold text-foreground">Comissões de Assinaturas</h2>
        </div>
        <p className="text-sm text-muted-foreground -mt-2">
          Fichas de atendimento e distribuição de comissões por assinatura
        </p>
        <SubscriptionCommissionDashboard periodStart={periodStart} periodEnd={periodEnd} />

        <Collapsible open={showHistory} onOpenChange={setShowHistory}>
          <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors w-full py-2">
            <History className="h-4 w-4" />
            <span>Liquidações anteriores</span>
            <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${showHistory ? "rotate-180" : ""}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-2">
            <SubscriptionCommissionHistory periodStart={periodStart} periodEnd={periodEnd} />
          </CollapsibleContent>
        </Collapsible>
      </div>
    </div>
  );
}
