import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Trophy, Info, Loader2 } from "lucide-react";

interface StaffMember {
  id: string;
  name: string;
}

export function LoyaltySettingsTab() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);

  const settings = (currentTenant?.settings || {}) as Record<string, any>;

  const [enabled, setEnabled] = useState(settings.loyalty_enabled || false);
  const [stampsRequired, setStampsRequired] = useState<number>(settings.loyalty_stamps_required || 10);
  const [durationMonths, setDurationMonths] = useState<string>(
    settings.loyalty_duration_months ? String(settings.loyalty_duration_months) : "none"
  );
  const [rewardType, setRewardType] = useState<string>(settings.loyalty_reward_type || "free_service");
  const [rewardPercent, setRewardPercent] = useState<number>(settings.loyalty_reward_percent || 50);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>(settings.loyalty_eligible_staff || []);

  const allSelected = selectedStaffIds.length === 0;

  useEffect(() => {
    const s = (currentTenant?.settings || {}) as Record<string, any>;
    setEnabled(s.loyalty_enabled || false);
    setStampsRequired(s.loyalty_stamps_required || 10);
    setDurationMonths(s.loyalty_duration_months ? String(s.loyalty_duration_months) : "none");
    setRewardType(s.loyalty_reward_type || "free_service");
    setRewardPercent(s.loyalty_reward_percent || 50);
    setSelectedStaffIds(s.loyalty_eligible_staff || []);
  }, [currentTenant]);

  useEffect(() => {
    if (currentTenant && enabled) {
      loadStaff();
    }
  }, [currentTenant, enabled]);

  const loadStaff = async () => {
    if (!currentTenant) return;
    setStaffLoading(true);
    try {
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true)
        .order("name");
      setStaffList(data || []);
    } catch (err) {
      console.error("Error loading staff:", err);
    } finally {
      setStaffLoading(false);
    }
  };

  const handleToggleAll = (checked: boolean) => {
    if (checked) {
      setSelectedStaffIds([]);
    } else {
      setSelectedStaffIds(staffList.map((s) => s.id));
    }
  };

  const handleToggleStaff = (staffId: string, checked: boolean) => {
    if (allSelected) {
      // Switching from "all" to individual: start with all selected, then remove this one
      const allIds = staffList.map((s) => s.id);
      if (!checked) {
        setSelectedStaffIds(allIds.filter((id) => id !== staffId));
      }
    } else {
      if (checked) {
        const newIds = [...selectedStaffIds, staffId];
        // If all are now selected, switch back to empty array (= all)
        if (newIds.length === staffList.length) {
          setSelectedStaffIds([]);
        } else {
          setSelectedStaffIds(newIds);
        }
      } else {
        setSelectedStaffIds(selectedStaffIds.filter((id) => id !== staffId));
      }
    }
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      const clampedStamps = Math.max(2, Math.min(50, stampsRequired));
      const duration = durationMonths === "none" ? null : parseInt(durationMonths);

      const { error } = await supabase
        .from("tenants")
        .update({
          settings: {
            ...(currentTenant.settings as any),
            loyalty_enabled: enabled,
            loyalty_stamps_required: clampedStamps,
            loyalty_duration_months: duration,
            loyalty_reward_type: rewardType,
            loyalty_reward_percent: rewardType === "free_service" ? 100 : Math.max(1, Math.min(100, rewardPercent)),
            loyalty_eligible_staff: allSelected ? [] : selectedStaffIds,
          },
        })
        .eq("id", currentTenant.id);

      if (error) throw error;

      toast({
        title: enabled ? "Cartão fidelidade ativado!" : "Cartão fidelidade desativado",
        description: enabled
          ? `Clientes ganham prêmio a cada ${clampedStamps} atendimentos.`
          : "O programa de fidelidade foi desativado.",
      });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <Trophy className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <CardTitle>Cartão Fidelidade Digital</CardTitle>
              <CardDescription>
                Fidelize seus clientes automaticamente! A cada atendimento agendado pela plataforma, o cliente ganha um selo.
              </CardDescription>
            </div>
          </div>
          <Badge variant={enabled ? "default" : "secondary"} className={enabled ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : ""}>
            {enabled ? "Ativo" : "Inativo"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Toggle */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Ativar programa de fidelidade</Label>
            <p className="text-sm text-muted-foreground">Clientes acumulam selos a cada atendimento</p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        {enabled && (
          <>
            {/* Stamps required */}
            <div className="space-y-2">
              <Label>Selos para completar o cartão</Label>
              <Input
                type="number"
                min={2}
                max={50}
                value={stampsRequired}
                onChange={(e) => setStampsRequired(parseInt(e.target.value) || 10)}
                className="w-32"
              />
              <p className="text-xs text-muted-foreground">Mínimo 2, máximo 50</p>
            </div>

            {/* Duration */}
            <div className="space-y-3">
              <Label>Validade do cartão</Label>
              <RadioGroup value={durationMonths} onValueChange={setDurationMonths} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { value: "3", label: "3 meses" },
                  { value: "6", label: "6 meses" },
                  { value: "12", label: "12 meses" },
                  { value: "none", label: "Sem prazo" },
                ].map((opt) => (
                  <div key={opt.value} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt.value} id={`dur-${opt.value}`} />
                    <Label htmlFor={`dur-${opt.value}`} className="cursor-pointer text-sm">{opt.label}</Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Reward type */}
            <div className="space-y-3">
              <Label>Recompensa ao completar</Label>
              <RadioGroup value={rewardType} onValueChange={setRewardType} className="space-y-2">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="free_service" id="rw-free" />
                  <Label htmlFor="rw-free" className="cursor-pointer text-sm">Próximo serviço grátis</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="discount" id="rw-disc" />
                  <Label htmlFor="rw-disc" className="cursor-pointer text-sm">Desconto no próximo serviço</Label>
                </div>
              </RadioGroup>

              {rewardType === "discount" && (
                <div className="flex items-center gap-2 ml-6">
                  <Label className="text-sm">Percentual:</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={rewardPercent}
                    onChange={(e) => setRewardPercent(parseInt(e.target.value) || 50)}
                    className="w-20"
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              )}
            </div>

            {/* Eligible staff */}
            <div className="space-y-3">
              <Label>Profissionais participantes</Label>
              {staffLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando profissionais...
                </div>
              ) : (
                <div className="space-y-2 rounded-lg border p-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="staff-all"
                      checked={allSelected}
                      onCheckedChange={(checked) => handleToggleAll(!!checked)}
                    />
                    <Label htmlFor="staff-all" className="cursor-pointer text-sm font-medium">
                      Todos os profissionais
                    </Label>
                  </div>

                  {staffList.length > 0 && (
                    <>
                      <div className="border-t my-2" />
                      <p className="text-xs text-muted-foreground mb-1">ou selecione individualmente</p>
                      {staffList.map((staff) => {
                        const isChecked = allSelected || selectedStaffIds.includes(staff.id);
                        return (
                          <div key={staff.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`staff-${staff.id}`}
                              checked={isChecked}
                              onCheckedChange={(checked) => handleToggleStaff(staff.id, !!checked)}
                            />
                            <Label htmlFor={`staff-${staff.id}`} className="cursor-pointer text-sm">
                              {staff.name}
                            </Label>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Info box */}
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-1.5">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-2">
                <Info className="h-4 w-4" />
                Regras automáticas
              </div>
              <p className="text-xs text-muted-foreground">• Só conta agendamentos feitos pelo cliente (site/link)</p>
              <p className="text-xs text-muted-foreground">• Clientes com assinatura ou pacote ativo não participam</p>
              <p className="text-xs text-muted-foreground">• Agendamentos feitos pelo admin (balcão) não contam</p>
              <p className="text-xs text-muted-foreground">• Só conta atendimentos com profissionais selecionados acima</p>
              <p className="text-xs text-muted-foreground">• O selo é adicionado automaticamente ao concluir atendimento</p>
              <p className="text-xs text-muted-foreground">• Se o cartão expirar, os selos são zerados e o ciclo recomeça</p>
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? "Salvando..." : "Salvar configurações"}
        </Button>
      </CardContent>
    </Card>
  );
}