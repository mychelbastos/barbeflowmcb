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
    name: "Essencial",
    commission: "2,5%",
    month: {
      price_monthly: 5990,
      display: "R$ 59,90/mês",
    },
    year: {
      price_monthly: 4790,
      price_yearly: 57480,
      display: "R$ 47,90/mês",
      display_yearly: "R$ 574,80/ano",
    },
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
    name: "Profissional",
    commission: "1,0%",
    month: {
      price_monthly: 8990,
      display: "R$ 89,90/mês",
    },
    year: {
      price_monthly: 7190,
      price_yearly: 86280,
      display: "R$ 71,90/mês",
      display_yearly: "R$ 862,80/ano",
    },
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
    const interval = setInterval(checkSubscription, 60_000);
    return () => clearInterval(interval);
  }, [checkSubscription]);

  const status = subscription?.status;
  const planName = (subscription?.plan_name || "essencial") as keyof typeof PLANS;

  const hasActiveSubscription =
    status === "active" || status === "trialing";
  const isPastDue = status === "past_due";
  const isCanceled = status === "canceled";
  const isTrialing = status === "trialing";
  const needsSubscription = !status || status === "none";
  const isReadOnly = status === "canceled" || status === "unpaid";
  const canWrite = hasActiveSubscription || isPastDue;

  const features = {
    whatsappChatbot: planName === "profissional",
    customDomain: planName === "profissional",
    reducedRate: planName === "profissional",
  };

  return {
    subscription,
    loading,
    hasActiveSubscription,
    isPastDue,
    isCanceled,
    needsSubscription,
    isTrialing,
    isReadOnly,
    canWrite,
    planName,
    features,
    checkSubscription,
  };
}
