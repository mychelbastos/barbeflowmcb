import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from './AuthProvider';

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  phone?: string;
  email?: string;
  address?: string;
  logo_url?: string;
  cover_url?: string;
  settings: any;
  created_at: string;
  updated_at: string;
}

interface TenantContextType {
  tenants: Tenant[];
  currentTenant: Tenant | null;
  loading: boolean;
  setCurrentTenant: (tenant: Tenant | null) => void;
  getTenantBySlug: (slug: string) => Promise<Tenant | null>;
  refetch: () => void;
}

const TenantContext = createContext<TenantContextType>({
  tenants: [],
  currentTenant: null,
  loading: true,
  setCurrentTenant: () => {},
  getTenantBySlug: async () => null,
  refetch: () => {},
});

const MAX_RETRIES = 3;
const BASE_DELAY = 1000;

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasFetched, setHasFetched] = useState(false);

  const fetchUserTenants = useCallback(async (retryCount = 0) => {
    if (!user?.id) {
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
      return;
    }

    try {
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('users_tenant')
        .select('tenant_id, role')
        .eq('user_id', user.id);

      if (userTenantsError) throw userTenantsError;

      if (!userTenants || userTenants.length === 0) {
        setTenants([]);
        setCurrentTenant(null);
        setLoading(false);
        setHasFetched(true);
        return;
      }

      const tenantIds = userTenants.map(ut => ut.tenant_id);
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .in('id', tenantIds)
        .order('created_at', { ascending: false });

      if (tenantError) throw tenantError;

      setTenants(tenantData || []);
      if (tenantData && tenantData.length > 0) {
        setCurrentTenant(prev => {
          // Preserve current selection if still valid
          if (prev && tenantData.some(t => t.id === prev.id)) {
            return tenantData.find(t => t.id === prev.id) || tenantData[0];
          }
          return tenantData[0];
        });
      }
      setHasFetched(true);
    } catch (error) {
      console.error('Error fetching tenants:', error);
      // Retry with exponential backoff
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, retryCount), 10000);
        setTimeout(() => fetchUserTenants(retryCount + 1), delay);
        return;
      }
      setTenants([]);
      setCurrentTenant(null);
      setHasFetched(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      // Only fetch if we haven't fetched yet for this user
      if (!hasFetched) {
        fetchUserTenants();
      }
    } else {
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
      setHasFetched(false);
    }
  }, [user, hasFetched, fetchUserTenants]);

  const getTenantBySlug = useCallback(async (slug: string) => {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tenant by slug:', error);
      return null;
    }
  }, []);

  return (
    <TenantContext.Provider value={{
      tenants,
      currentTenant,
      loading: loading && !!user,
      setCurrentTenant,
      getTenantBySlug,
      refetch: () => { setHasFetched(false); },
    }}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenantContext = () => useContext(TenantContext);
