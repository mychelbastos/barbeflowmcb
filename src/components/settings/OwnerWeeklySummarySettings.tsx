import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Smartphone, Loader2 } from "lucide-react";

interface Props {
  currentTenant: any;
}

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return phone;
}

function formatPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function OwnerWeeklySummarySettings({ currentTenant }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isOwner, setIsOwner] = useState(false);
  const [checkingOwner, setCheckingOwner] = useState(true);

  const [enabled, setEnabled] = useState(true);
  const [altPhone, setAltPhone] = useState("");
  const [showAltField, setShowAltField] = useState(false);
  const [saving, setSaving] = useState(false);

  const barbershopPhone = currentTenant?.phone || "";
  const hasPhone = barbershopPhone.length >= 10;

  // Check owner
  useEffect(() => {
    if (!user || !currentTenant) {
      setCheckingOwner(false);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase
          .from("users_tenant")
          .select("role")
          .eq("user_id", user.id)
          .eq("tenant_id", currentTenant.id)
          .single();
        setIsOwner(data?.role === "admin");
      } catch {
        setIsOwner(false);
      } finally {
        setCheckingOwner(false);
      }
    })();
  }, [user, currentTenant]);

  // Load settings
  useEffect(() => {
    if (!currentTenant) return;
    const s = currentTenant.settings || {};
    setEnabled(s.owner_summary_enabled !== false);
    const saved = s.owner_summary_phone || "";
    setAltPhone(saved ? formatPhoneMask(saved) : "");
    setShowAltField(!!saved);
  }, [currentTenant]);

  const handleToggle = async (val: boolean) => {
    setEnabled(val);
    try {
      setSaving(true);
      const { error } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...currentTenant.settings,
            owner_summary_enabled: val,
          },
        })
        .eq("id", currentTenant.id);
      if (error) throw error;
      toast({
        title: val ? "Resumo semanal ativado!" : "Resumo semanal desativado.",
      });
    } catch (err: any) {
      setEnabled(!val);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAlt = async () => {
    const digits = altPhone.replace(/\D/g, "");
    if (digits && digits.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Informe um número com DDD (mínimo 10 dígitos).",
        variant: "destructive",
      });
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...currentTenant.settings,
            owner_summary_phone: digits || null,
          },
        })
        .eq("id", currentTenant.id);
      if (error) throw error;
      toast({
        title: digits
          ? "Resumo será enviado para o número alternativo."
          : "Resumo será enviado para o WhatsApp da barbearia.",
      });
      if (!digits) {
        setShowAltField(false);
        setAltPhone("");
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (checkingOwner || !isOwner) return null;

  const altDigits = altPhone.replace(/\D/g, "");
  const destinationPhone = altDigits || barbershopPhone;
  const isAlternative = !!altDigits;

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumo Semanal do Negócio
          </div>
          <Badge variant={enabled && hasPhone ? "success" : "secondary"}>
            {enabled && hasPhone ? "Ativo" : "Inativo"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          📊 Todo sábado às 20h, você recebe um resumo da semana no WhatsApp com
          atendimentos, faturamento e performance dos profissionais.
        </p>

        {!hasPhone ? (
          <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 text-sm text-muted-foreground">
            Cadastre o telefone da barbearia em{" "}
            <span className="font-medium text-foreground">
              Configurações → Geral
            </span>{" "}
            para receber o resumo semanal.
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <Label className="text-base font-medium">
                Receber resumo semanal
              </Label>
              <Switch
                checked={enabled}
                onCheckedChange={handleToggle}
                disabled={saving}
              />
            </div>

            {enabled && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enviado para:{" "}
                  <span className="font-medium text-foreground">
                    {formatPhone(destinationPhone)}
                  </span>{" "}
                  <span className="text-xs">
                    ({isAlternative ? "número personalizado" : "WhatsApp da barbearia"})
                  </span>
                </p>

                {!showAltField ? (
                  <button
                    type="button"
                    className="text-sm text-primary hover:underline"
                    onClick={() => setShowAltField(true)}
                  >
                    ↳ Receber em outro número?
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border p-4">
                    <Label className="flex items-center gap-2">
                      <Smartphone className="h-4 w-4" />
                      Número alternativo
                    </Label>
                    <Input
                      placeholder="(00) 00000-0000"
                      value={altPhone}
                      onChange={(e) => setAltPhone(formatPhoneMask(e.target.value))}
                      className="max-w-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      Deixe vazio para receber no número da barbearia.
                    </p>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveAlt} disabled={saving} size="sm">
                        {saving ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Salvar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setShowAltField(false);
                          setAltPhone("");
                        }}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!enabled && (
              <p className="text-sm text-muted-foreground">
                Você não está recebendo o resumo semanal.
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
