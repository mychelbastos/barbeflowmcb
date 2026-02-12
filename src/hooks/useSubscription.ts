import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "./useTenant";

export interface SubscriptionData {
  subscribed: boolean;
  status: string;
  plan_name?: string;
  product_id?: string;
  subscription_end?: string;
  trial_end?: string;
  cancel_at_period_end?: boolean;
}

export const PLANS = {
  essencial: {
    product_id: "prod_Ty1Jvoc0qpDOUu",
    price_id: "price_1T05HMCxw1gIFu9gYyzo61F3",
    name: "Essencial",
    price_monthly: 5990,
    commission: "2,5%",
    features: [
      "Agendamento online",
      "Gestão de clientes",
      "Financeiro completo",
      "Notificações automáticas",
      "Pacotes e assinaturas",
      "Pagamentos online",
      "Relatórios",
    ],
  },
  profissional: {
    product_id: "prod_Ty1KYrBniQmXyi",
    price_id: "price_1T05HvCxw1gIFu9guQDhSvfs",
    name: "Profissional",
    price_monthly: 8990,
    commission: "1,0%",
    features: [
      "Tudo do Essencial",
      "Chatbot WhatsApp",
      "Domínio personalizado",
      "Taxa reduzida (1,0%)",
    ],
  },
};

export function useSubscription() {
  const { currentTenant } = useTenant();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const checkSubscription = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) throw error;
      setSubscription(data);
    } catch (err) {
      console.error("Error checking subscription:", err);
      setSubscription({ subscribed: false, status: "none" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSubscription();
    // Refresh every 60 seconds
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const hasActiveSubscription =
    subscription?.status === "active" || subscription?.status === "trialing";
  const isPastDue = subscription?.status === "past_due";
  const isCanceled = subscription?.status === "canceled";
  const needsSubscription = !subscription || subscription.status === "none";
  const isTrialing = subscription?.status === "trialing";

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isPastDue,
    isCanceled,
    needsSubscription,
    isTrialing,
    checkSubscription,
  };
}
