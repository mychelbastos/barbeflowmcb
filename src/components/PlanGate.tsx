import { ReactNode } from "react";
import { useTenantPlan, type PlanFeature } from "@/hooks/useTenantPlan";
import { UpgradePrompt } from "./UpgradePrompt";

interface PlanGateProps {
  feature: PlanFeature;
  featureLabel?: string;
  children: ReactNode;
  /** What to render when feature is locked. Defaults to UpgradePrompt. */
  fallback?: ReactNode;
  /** If true, renders children but disabled (for inline elements like buttons) */
  inline?: boolean;
}

export function PlanGate({ feature, featureLabel, children, fallback, inline }: PlanGateProps) {
  const { isFeatureEnabled, loading } = useTenantPlan();

  if (loading) return null;

  if (isFeatureEnabled(feature)) {
    return <>{children}</>;
  }

  if (inline) {
    return (
      <UpgradePrompt feature={featureLabel || feature} inline />
    );
  }

  return <>{fallback ?? <UpgradePrompt feature={featureLabel || feature} />}</>;
}
