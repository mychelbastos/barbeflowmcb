import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";

export function useWhatsAppStatus() {
  const { currentTenant } = useTenant();
  const [connected, setConnected] = useState<boolean | null>(null);

  const check = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      const { data } = await supabase
        .from("whatsapp_connections")
        .select("whatsapp_connected")
        .eq("tenant_id", currentTenant.id)
        .maybeSingle();
      setConnected(data?.whatsapp_connected ?? false);
    } catch {
      setConnected(false);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    check();
    // Re-check every 30s
    const interval = setInterval(check, 30000);
    return () => clearInterval(interval);
  }, [check]);

  return connected;
}
