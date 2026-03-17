import { useState, useEffect } from "react";
import { useAuth } from "./useAuth";

// Lista de emails que têm acesso ao sistema multi-empresa
const SUPER_ADMIN_EMAILS = [
  "mycheldesigner@gmail.com",
];

export const useSuperAdmin = () => {
  const { user } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsSuperAdmin(false);
      setLoading(false);
      return;
    }
    const isEmailSuperAdmin = SUPER_ADMIN_EMAILS.includes(user.email || "");
    setIsSuperAdmin(isEmailSuperAdmin);
    setLoading(false);
  }, [user]);

  return { isSuperAdmin, loading };
};
