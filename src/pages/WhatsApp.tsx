import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  MessageCircle, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  Smartphone,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff
} from "lucide-react";
import { NoTenantState } from "@/components/NoTenantState";

interface ConnectionStatus {
  connected: boolean;
  has_instance: boolean;
  state?: string;
  instance_name?: string;
  whatsapp_number?: string;
  connected_at?: string;
}

export default function WhatsApp() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!currentTenant?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke("evolution-check-status", {
        body: { tenant_id: currentTenant.id }
      });

      if (error) throw error;
      setStatus(data);

      // If connected, clear QR code
      if (data?.connected) {
        setQrCode(null);
      }
    } catch (error: any) {
      console.error("Error checking status:", error);
    }
  }, [currentTenant?.id]);

  useEffect(() => {
    const loadStatus = async () => {
      setLoading(true);
      await checkStatus();
      setLoading(false);
    };

    if (currentTenant?.id) {
      loadStatus();
    }
  }, [currentTenant?.id, checkStatus]);

  // Poll for status while showing QR code
  useEffect(() => {
    if (!qrCode || !currentTenant?.id) return;

    const interval = setInterval(async () => {
      await checkStatus();
    }, 5000);

    return () => clearInterval(interval);
  }, [qrCode, currentTenant?.id, checkStatus]);

  const handleConnect = async () => {
    if (!currentTenant?.id || !currentTenant?.slug) return;

    setConnecting(true);
    setQrCode(null);

    try {
      // Step 1: Create or get instance
      if (!status?.has_instance) {
        const { data: createData, error: createError } = await supabase.functions.invoke("evolution-create-instance", {
          body: { 
            tenant_id: currentTenant.id,
            tenant_slug: currentTenant.slug
          }
        });

        if (createError) throw createError;
        console.log("Instance created:", createData);
      }

      // Step 2: Get QR code
      const { data: qrData, error: qrError } = await supabase.functions.invoke("evolution-get-qrcode", {
        body: { tenant_id: currentTenant.id }
      });

      if (qrError) throw qrError;

      if (qrData?.connected) {
        toast.success("WhatsApp já está conectado!");
        await checkStatus();
      } else if (qrData?.qrcode) {
        setQrCode(qrData.qrcode);
        toast.info("Escaneie o QR Code com seu WhatsApp");
      } else {
        toast.error("Não foi possível gerar o QR Code. Tente novamente.");
      }

    } catch (error: any) {
      console.error("Error connecting:", error);
      toast.error(error.message || "Erro ao conectar WhatsApp");
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!currentTenant?.id) return;

    setDisconnecting(true);

    try {
      const { error } = await supabase.functions.invoke("evolution-disconnect", {
        body: { tenant_id: currentTenant.id }
      });

      if (error) throw error;

      toast.success("WhatsApp desconectado com sucesso");
      setQrCode(null);
      await checkStatus();

    } catch (error: any) {
      console.error("Error disconnecting:", error);
      toast.error(error.message || "Erro ao desconectar WhatsApp");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await checkStatus();
    setRefreshing(false);
    toast.success("Status atualizado");
  };

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "";
    // Format: +55 11 99999-9999
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 13) {
      return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 4)} ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return `+${cleaned}`;
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48 bg-zinc-800" />
          <Skeleton className="h-4 w-72 mt-2 bg-zinc-800" />
        </div>
        <Skeleton className="h-64 w-full bg-zinc-800" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-400" />
            WhatsApp
          </h1>
          <p className="text-zinc-400 mt-1">
            Conecte seu WhatsApp para enviar notificações automáticas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={refreshing}
          className="border-zinc-700 hover:bg-zinc-800"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-zinc-100">Status da Conexão</CardTitle>
              <CardDescription className="text-zinc-400">
                {status?.has_instance 
                  ? `Instância: ${status.instance_name}`
                  : "Nenhuma instância configurada"
                }
              </CardDescription>
            </div>
            <Badge 
              variant={status?.connected ? "default" : "secondary"}
              className={status?.connected 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                : "bg-zinc-700 text-zinc-400"
              }
            >
              {status?.connected ? (
                <>
                  <Wifi className="h-3 w-3 mr-1" />
                  Conectado
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3 mr-1" />
                  Desconectado
                </>
              )}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {status?.connected ? (
            // Connected State
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">WhatsApp Conectado</p>
                  {status.whatsapp_number && (
                    <p className="text-sm text-zinc-400 flex items-center gap-1">
                      <Smartphone className="h-3 w-3" />
                      {formatPhoneNumber(status.whatsapp_number)}
                    </p>
                  )}
                  {status.connected_at && (
                    <p className="text-xs text-zinc-500 mt-1">
                      Conectado em {new Date(status.connected_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 bg-zinc-800/50 rounded-lg">
                <h4 className="font-medium text-zinc-100 mb-2">Automações Ativas</h4>
                <ul className="text-sm text-zinc-400 space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Confirmação de agendamento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Lembrete de agendamento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Notificação de cancelamento
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    Confirmação de pagamento
                  </li>
                </ul>
              </div>

              <Button
                variant="outline"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10"
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
            // QR Code State
            <div className="space-y-4">
              <div className="flex flex-col items-center p-6 bg-white rounded-lg">
                <img 
                  src={qrCode.startsWith("data:") ? qrCode : `data:image/png;base64,${qrCode}`} 
                  alt="QR Code WhatsApp" 
                  className="w-64 h-64"
                />
              </div>
              <div className="text-center space-y-2">
                <p className="font-medium text-zinc-100">Escaneie o QR Code</p>
                <p className="text-sm text-zinc-400">
                  Abra o WhatsApp no seu celular → Menu → Aparelhos Conectados → Conectar um aparelho
                </p>
              </div>
              <div className="flex items-center justify-center gap-2 text-sm text-amber-400">
                <Loader2 className="h-4 w-4 animate-spin" />
                Aguardando conexão...
              </div>
              <Button
                variant="outline"
                onClick={() => setQrCode(null)}
                className="w-full border-zinc-700 hover:bg-zinc-800"
              >
                Cancelar
              </Button>
            </div>
          ) : (
            // Disconnected State
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg">
                <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
                  <QrCode className="h-6 w-6 text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-100">WhatsApp não conectado</p>
                  <p className="text-sm text-zinc-400">
                    Conecte seu WhatsApp para ativar as notificações automáticas
                  </p>
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-amber-400">Importante</p>
                    <p className="text-sm text-zinc-400 mt-1">
                      Sem o WhatsApp conectado, seus clientes não receberão notificações 
                      automáticas de agendamentos.
                    </p>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleConnect}
                disabled={connecting}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950"
              >
                {connecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Conectar WhatsApp
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-zinc-100">Como funciona?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-emerald-400 font-bold">1</span>
              </div>
              <h4 className="font-medium text-zinc-100 mb-1">Conecte</h4>
              <p className="text-sm text-zinc-400">
                Clique em "Conectar WhatsApp" e escaneie o QR Code com seu celular.
              </p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-emerald-400 font-bold">2</span>
              </div>
              <h4 className="font-medium text-zinc-100 mb-1">Automático</h4>
              <p className="text-sm text-zinc-400">
                As mensagens são enviadas automaticamente quando ocorrem agendamentos.
              </p>
            </div>
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center mb-3">
                <span className="text-emerald-400 font-bold">3</span>
              </div>
              <h4 className="font-medium text-zinc-100 mb-1">Seu Número</h4>
              <p className="text-sm text-zinc-400">
                As mensagens são enviadas do seu próprio número de WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
