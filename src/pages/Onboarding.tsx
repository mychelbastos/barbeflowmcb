import { useState, useEffect } from "react";
import { usePageTitle } from "@/hooks/usePageTitle";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { PLANS } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Crown, Loader2, Star, Sparkles, Infinity } from "lucide-react";
import logoBranca from "@/assets/modoGESTOR_branca.png";
import { trackEvent } from "@/utils/metaTracking";
import { getFbp, getPersistedFbc } from "@/utils/metaTracking";

type PlanKey = "profissional" | "ilimitado";

interface PlanCardProps {
  planKey: PlanKey;
  plan: typeof PLANS[PlanKey];
  isYearly: boolean;
  checkoutLoading: string | null;
  onSubscribe: (plan: PlanKey) => void;
  recommended?: boolean;
  icon?: React.ReactNode;
  buttonVariant?: "default" | "outline";
  buttonLabel?: string;
}

function PlanCard({ planKey, plan, isYearly, checkoutLoading, onSubscribe, recommended, icon, buttonVariant = "outline", buttonLabel = "Escolher" }: PlanCardProps) {
  const monthlyPrice = plan.month.display.replace("/mês", "");
  const yearlyMonthlyPrice = plan.year.display.replace("/mês", "");
  const loadingKey = `${planKey}-${isYearly ? "year" : "month"}`;

  return (
    <Card className={`${recommended ? "border-primary/30 relative" : ""}`}>
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <Badge className="bg-primary text-primary-foreground">
            <Star className="h-3 w-3 mr-1" />
            Recomendado
          </Badge>
        </div>
      )}
      <CardHeader>
        <CardTitle className="text-lg">{plan.name}</CardTitle>
        <div className="mt-2">
          {isYearly ? (
            <>
              <span className="text-sm text-muted-foreground line-through">{monthlyPrice}/mês</span>{" "}
              <span className="text-3xl font-bold text-foreground">{yearlyMonthlyPrice}</span>
              <span className="text-muted-foreground text-sm">/mês</span>
              <p className="text-xs text-muted-foreground mt-1">Cobrado {plan.year.display_yearly}/ano</p>
            </>
          ) : (
            <>
              <span className="text-3xl font-bold text-foreground">{monthlyPrice}</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        {plan.exclusiveFeatures.length > 0 && (
          <>
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-px bg-primary/20" />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary/70">Exclusivo</span>
              <div className="flex-1 h-px bg-primary/20" />
            </div>
            <ul className="space-y-2">
              {plan.exclusiveFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="h-4 w-4 text-amber-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">Taxa sobre transações: {plan.commission}</p>
          <p className="text-[11px] text-muted-foreground/70 leading-tight">{plan.commissionNote}</p>
        </div>
        <p className="text-xs text-muted-foreground font-medium">{plan.staffLabel}</p>
        <Button
          onClick={() => onSubscribe(planKey)}
          disabled={!!checkoutLoading}
          variant={buttonVariant}
          className="w-full"
        >
          {checkoutLoading === loadingKey ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : icon ? (
            <span className="mr-2">{icon}</span>
          ) : null}
          {buttonLabel}
        </Button>
      </CardContent>
    </Card>
  );
}

export default function Onboarding() {
  usePageTitle("Bem-vindo");
  const { toast } = useToast();
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const saveMeta = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: ut } = await supabase.from('users_tenant').select('tenant_id').eq('user_id', user.id).limit(1);
      if (ut && ut.length > 0) {
        const fbp = getFbp();
        const fbc = getPersistedFbc();
        if (fbp || fbc) {
          await supabase.from('tenants').update({
            meta_fbp: fbp,
            meta_fbc: fbc,
          }).eq('id', ut[0].tenant_id);
        }
      }
    };
    saveMeta();
    trackEvent('ViewContent', {
      content_name: 'Onboarding Planos',
      content_category: 'pricing',
      content_ids: ['essencial', 'profissional', 'ilimitado'],
      content_type: 'product',
    }, {}, { pixelOnly: true });
  }, []);

  const handleSubscribe = async (plan: PlanKey) => {
    const key = `${plan}-${billingInterval}`;
    setCheckoutLoading(key);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { plan, billing_interval: billingInterval },
      });
      if (error) throw error;
      if (data?.url) {
        const { data: { user } } = await supabase.auth.getUser();
        await trackEvent('AddPaymentInfo', {
          content_category: 'subscription',
          content_name: plan,
          value: 50.00,
          currency: 'BRL',
        }, {
          email: user?.email || undefined,
        });
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const isYearly = billingInterval === "year";

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
          <PlanCard
            planKey="profissional"
            plan={PLANS.profissional}
            isYearly={isYearly}
            checkoutLoading={checkoutLoading}
            onSubscribe={handleSubscribe}
            buttonLabel="Começar grátis"
          />
          <PlanCard
            planKey="profissional"
            plan={PLANS.profissional}
            isYearly={isYearly}
            checkoutLoading={checkoutLoading}
            onSubscribe={handleSubscribe}
            recommended
            icon={<Crown className="h-4 w-4" />}
            buttonVariant="default"
            buttonLabel="Começar grátis"
          />
          <PlanCard
            planKey="ilimitado"
            plan={PLANS.ilimitado}
            isYearly={isYearly}
            checkoutLoading={checkoutLoading}
            onSubscribe={handleSubscribe}
            icon={<Infinity className="h-4 w-4" />}
            buttonVariant="default"
            buttonLabel="Começar grátis"
          />
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
