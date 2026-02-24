import { SubscribersList } from "@/components/subscriptions/SubscribersList";

export default function SubscriptionMembers() {
  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Assinantes</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Acompanhe todos os clientes com assinatura ativa
        </p>
      </div>
      <SubscribersList />
    </div>
  );
}
