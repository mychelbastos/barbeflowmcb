// Re-export from centralized TenantProvider — all consumers use this hook
import { useTenantContext } from "@/providers/TenantProvider";
export type { Tenant } from "@/providers/TenantProvider";

export const useTenant = useTenantContext;
