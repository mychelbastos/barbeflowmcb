import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAuth() {
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const check = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/app/login");
        return;
      }

      const { data, error } = await supabase.rpc("is_platform_admin");
      if (error || !data) {
        navigate("/app/dashboard");
        return;
      }

      setIsAdmin(true);
      setLoading(false);
    };
    check();
  }, [navigate]);

  return { isAdmin, loading };
}
