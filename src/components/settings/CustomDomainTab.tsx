import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useSubscription } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Globe,
  Lock,
  Crown,
  Copy,
  CheckCircle,
  Loader2,
  Trash2,
  RefreshCw,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

interface DnsRecord {
  type: string;
  name: string;
  value: string;
  description: string;
}

export function CustomDomainTab() {
  const { currentTenant } = useTenant();
  const { planName, hasActiveSubscription } = useSubscription();
  const { toast } = useToast();

  const [domain, setDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [checking, setChecking] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Domain state from DB
  const [currentDomain, setCurrentDomain] = useState<string | null>(null);
  const [domainStatus, setDomainStatus] = useState<string>("none");
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([]);

  const isProfessional = planName === "profissional";

  useEffect(() => {
    if (currentTenant) {
      loadDomainState();
    }
  }, [currentTenant]);

  const loadDomainState = async () => {
    if (!currentTenant) return;

    const { data } = await supabase
      .from("tenants")
      .select("custom_domain, cloudflare_status")
      .eq("id", currentTenant.id)
      .single();

    if (data) {
      setCurrentDomain(data.custom_domain);
      setDomainStatus(data.cloudflare_status || "none");

      // If pending, auto-check status to get DNS records
      if (data.custom_domain && data.cloudflare_status === "pending") {
        handleCheckStatus(true);
      }
    }
  };

  const handleConnect = async () => {
    if (!domain.trim()) return;

    try {
      setConnecting(true);
      const { data, error } = await supabase.functions.invoke("add-custom-domain", {
        body: { domain: domain.trim() },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCurrentDomain(data.domain);
      setDomainStatus("pending");
      setDnsRecords(data.dns_records || []);
      setDomain("");

      toast({
        title: "Domínio registrado!",
        description: "Configure os registros DNS abaixo no seu provedor.",
      });
    } catch (err: any) {
      console.error("Connect error:", err);
      toast({
        title: "Erro ao conectar domínio",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const handleCheckStatus = async (silent = false) => {
    try {
      setChecking(true);
      const { data, error } = await supabase.functions.invoke("check-domain-status");

      if (error) throw error;

      setDomainStatus(data.status);
      if (data.dns_records) {
        setDnsRecords(data.dns_records);
      }

      if (!silent) {
        toast({
          title: data.status === "active" ? "Domínio ativo! 🎉" : "Verificação em andamento",
          description:
            data.status === "active"
              ? "Seu domínio personalizado está funcionando!"
              : "Os registros DNS ainda estão sendo propagados. Isso pode levar até 24h.",
        });
      }
    } catch (err: any) {
      console.error("Check error:", err);
      if (!silent) {
        toast({
          title: "Erro ao verificar",
          description: err.message || "Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setChecking(false);
    }
  };

  const handleRemove = async () => {
    try {
      setRemoving(true);
      const { data, error } = await supabase.functions.invoke("remove-custom-domain");

      if (error) throw error;

      setCurrentDomain(null);
      setDomainStatus("none");
      setDnsRecords([]);

      toast({
        title: "Domínio removido",
        description: "O domínio personalizado foi desconectado.",
      });
    } catch (err: any) {
      console.error("Remove error:", err);
      toast({
        title: "Erro ao remover",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast({ title: "Copiado!", description: "Valor copiado para a área de transferência." });
  };

  // ======== UPSELL STATE (non-professional) ========
  if (!isProfessional) {
    return (
      <Card className="border-border/50">
        <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-6">
            <Lock className="h-8 w-8 text-muted-foreground/60" />
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-3">
            Sua marca em primeiro lugar.
          </h2>
          <p className="text-muted-foreground max-w-md mb-8 leading-relaxed">
            Não divulgue o nosso link. Tenha o seu próprio site{" "}
            <span className="font-semibold text-foreground">(www.suabarbearia.com.br)</span>{" "}
            e passe mais credibilidade para seus clientes.
          </p>
          <Button
            size="lg"
            className="gap-2"
            onClick={() => {
              // Navigate to billing tab
              const params = new URLSearchParams(window.location.search);
              params.set("tab", "billing");
              window.history.pushState({}, "", `?${params.toString()}`);
              window.dispatchEvent(new PopStateEvent("popstate"));
              // Also trigger via DOM for Settings component
              window.location.search = `?tab=billing`;
            }}
          >
            <Crown className="h-5 w-5" />
            Quero fazer Upgrade
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ======== NO DOMAIN STATE ========
  if (!currentDomain || domainStatus === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domínio Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground">
            Conecte seu próprio domínio para que seus clientes acessem sua página de
            agendamento diretamente pelo seu site.
          </p>

          <div className="space-y-2">
            <label className="text-sm font-medium">Seu domínio</label>
            <div className="flex gap-2">
              <Input
                placeholder="meunegocio.com.br"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleConnect} disabled={connecting || !domain.trim()}>
                {connecting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Globe className="h-4 w-4 mr-2" />
                )}
                Conectar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite apenas o domínio, sem <code>https://</code> ou <code>www.</code>
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ======== PENDING STATE ========
  if (domainStatus === "pending") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domínio Personalizado
            </CardTitle>
            <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
              <Loader2 className="h-3 w-3 animate-spin mr-1" />
              Verificando...
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-border/50">
            <Globe className="h-4 w-4 text-muted-foreground" />
            <span className="font-mono text-sm font-medium">{currentDomain}</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-yellow-500" />
              <h3 className="text-sm font-semibold">Configure os registros DNS abaixo</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Acesse o painel do seu provedor de domínio (GoDaddy, Registro.br, Hostinger, etc.)
              e adicione os seguintes registros:
            </p>

            <div className="space-y-3">
              {dnsRecords.filter(r => r.name && r.value).map((record, i) => (
                <div
                  key={i}
                  className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary" className="font-mono text-xs">
                      {record.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">{record.description}</span>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Nome:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => copyToClipboard(record.name, i * 2)}
                      >
                        {copiedIndex === i * 2 ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copiar
                      </Button>
                    </div>
                    <code className="block text-xs bg-background p-2 rounded font-mono break-all border">
                      {record.name}
                    </code>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Valor:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs gap-1"
                        onClick={() => copyToClipboard(record.value, i * 2 + 1)}
                      >
                        {copiedIndex === i * 2 + 1 ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        Copiar
                      </Button>
                    </div>
                    <code className="block text-xs bg-background p-2 rounded font-mono break-all border">
                      {record.value}
                    </code>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleCheckStatus(false)}
              disabled={checking}
              className="flex-1"
            >
              {checking ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Verificar Status
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removing}
            >
              {removing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Remover
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ======== ACTIVE STATE ========
  if (domainStatus === "active") {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Domínio Personalizado
            </CardTitle>
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30">
              <CheckCircle className="h-3 w-3 mr-1" />
              Ativo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
            <Globe className="h-5 w-5 text-emerald-500" />
            <div className="flex-1">
              <p className="font-mono text-sm font-semibold">{currentDomain}</p>
              <p className="text-xs text-muted-foreground">
                Seu domínio está ativo e funcionando!
              </p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <a href={`https://${currentDomain}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <Button
            variant="destructive"
            onClick={handleRemove}
            disabled={removing}
          >
            {removing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Remover Domínio
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ======== ERROR STATE ========
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Domínio Personalizado
          </CardTitle>
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Erro
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Houve um problema com a verificação do domínio{" "}
          <span className="font-mono font-medium">{currentDomain}</span>. 
          Remova e tente novamente.
        </p>
        <Button
          variant="destructive"
          onClick={handleRemove}
          disabled={removing}
        >
          {removing ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Trash2 className="h-4 w-4 mr-2" />
          )}
          Remover e Reconectar
        </Button>
      </CardContent>
    </Card>
  );
}
