import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface UseAdminAuthOptions {
  redirect?: boolean;
}

export function useAdminAuth({ redirect = true }: UseAdminAuthOptions = {}) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      if (redirect) navigate("/app/login");
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const check = async () => {
      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error || !data) {
        if (redirect) navigate("/app/dashboard");
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      setLoading(false);
    };
    check();
  }, [user, authLoading, navigate, redirect]);

  return { isAdmin, loading };
}
