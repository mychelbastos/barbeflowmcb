import { usePageTitle } from "@/hooks/usePageTitle";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SubscriptionCommissionConfig } from "@/components/subscriptions/SubscriptionCommissionConfig";
import { SubscriptionCommissionDashboard } from "@/components/subscriptions/SubscriptionCommissionDashboard";
import { SubscriptionCommissionHistory } from "@/components/subscriptions/SubscriptionCommissionHistory";
import { Settings2, Ticket, History } from "lucide-react";

export default function SubscriptionCommissionsPage() {
  usePageTitle("Comissões de Assinaturas");

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Comissões de Assinaturas</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Fichas de atendimento e distribuição de comissões por assinatura
        </p>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="pending" className="gap-1.5 text-xs sm:text-sm">
            <Ticket className="h-4 w-4" />
            <span className="hidden sm:inline">Pendentes</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5 text-xs sm:text-sm">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">Histórico</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-1.5 text-xs sm:text-sm">
            <Settings2 className="h-4 w-4" />
            <span className="hidden sm:inline">Configuração</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <SubscriptionCommissionDashboard />
        </TabsContent>
        <TabsContent value="history">
          <SubscriptionCommissionHistory />
        </TabsContent>
        <TabsContent value="config">
          <SubscriptionCommissionConfig />
        </TabsContent>
      </Tabs>
    </div>
  );
}
