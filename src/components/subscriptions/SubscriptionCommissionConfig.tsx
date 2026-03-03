import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2, Settings2, DollarSign, PieChart, Save } from "lucide-react";
import { toast } from "sonner";
import { formatBRL } from "@/utils/formatBRL";

interface CommissionConfig {
  id?: string;
  plan_id: string;
  commission_mode: "fixed_per_service" | "proportional_pool";
  fixed_amount_cents: number;
  pool_percent: number;
}

interface Plan {
  id: string;
  name: string;
  price_cents: number;
  active: boolean;
}

export function SubscriptionCommissionConfig() {
  const { currentTenant } = useTenant();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [configs, setConfigs] = useState<Record<string, CommissionConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      const [plansRes, configsRes] = await Promise.all([
        supabase.from("subscription_plans").select("id, name, price_cents, active").eq("tenant_id", currentTenant.id).order("name"),
        supabase.from("subscription_commission_config" as any).select("*").eq("tenant_id", currentTenant.id),
      ]);

      setPlans((plansRes.data || []) as Plan[]);

      const configMap: Record<string, CommissionConfig> = {};
      ((configsRes.data || []) as any[]).forEach((c: any) => {
        configMap[c.plan_id] = {
          id: c.id,
          plan_id: c.plan_id,
          commission_mode: c.commission_mode,
          fixed_amount_cents: c.fixed_amount_cents || 0,
          pool_percent: c.pool_percent || 40,
        };
      });
      setConfigs(configMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getConfig = (planId: string): CommissionConfig => {
    return configs[planId] || {
      plan_id: planId,
      commission_mode: "proportional_pool",
      fixed_amount_cents: 0,
      pool_percent: 40,
    };
  };

  const updateConfig = (planId: string, patch: Partial<CommissionConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [planId]: { ...getConfig(planId), ...patch },
    }));
  };

  const handleSave = async (planId: string) => {
    if (!currentTenant) return;
    setSaving(planId);
    try {
      const config = getConfig(planId);
      const { error } = await (supabase.from("subscription_commission_config" as any) as any)
        .upsert({
          tenant_id: currentTenant.id,
          plan_id: planId,
          commission_mode: config.commission_mode,
          fixed_amount_cents: config.commission_mode === "fixed_per_service" ? config.fixed_amount_cents : 0,
          pool_percent: config.commission_mode === "proportional_pool" ? config.pool_percent : 40,
        }, { onConflict: "tenant_id,plan_id" });

      if (error) throw error;
      toast.success("Configuração de comissão salva");
      loadData();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + (err.message || ""));
    } finally {
      setSaving(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        Nenhum plano de assinatura cadastrado. Crie planos primeiro.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {plans.map((plan) => {
        const config = getConfig(plan.id);
        const poolCents = Math.round(plan.price_cents * (config.pool_percent || 40) / 100);

        return (
          <Card key={plan.id} className={!plan.active ? "opacity-60" : ""}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  <span>{plan.name}</span>
                </div>
                <span className="text-xs font-normal text-muted-foreground">
                  {formatBRL(plan.price_cents)}/mês
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={config.commission_mode}
                onValueChange={(v) => updateConfig(plan.id, { commission_mode: v as any })}
                className="space-y-3"
              >
                <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="fixed_per_service" className="mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-medium">Valor fixo por atendimento</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cada barbeiro receberá este valor por atendimento de assinante
                    </p>
                    {config.commission_mode === "fixed_per_service" && (
                      <div className="pt-1">
                        <Label className="text-xs">Valor por atendimento (R$)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={(config.fixed_amount_cents / 100).toFixed(2)}
                          onChange={(e) => updateConfig(plan.id, {
                            fixed_amount_cents: Math.round(parseFloat(e.target.value || "0") * 100),
                          })}
                          className="mt-1 max-w-[180px]"
                          placeholder="15.00"
                        />
                      </div>
                    )}
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/30 transition-colors">
                  <RadioGroupItem value="proportional_pool" className="mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-violet-400" />
                      <span className="text-sm font-medium">Rateio proporcional (fichas)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O percentual do valor da assinatura será dividido proporcionalmente aos atendimentos
                    </p>
                    {config.commission_mode === "proportional_pool" && (
                      <div className="pt-1 space-y-2">
                        <div>
                          <Label className="text-xs">Percentual do pool (%)</Label>
                          <Input
                            type="number"
                            step="1"
                            min="0"
                            max="100"
                            value={config.pool_percent}
                            onChange={(e) => updateConfig(plan.id, {
                              pool_percent: parseFloat(e.target.value || "40"),
                            })}
                            className="mt-1 max-w-[120px]"
                            placeholder="40"
                          />
                        </div>
                        <div className="p-2 rounded bg-muted/40 border border-border">
                          <p className="text-xs text-muted-foreground">
                            Pool de comissão: <span className="font-semibold text-emerald-400">{formatBRL(poolCents)}</span>
                            {" "}por assinante/mês
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </label>
              </RadioGroup>

              <Button
                size="sm"
                onClick={() => handleSave(plan.id)}
                disabled={saving === plan.id}
                className="w-full sm:w-auto"
              >
                {saving === plan.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Save className="h-4 w-4 mr-1" />
                )}
                Salvar
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
