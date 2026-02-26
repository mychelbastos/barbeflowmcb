import { useSubscription } from "./useSubscription";

export const PLAN_FEATURES = {
  profissional: {
    ai_image: false,
    ai_text: false,
    order_bump: false,
    unlimited_staff: false,
    whatsapp_chatbot: false,
    max_included_staff: 1,
    commission_rate: 0.025,
    extra_staff_price: "R$ 14,90/mês",
  },
  ilimitado: {
    ai_image: true,
    ai_text: true,
    order_bump: true,
    unlimited_staff: true,
    whatsapp_chatbot: true,
    max_included_staff: Infinity,
    commission_rate: 0.01,
    extra_staff_price: null,
  },
} as const;

export type PlanFeature = keyof typeof PLAN_FEATURES.ilimitado;

export function useTenantPlan() {
  const { planName, isTrialing, hasActiveSubscription, loading, subscription } = useSubscription();

  const resolvedPlan = (planName === "profissional" || planName === "ilimitado")
    ? planName
    : "profissional";

  const features = PLAN_FEATURES[resolvedPlan];

  // During trial, all features are unlocked
  const isFeatureEnabled = (feature: PlanFeature): boolean => {
    if (loading) return false;
    if (isTrialing) return true;
    return features[feature] as boolean;
  };

  return {
    planName: resolvedPlan,
    features,
    isTrialing,
    hasActiveSubscription,
    loading,
    isFeatureEnabled,
  };
}
