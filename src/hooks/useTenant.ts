import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

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

export const useTenant = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchUserTenants();
    } else {
      setTenants([]);
      setCurrentTenant(null);
      setLoading(false);
    }
  }, [user]);

  const fetchUserTenants = async () => {
    try {
      // Use a simpler approach - get user's tenant associations first
      const { data: userTenants, error: userTenantsError } = await supabase
        .from('users_tenant')
        .select('tenant_id, role')
        .eq('user_id', user?.id);

      if (userTenantsError) throw userTenantsError;

      if (!userTenants || userTenants.length === 0) {
        setTenants([]);
        setCurrentTenant(null);
        setLoading(false);
        return;
      }

      // Get tenant details for the user's associated tenants
      const tenantIds = userTenants.map(ut => ut.tenant_id);
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .in('id', tenantIds)
        .order('created_at', { ascending: false });

      if (tenantError) throw tenantError;

      setTenants(tenantData || []);
      if (tenantData && tenantData.length > 0) {
        setCurrentTenant(tenantData[0]);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setTenants([]);
      setCurrentTenant(null);
    } finally {
      setLoading(false);
    }
  };

  const getTenantBySlug = async (slug: string) => {
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
  };

  return {
    tenants,
    currentTenant,
    loading,
    getTenantBySlug,
    setCurrentTenant,
  };
};