import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";
import { supabase } from "@/integrations/supabase/client";

// Lista de emails que têm acesso ao sistema de multi-barbearia
const SUPER_ADMIN_EMAILS = [
  "mycheldesigner@gmail.com", // Email do administrador principal
];

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSuperAdminStatus();
  }, [user]);

  const checkSuperAdminStatus = async () => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }

    try {
      // Verificar se o email do usuário está na lista de super admins
      const isEmailSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || "");
      
      if (isEmailSuperAdmin) {
        setIsSuperAdmin(true);
        setLoading(false);
        return;
      }

      // Por simplicidade, por enquanto só verifica o email
      // Em uma implementação mais robusta, você poderia verificar outros critérios
      setIsSuperAdmin(isEmailSuperAdmin);
    } catch (error) {
      console.error('Error checking super admin status:', error);
      setIsSuperAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return {
    isSuperAdmin,
    loading,
  };
};