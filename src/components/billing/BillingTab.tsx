import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSubscription, PLANS } from "@/hooks/useSubscription";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  Crown,
  ExternalLink,
  FileText,
  Loader2,
  AlertCircle,
  Star,
  CreditCard,
  RefreshCw,
} from "lucide-react";

export function BillingTab() {
  const { subscription, loading, hasActiveSubscription, isTrialing, isPastDue, needsSubscription, checkSubscription } = useSubscription();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Handle success/canceled query params
  useEffect(() => {
    if (searchParams.get("success") === "true") {
      toast({ title: "Assinatura iniciada!", description: "Seu trial de 14 dias começou." });
      checkSubscription();
      setSearchParams((prev) => { prev.delete("success"); return prev; });
    }
    if (searchParams.get("canceled") === "true") {
      toast({ title: "Checkout cancelado", description: "Você pode assinar quando quiser." });
      setSearchParams((prev) => { prev.delete("canceled"); return prev; });
    }
  }, [searchParams]);

  // Load invoices when subscription is active
  useEffect(() => {
    if (hasActiveSubscription || isPastDue) {
      loadInvoices();
    }
  }, [hasActiveSubscription, isPastDue]);

  const loadInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const { data } = await supabase
        .from("stripe_invoices")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setInvoices(data || []);
    } catch (err) {
      console.error("Error loading invoices:", err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  const handleSubscribe = async (priceId: string) => {
    setCheckoutLoading(priceId);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { price_id: priceId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Past due state
  if (isPastDue) {
    return (
      <Card className="border-red-500/30">
        <CardContent className="pt-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-400">Pagamento Pendente</h3>
              <p className="text-muted-foreground text-sm mt-1">
                Sua última cobrança falhou. Atualize seu método de pagamento para manter o acesso.
              </p>
              <Button onClick={handleManageSubscription} disabled={portalLoading} className="mt-4">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Atualizar pagamento
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Active/trialing state
  if (hasActiveSubscription && subscription) {
    const planKey = subscription.plan_name as keyof typeof PLANS;
    const plan = PLANS[planKey] || PLANS.essencial;
    const endDate = subscription.subscription_end
      ? new Date(subscription.subscription_end).toLocaleDateString("pt-BR")
      : "";
    const trialEndDate = subscription.trial_end
      ? new Date(subscription.trial_end).toLocaleDateString("pt-BR")
      : "";

    return (
      <div className="space-y-6">
        {/* Subscription status card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                isTrialing ? "bg-amber-500/10" : "bg-emerald-500/10"
              }`}>
                {isTrialing ? (
                  <Star className="h-6 w-6 text-amber-400" />
                ) : (
                  <Crown className="h-6 w-6 text-emerald-400" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">
                    Plano {plan.name}
                  </h3>
                  <Badge variant={isTrialing ? "secondary" : "default"} className={
                    isTrialing
                      ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  }>
                    {isTrialing ? "Trial" : "Ativo"}
                  </Badge>
                </div>
                {isTrialing ? (
                  <p className="text-muted-foreground text-sm mt-1">
                    Seu trial termina em {trialEndDate}. Após o trial, será cobrado R$ {(plan.price_monthly / 100).toFixed(2).replace(".", ",")}/mês.
                  </p>
                ) : (
                  <p className="text-muted-foreground text-sm mt-1">
                    Próxima cobrança: R$ {(plan.price_monthly / 100).toFixed(2).replace(".", ",")} em {endDate}
                  </p>
                )}
                {subscription.cancel_at_period_end && (
                  <p className="text-amber-400 text-sm mt-1">
                    ⚠️ Cancelamento programado para {endDate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button onClick={handleManageSubscription} disabled={portalLoading} variant="outline">
                {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                Gerenciar assinatura
              </Button>
              <Button onClick={checkSubscription} variant="ghost" size="icon" title="Atualizar status">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Invoices */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <FileText className="h-4 w-4 mr-2" />
              Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoicesLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : invoices.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-6">
                Nenhuma fatura ainda.
              </p>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="text-sm font-medium">
                        R$ {(inv.amount_due / 100).toFixed(2).replace(".", ",")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={inv.status === "paid" ? "default" : "secondary"} className={
                        inv.status === "paid"
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                          : ""
                      }>
                        {inv.status === "paid" ? "Paga" : inv.status === "open" ? "Pendente" : inv.status}
                      </Badge>
                      {inv.invoice_url && (
                        <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // No subscription - show plans
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-bold">Escolha seu plano</h2>
        <p className="text-muted-foreground text-sm mt-1">
          14 dias grátis • Cancele quando quiser
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Essencial */}
        <Card className="relative">
          <CardHeader>
            <CardTitle className="text-lg">Essencial</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">R$ 59,90</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PLANS.essencial.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Taxa sobre transações: {PLANS.essencial.commission}
            </p>
            <Button
              onClick={() => handleSubscribe(PLANS.essencial.price_id)}
              disabled={!!checkoutLoading}
              variant="outline"
              className="w-full"
            >
              {checkoutLoading === PLANS.essencial.price_id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Começar trial
            </Button>
          </CardContent>
        </Card>

        {/* Profissional */}
        <Card className="relative border-primary/30">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge className="bg-primary text-primary-foreground">
              <Star className="h-3 w-3 mr-1" />
              Recomendado
            </Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-lg">Profissional</CardTitle>
            <div className="mt-2">
              <span className="text-3xl font-bold">R$ 89,90</span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-2">
              {PLANS.profissional.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground">
              Taxa sobre transações: {PLANS.profissional.commission}
            </p>
            <Button
              onClick={() => handleSubscribe(PLANS.profissional.price_id)}
              disabled={!!checkoutLoading}
              className="w-full"
            >
              {checkoutLoading === PLANS.profissional.price_id ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Crown className="h-4 w-4 mr-2" />
              )}
              Começar trial grátis
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
