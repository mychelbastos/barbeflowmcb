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
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <img src={logoBranca} alt="modoGESTOR" className="h-8 mx-auto" />
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-zinc-100">Bem-vindo ao modoGESTOR! 👋</h1>
            <p className="text-sm text-zinc-400">
              Escolha seu plano para começar o trial gratuito de 14 dias.<br />
              Você <strong className="text-zinc-300">NÃO</strong> será cobrado agora.
            </p>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex justify-center">
          <div className="inline-flex items-center rounded-xl bg-zinc-900 border border-zinc-800/50 p-1">
            <button
              onClick={() => setBillingInterval("month")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                !isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setBillingInterval("year")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                isYearly ? "bg-primary text-primary-foreground shadow-sm" : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Anual
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                2 meses grátis
              </Badge>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Essencial */}
          <Card className="border-zinc-800/50 bg-zinc-900/50">
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Essencial</CardTitle>
              <div className="mt-2">
                {isYearly ? (
                  <>
                    <span className="text-sm text-zinc-500 line-through">R$ 59,90/mês</span>{" "}
                    <span className="text-3xl font-bold text-zinc-100">R$ 47,90</span>
                    <span className="text-zinc-400 text-sm">/mês</span>
                    <p className="text-xs text-zinc-500 mt-1">Cobrado R$ 574,80/ano</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-zinc-100">R$ 59,90</span>
                    <span className="text-zinc-400 text-sm">/mês</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PLANS.essencial.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500">Taxa sobre transações: {PLANS.essencial.commission}</p>
              <Button
                onClick={() => handleSubscribe("essencial")}
                disabled={!!checkoutLoading}
                variant="outline"
                className="w-full border-zinc-700"
              >
                {checkoutLoading === `essencial-${billingInterval}` && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Escolher
              </Button>
            </CardContent>
          </Card>

          {/* Profissional */}
          <Card className="border-primary/30 bg-zinc-900/50 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <Badge className="bg-primary text-primary-foreground">
                <Star className="h-3 w-3 mr-1" />
                Recomendado
              </Badge>
            </div>
            <CardHeader>
              <CardTitle className="text-lg text-zinc-100">Profissional</CardTitle>
              <div className="mt-2">
                {isYearly ? (
                  <>
                    <span className="text-sm text-zinc-500 line-through">R$ 89,90/mês</span>{" "}
                    <span className="text-3xl font-bold text-zinc-100">R$ 71,90</span>
                    <span className="text-zinc-400 text-sm">/mês</span>
                    <p className="text-xs text-zinc-500 mt-1">Cobrado R$ 862,80/ano</p>
                  </>
                ) : (
                  <>
                    <span className="text-3xl font-bold text-zinc-100">R$ 89,90</span>
                    <span className="text-zinc-400 text-sm">/mês</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {PLANS.profissional.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-zinc-300">
                    <Check className="h-4 w-4 text-primary shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-zinc-500">Taxa sobre transações: {PLANS.profissional.commission}</p>
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

        <p className="text-center text-xs text-zinc-600">
          Após 14 dias, a cobrança é automática. Cancele quando quiser pelo painel.
        </p>
      </div>
    </div>
  );
}
