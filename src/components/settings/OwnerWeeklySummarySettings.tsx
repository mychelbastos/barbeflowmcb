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
import { Separator } from "@/components/ui/separator";
import { BarChart3, Smartphone, Eye, EyeOff, Loader2 } from "lucide-react";

interface Props {
  currentTenant: any;
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
  const [phone, setPhone] = useState("");
  const [includeStaff, setIncludeStaff] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Check if current user is owner
  useEffect(() => {
    if (!user || !currentTenant) {
      setCheckingOwner(false);
      return;
    }

    const checkOwner = async () => {
      try {
        // The app uses is_tenant_admin RPC or checks users_tenant role
        // Staff table has is_owner field, but no user_id column
        // Use the admin check as proxy for owner access
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
    };

    checkOwner();
  }, [user, currentTenant]);

  // Load settings
  useEffect(() => {
    if (!currentTenant) return;
    const settings = currentTenant.settings || {};
    const savedPhone = settings.owner_summary_phone || "";
    setPhone(savedPhone ? formatPhoneMask(savedPhone) : "");
    setIncludeStaff(settings.owner_summary_include_staff !== false);
  }, [currentTenant]);

  const handleSave = async () => {
    if (!currentTenant) return;

    const digits = phone.replace(/\D/g, "");

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
            owner_summary_include_staff: includeStaff,
          },
        })
        .eq("id", currentTenant.id);

      if (error) throw error;

      toast({
        title: digits
          ? "Resumo semanal ativado!"
          : "Resumo semanal desativado.",
        description: digits
          ? "Você vai receber todo sábado às 20h."
          : "O número foi removido.",
      });
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (checkingOwner || !isOwner) return null;

  const digits = phone.replace(/\D/g, "");
  const isActive = digits.length >= 10;
  const tenantName = currentTenant?.name || "Meu Negócio";

  // Pre-fill with tenant phone if phone is empty
  const handlePhoneFocus = () => {
    if (!phone && currentTenant?.phone) {
      setPhone(formatPhoneMask(currentTenant.phone));
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Resumo Semanal do Negócio
          </div>
          <Badge
            variant={isActive ? "success" : "secondary"}
          >
            {isActive ? "Ativo" : "Inativo"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-sm text-muted-foreground">
          Receba toda semana no seu WhatsApp um resumo completo com atendimentos,
          faturamento, cancelamentos e performance dos profissionais.
        </p>

        <div className="space-y-2">
          <Label className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            Número que vai receber o resumo
          </Label>
          <Input
            placeholder="(75) 98846-0046"
            value={phone}
            onFocus={handlePhoneFocus}
            onChange={(e) => setPhone(formatPhoneMask(e.target.value))}
            className="max-w-xs"
          />
          <p className="text-xs text-muted-foreground">
            Pode ser qualquer número com WhatsApp
          </p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">
              Incluir performance por profissional
            </Label>
            <p className="text-xs text-muted-foreground">
              Mostra atendimentos e faturamento de cada barbeiro
            </p>
          </div>
          <Switch checked={includeStaff} onCheckedChange={setIncludeStaff} />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            {showPreview ? (
              <EyeOff className="h-4 w-4 mr-2" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            {showPreview ? "Fechar exemplo" : "Ver exemplo do resumo"}
          </Button>
        </div>

        {showPreview && (
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 p-4 text-sm font-mono whitespace-pre-wrap text-foreground">
{`📊 *Resumo Semanal — ${tenantName}*
01/03 a 07/03/2026

✂️ Atendimentos: 124
👥 Clientes únicos: 83
❌ Cancelamentos: 38 (23%)

💰 Faturamento: R$ 1.669,00
💳 Online: R$ 820,00
💵 No local: R$ 849,00
${includeStaff ? `
👤 *Performance por Profissional:*
• João — 45 atendimentos — R$ 580,00
• Pedro — 38 atendimentos — R$ 510,00
• Lucas — 41 atendimentos — R$ 579,00` : ""}

📅 Próximo resumo: sábado, 14/03 às 20h`}
          </div>
        )}

        <Separator />

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>📅 Enviado automaticamente todo sábado às 20h</span>
          <span>💡 Para desativar, basta limpar o número acima</span>
        </div>
      </CardContent>
    </Card>
  );
}
