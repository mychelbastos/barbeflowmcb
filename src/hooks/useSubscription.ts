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

const SHARED_FEATURES = [
  "Agendamento online",
  "Gestão de clientes",
  "Financeiro completo",
  "Notificações automáticas (WhatsApp e e-mail)",
  "Página pública de agendamento",
  "Pacotes e assinaturas",
  "Pagamentos online",
  "Relatórios",
  "IA para melhoria de imagens",
  "Order bump de produtos",
  "Proteção contra cancelamentos",
];

const EXCLUSIVE_FEATURES = [
  "Agendamento direto pelo WhatsApp (chatbot)",
  "Domínio personalizado (ex: seudominio.com.br)",
];

export const PLANS = {
  essencial: {
    product_id: "prod_Ty1Jvoc0qpDOUu",
    name: "Essencial",
    commission: "2,5%",
    commissionNote: "Cobrada apenas sobre pagamentos online processados pela plataforma + taxa do gateway de pagamento.",
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
    features: SHARED_FEATURES,
    exclusiveFeatures: [] as string[],
  },
  profissional: {
    product_id: "prod_Ty1KYrBniQmXyi",
    name: "Profissional",
    commission: "1,0%",
    commissionNote: "Cobrada apenas sobre pagamentos online processados pela plataforma + taxa do gateway de pagamento.",
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
    features: SHARED_FEATURES,
    exclusiveFeatures: EXCLUSIVE_FEATURES,
  },
};

// Tenants isentos do fluxo de assinatura (slugs)
const EXEMPT_TENANT_SLUGS = ["barbeariaws", "barberflow"];

export function useSubscription() {
  const { currentTenant } = useTenant();
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  const isExempt = EXEMPT_TENANT_SLUGS.some(
    (slug) => currentTenant?.slug?.toLowerCase().startsWith(slug)
  );

  const checkSubscription = useCallback(async () => {
    if (isExempt) {
      setSubscription({ subscribed: true, status: "active", plan_name: "profissional" });
      setLoading(false);
      return;
    }
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
  }, [isExempt]);

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
