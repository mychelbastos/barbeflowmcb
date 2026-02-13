import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLANS } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Star, Sparkles } from "lucide-react";
import logoBranca from "@/assets/modoGESTOR_branca.png";

export default function Onboarding() {
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleSubscribe = async (plan: "essencial" | "profissional") => {
    const key = `${plan}-${billingInterval}`;
    setCheckoutLoading(key);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, billing_interval: billingInterval },
      });
      if (error) throw error;
      if (data?.url) window.location.href = data.url;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isYearly = billingInterval === "year";

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
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
          {/* Essencial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Essencial</CardTitle>
              <div className="mt-2">
                {isYearly ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">R$ 59,90/mês</span>{" "}
                    <span className="text-3xl font-bold text-foreground">R$ 47,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                    <p className="text-xs text-muted-foreground mt-1">Cobrado R$ 574,80/ano</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">R$ 59,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PLANS.essencial.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Taxa sobre transações: {PLANS.essencial.commission}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">{PLANS.essencial.commissionNote}</p>
              </div>
              <Button
                onClick={() => handleSubscribe("essencial")}
                disabled={!!checkoutLoading}
                variant="outline"
                className="w-full"
              >
                {checkoutLoading === `essencial-${billingInterval}` && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Escolher
              </Button>
            </CardContent>
          </Card>

          {/* Profissional */}
          <Card className="border-primary/30 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                Recomendado
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-lg">Profissional</CardTitle>
              <div className="mt-2">
                {isYearly ? (
                  <>
                    <span className="text-sm text-muted-foreground line-through">R$ 89,90/mês</span>{" "}
                    <span className="text-3xl font-bold text-foreground">R$ 71,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                    <p className="text-xs text-muted-foreground mt-1">Cobrado R$ 862,80/ano</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-foreground">R$ 89,90</span>
                    <span className="text-muted-foreground text-sm">/mês</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PLANS.profissional.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              {PLANS.profissional.exclusiveFeatures.length > 0 && (
                <>
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 h-px bg-primary/20" />
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Exclusivo do Profissional</span>
                    <div className="flex-1 h-px bg-primary/20" />
                  </div>
                  <ul className="space-y-2">
                    {PLANS.profissional.exclusiveFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Star className="h-4 w-4 text-amber-400 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </>
              )}
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">Taxa sobre transações: {PLANS.profissional.commission}</p>
                <p className="text-[11px] text-muted-foreground/70 leading-tight">{PLANS.profissional.commissionNote}</p>
              </div>
              <Button
                onClick={() => handleSubscribe("profissional")}
                disabled={!!checkoutLoading}
                className="w-full"
              >
                {checkoutLoading === `profissional-${billingInterval}` ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Crown className="h-4 w-4 mr-2" />
                )}
                Começar grátis
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xs text-muted-foreground font-medium">+R$ 24,90/mês por profissional adicional</p>
          <p className="text-xs text-muted-foreground/70">
            Após 14 dias, a cobrança é automática. Cancele quando quiser pelo painel.
          </p>
        </div>
      </div>
    </div>
  );
}
