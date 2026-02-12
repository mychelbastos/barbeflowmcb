import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Check,
  Loader2,
  Wifi,
  WifiOff,
  QrCode,
  XCircle,
  MessageCircle,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";

export default function WhatsAppConfig() {
  const { currentTenant, loading: tenantLoading } = useTenant();

  const [connectionStatus, setConnectionStatus] = useState<{
    connected: boolean;
    has_instance: boolean;
    state?: string;
    instance_name?: string;
    whatsapp_number?: string;
    connected_at?: string;
  } | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [connectionLoading, setConnectionLoading] = useState(true);

  const checkConnectionStatus = useCallback(async () => {
    if (!currentTenant?.id) return;
    try {
      const { data, error } = await supabase.functions.invoke("evolution-check-status", {
        body: { tenant_id: currentTenant.id },
      });
      if (error) throw error;
      setConnectionStatus(data);
      if (data?.connected) setQrCode(null);
    } catch (error) {
      console.error("Error checking status:", error);
    } finally {
      setConnectionLoading(false);
    }
  }, [currentTenant?.id]);

  const handleConnect = async () => {
    if (!currentTenant?.id || !currentTenant?.slug) return;
    setConnecting(true);
    setQrCode(null);
    try {
      if (!connectionStatus?.has_instance) {
        await supabase.functions.invoke("evolution-create-instance", {
          body: { tenant_id: currentTenant.id, tenant_slug: currentTenant.slug },
        });
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      let qrData = null;
      let lastError = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error: qrError } = await supabase.functions.invoke("evolution-get-qrcode", {
          body: { tenant_id: currentTenant.id },
        });
        if (qrError) lastError = qrError;
        if (data?.connected) {
          toast.success("WhatsApp já está conectado!");
          await checkConnectionStatus();
          return;
        }
        if (data?.qrcode) {
          qrData = data;
          break;
        }
        if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      if (qrData?.qrcode) {
        setQrCode(qrData.qrcode);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else {
        throw lastError || new Error("Não foi possível gerar o QR Code após várias tentativas.");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao conectar WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentTenant?.id) return;
    setDisconnecting(true);
    try {
      await supabase.functions.invoke("evolution-disconnect", {
        body: { tenant_id: currentTenant.id },
      });
      toast.success("WhatsApp desconectado");
      setQrCode(null);
      await checkConnectionStatus();
    } catch (error: any) {
      toast.error(error.message || "Erro ao desconectar");
    } finally {
      setDisconnecting(false);
    }
  };

  // Poll while QR is showing
  useEffect(() => {
    if (!qrCode || !currentTenant?.id) return;
    const interval = setInterval(() => checkConnectionStatus(), 3000);
    return () => clearInterval(interval);
  }, [qrCode, currentTenant?.id, checkConnectionStatus]);

  useEffect(() => {
    if (currentTenant?.id) checkConnectionStatus();
  }, [currentTenant?.id, checkConnectionStatus]);

  if (tenantLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <MessageCircle className="h-6 w-6 text-emerald-500" />
          WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie a conexão do WhatsApp para envio de notificações automáticas.
        </p>
      </div>

      {/* Connection Card */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-lg">Status da Conexão</h2>
          {!connectionLoading && (
            <Badge
              variant="secondary"
              className={
                connectionStatus?.connected
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-destructive/20 text-destructive"
              }
            >
              {connectionStatus?.connected ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {connectionStatus?.connected ? "Conectado" : "Desconectado"}
            </Badge>
          )}
        </div>

        {connectionLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : connectionStatus?.connected ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <Wifi className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="font-medium text-sm">WhatsApp Conectado</p>
                {connectionStatus.whatsapp_number && (
                  <p className="text-xs text-muted-foreground">+{connectionStatus.whatsapp_number}</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl">
              <h4 className="font-medium text-sm mb-3">Automações Ativas</h4>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" /> Confirmação de agendamento
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" /> Lembrete de agendamento
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" /> Notificação de cancelamento
                </li>
              </ul>
            </div>

            {/* Link to WhatsApp Web */}
            <Button
              variant="outline"
              asChild
              className="w-full"
            >
              <a
                href="https://web.whatsapp.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir WhatsApp Web
              </a>
            </Button>

            <Button
              variant="outline"
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="w-full border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              {disconnecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <XCircle className="h-4 w-4 mr-2" />
              )}
              Desconectar WhatsApp
            </Button>
          </div>
        ) : qrCode ? (
          <div className="space-y-4">
            <div className="flex flex-col items-center p-6 bg-white rounded-xl">
              <img
                src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`}
                alt="QR Code"
                className="w-56 h-56"
              />
            </div>
            <p className="text-sm text-center text-muted-foreground">
              Abra o WhatsApp → Menu → Aparelhos Conectados → Conectar
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Aguardando conexão...
            </div>
            <Button variant="outline" onClick={() => setQrCode(null)} className="w-full">
              Cancelar
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-4 bg-secondary/50 border border-border rounded-xl">
              <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center">
                <QrCode className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium text-sm">Não conectado</p>
                <p className="text-xs text-muted-foreground">Conecte para ativar notificações automáticas</p>
              </div>
            </div>

            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Sem WhatsApp conectado, seus clientes não receberão notificações automáticas de agendamento.
                </p>
              </div>
            </div>

            <Button onClick={handleConnect} disabled={connecting} className="w-full">
              {connecting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageCircle className="h-4 w-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
