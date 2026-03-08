import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLANS } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Check, Loader2, Star, Infinity, Trophy, UserPlus } from "lucide-react";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { trackViewContent, trackInitiateCheckout } from "@/lib/tracking";

type PlanKey = "profissional" | "ilimitado";

const ADDON_LOYALTY_PRICE = 1990; // R$ 19,90
const ADDON_EXTRA_PRO_PRICE = 1490; // R$ 14,90

export default function Onboarding() {
  usePageTitle("Bem-vindo");
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("ilimitado");
  const [addLoyalty, setAddLoyalty] = useState(false);
  const [addExtraPro, setAddExtraPro] = useState(false);

  useEffect(() => {
    trackViewContent('Onboarding Planos');
  }, []);

  // Reset addons when switching to ilimitado
  useEffect(() => {
    if (selectedPlan === "ilimitado") {
      setAddLoyalty(false);
      setAddExtraPro(false);
    }
  }, [selectedPlan]);

  const handleSubscribe = async () => {
    const key = `${selectedPlan}-${billingInterval}`;
    setCheckoutLoading(key);
    try {
      // Save addon preferences to tenant settings
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: ut } = await supabase.from('users_tenant').select('tenant_id').eq('user_id', user.id).limit(1);
        if (ut && ut.length > 0) {
          const { data: tenant } = await supabase.from('tenants').select('settings').eq('id', ut[0].tenant_id).single();
          await supabase.from('tenants').update({
            settings: {
              ...(tenant?.settings as any || {}),
              addon_loyalty_requested: selectedPlan === 'profissional' && addLoyalty,
              addon_extra_pro_requested: selectedPlan === 'profissional' && addExtraPro,
            }
          }).eq('id', ut[0].tenant_id);
        }
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan: selectedPlan, billing_interval: billingInterval },
      });
      if (error) throw error;
      if (data?.url) {
        trackInitiateCheckout(selectedPlan, totalMonthly / 100, { email: user?.email || undefined });
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isYearly = billingInterval === "year";
  const plan = PLANS[selectedPlan];
  const basePriceMonthly = isYearly ? plan.year.price_monthly : plan.month.price_monthly;
  const addonsTotal = selectedPlan === 'profissional'
    ? (addLoyalty ? ADDON_LOYALTY_PRICE : 0) + (addExtraPro ? ADDON_EXTRA_PRO_PRICE : 0)
    : 0;
  const totalMonthly = basePriceMonthly + addonsTotal;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={logoBranca} alt="modoGESTOR" className="h-8 mx-auto dark:block hidden" />
          <img src={logoBranca} alt="modoGESTOR" className="h-8 mx-auto dark:hidden block invert" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-foreground">Bem-vindo ao modoGESTOR! 👋</h1>
            <p className="text-sm text-muted-foreground">
              Escolha seu plano para começar o trial gratuito de 14 dias.<br />
              Você <strong className="text-foreground">NÃO</strong> será cobrado agora.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl bg-muted border border-border p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Anual
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/30 text-[10px]">
                2 meses grátis
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(["profissional", "ilimitado"] as PlanKey[]).map((planKey) => {
            const p = PLANS[planKey];
            const isSelected = selectedPlan === planKey;
            const isRecommended = planKey === "ilimitado";
            const monthlyPrice = p.month.price_monthly;
            const yearlyMonthlyPrice = p.year.price_monthly;

            return (
              <Card
                key={planKey}
                onClick={() => setSelectedPlan(planKey)}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-muted-foreground/30"
                } ${isRecommended ? "relative" : ""}`}
              >
                {isRecommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      <Star className="h-3 w-3 mr-1" />
                      Recomendado
                    </Badge>
                  </div>
                )}
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? "border-primary" : "border-muted-foreground/40"
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                  </div>
                  <div className="mt-2">
                    {isYearly ? (
                      <>
                        <span className="text-sm text-muted-foreground line-through">
                          {(monthlyPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>{" "}
                        <span className="text-3xl font-bold text-foreground">
                          {(yearlyMonthlyPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className="text-muted-foreground text-sm">/mês</span>
                        <p className="text-xs text-muted-foreground mt-1">Cobrado {p.year.display_yearly}/ano</p>
                      </>
                    ) : (
                      <>
                        <span className="text-3xl font-bold text-foreground">
                          {(monthlyPrice / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                        <span className="text-muted-foreground text-sm">/mês</span>
                      </>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Check className="h-4 w-4 text-primary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  {p.exclusiveFeatures.length > 0 && (
                    <>
                      <div className="flex items-center gap-2 pt-1">
                        <div className="flex-1 h-px bg-primary/20" />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Exclusivo</span>
                        <div className="flex-1 h-px bg-primary/20" />
                      </div>
                      <ul className="space-y-2">
                        {p.exclusiveFeatures.map((f) => (
                          <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Star className="h-4 w-4 text-amber-400 shrink-0" />
                            {f}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <div className="space-y-0.5">
                    <p className="text-xs text-muted-foreground">Taxa sobre transações: {p.commission}</p>
                    <p className="text-[11px] text-muted-foreground/70 leading-tight">{p.commissionNote}</p>
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">{p.staffLabel}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Order Bumps — only for Profissional */}
        {selectedPlan === "profissional" && (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Turbine seu plano</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <Card
              className={`cursor-pointer transition-all ${addLoyalty ? "border-primary/40 bg-primary/5" : ""}`}
              onClick={() => setAddLoyalty(!addLoyalty)}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <Checkbox checked={addLoyalty} onCheckedChange={(c) => setAddLoyalty(!!c)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-500" />
                      <span className="font-medium text-sm text-foreground">Cartão Fidelidade Digital</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">+R$ 19,90/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fidelize clientes automaticamente. A cada N atendimentos, recompensa automática.
                  </p>
                  <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Incluso grátis no plano Ilimitado
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all ${addExtraPro ? "border-primary/40 bg-primary/5" : ""}`}
              onClick={() => setAddExtraPro(!addExtraPro)}
            >
              <CardContent className="flex items-start gap-3 py-4">
                <Checkbox checked={addExtraPro} onCheckedChange={(c) => setAddExtraPro(!!c)} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <UserPlus className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm text-foreground">Profissional Extra</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground whitespace-nowrap">+R$ 14,90/mês</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Adicione mais um profissional à sua equipe.
                  </p>
                  <p className="text-[11px] text-primary mt-1 flex items-center gap-1">
                    <Star className="h-3 w-3" /> Ilimitados grátis no plano Ilimitado
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Order Summary */}
        <Card className="bg-muted/50">
          <CardContent className="py-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Resumo do seu plano</p>
            <div className="flex justify-between text-sm">
              <span className="text-foreground">{plan.name}</span>
              <span className="text-foreground">
                {(basePriceMonthly / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
              </span>
            </div>
            {selectedPlan === "profissional" && addLoyalty && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ Cartão Fidelidade</span>
                <span className="text-muted-foreground">R$ 19,90/mês</span>
              </div>
            )}
            {selectedPlan === "profissional" && addExtraPro && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">+ Profissional Extra</span>
                <span className="text-muted-foreground">R$ 14,90/mês</span>
              </div>
            )}
            {addonsTotal > 0 && (
              <>
                <div className="h-px bg-border my-1" />
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Total</span>
                  <span className="text-foreground">
                    {(totalMonthly / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}/mês
                  </span>
                </div>
              </>
            )}
            <p className="text-[11px] text-muted-foreground/70 pt-1">
              14 dias grátis · Cancele quando quiser
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center">
          <Button
            size="lg"
            onClick={handleSubscribe}
            disabled={!!checkoutLoading}
            className="w-full max-w-sm"
          >
            {checkoutLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : selectedPlan === "ilimitado" ? (
              <Infinity className="h-4 w-4 mr-2" />
            ) : null}
            Começar grátis →
          </Button>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground/70">
            Após 14 dias, a cobrança é automática. Cancele quando quiser pelo painel.
          </p>
        </div>
      </div>
    </div>
  );
}
