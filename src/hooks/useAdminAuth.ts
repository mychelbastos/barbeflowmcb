import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface UseAdminAuthOptions {
  /** If true, redirects non-admins away. If false, just checks status silently. */
  redirect?: boolean;
}

export function useAdminAuth({ redirect = true }: UseAdminAuthOptions = {}) {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        if (redirect) navigate("/app/login");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

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
  }, [navigate, redirect]);

  return { isAdmin, loading };
}
