import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, ChevronLeft, Repeat, XCircle } from "lucide-react";
import { SubscriptionCardPayment, type SubscriptionCardPaymentProps } from "./SubscriptionCardPayment";

interface PublicSubscriptionPlansProps {
  tenant: any;
  plans: any[];
  onBack?: () => void;
  initialPlanId?: string | null;
}

export function PublicSubscriptionPlans({ tenant, plans, onBack, initialPlanId }: PublicSubscriptionPlansProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [cpf, setCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showCardPayment, setShowCardPayment] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  useEffect(() => {
    if (initialPlanId && plans.length > 0 && !selectedPlan) {
      const plan = plans.find(p => p.id === initialPlanId);
      if (plan) setSelectedPlan(plan);
    }
  }, [initialPlanId, plans]);

  const formatCpfInput = (value: string): string => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const isValidCpf = (value: string): boolean => {
    const digits = value.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
    let rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    if (rest !== parseInt(digits[9])) return false;
    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10) rest = 0;
    return rest === parseInt(digits[10]);
  };

  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const lookupCustomer = async (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, '');
    if (digits.length < 10 || !tenant) return;

    setLookingUp(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'lookup', phone: digits, tenant_id: tenant.id },
      });
      if (!error && data?.found && data.customer) {
        setName(data.customer.name);
        setEmail(data.customer.email || '');
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch {
      setCustomerFound(false);
    } finally {
      setLookingUp(false);
    }
  };

  const handleProceedToPayment = () => {
    if (!selectedPlan || !phone || !email || !name || !cpf) return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }

    if (!email.includes('@')) {
      toast({ title: "Email obrigatório para assinaturas", description: "O Mercado Pago exige um email válido.", variant: "destructive" });
      return;
    }

    if (!isValidCpf(cpf)) {
      toast({ title: "CPF inválido", description: "Verifique o CPF digitado.", variant: "destructive" });
      return;
    }

    setShowCardPayment(true);
  };

  // Card payment step
  if (showCardPayment && selectedPlan) {
    return (
      <div className="animate-in fade-in duration-300">
        <SubscriptionCardPayment
          tenantSlug={tenant.slug}
          tenantId={tenant.id}
          planId={selectedPlan.id}
          planName={selectedPlan.name}
          priceCents={selectedPlan.price_cents}
          customerName={name.trim()}
          customerPhone={phone.replace(/\D/g, '')}
          customerEmail={email.trim()}
          customerCpf={cpf.replace(/\D/g, '')}
          onSuccess={() => {
            setShowCardPayment(false);
            setSelectedPlan(null);
            setPhone('');
            setEmail('');
            setName('');
            setCpf('');
            toast({ title: "Assinatura ativada!", description: "Sua assinatura está ativa." });
          }}
          onBack={() => setShowCardPayment(false)}
        />
      </div>
    );
  }

  // Plan selection form
  if (selectedPlan) {
    return (
      <div className="space-y-6">
        {/* Hero do plano */}
        {selectedPlan.photo_url && (
          <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
            <img 
              src={selectedPlan.photo_url} 
              alt={selectedPlan.name} 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4">
              <h2 className="text-xl font-bold text-white mb-1">{selectedPlan.name}</h2>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-primary">
                  R$ {(selectedPlan.price_cents / 100).toFixed(2)}
                </span>
                <span className="text-muted-foreground text-sm">/mês</span>
              </div>
            </div>
          </div>
        )}

        {!selectedPlan.photo_url && (
          <div className="text-center py-4">
            <h2 className="text-xl font-bold mb-1">{selectedPlan.name}</h2>
            <div className="flex items-baseline gap-1 justify-center">
              <span className="text-2xl font-bold text-primary">
                R$ {(selectedPlan.price_cents / 100).toFixed(2)}
              </span>
              <span className="text-muted-foreground text-sm">/mês</span>
            </div>
          </div>
        )}

        {selectedPlan.description && (
          <p className="text-muted-foreground text-sm leading-relaxed px-1">
            {selectedPlan.description}
          </p>
        )}

        {selectedPlan.plan_services?.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-300">Serviços incluídos</h3>
            <div className="space-y-2">
              {selectedPlan.plan_services.map((ps: any) => (
                <div key={ps.id} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Check className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{ps.service?.name || 'Serviço'}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {ps.sessions_per_cycle != null ? `${ps.sessions_per_cycle}x por mês` : 'Ilimitado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Repeat className="h-3.5 w-3.5 text-primary" />
            <span>Renovação automática mensal</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <CreditCard className="h-3.5 w-3.5 text-primary" />
            <span>Pagamento seguro via cartão de crédito</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <XCircle className="h-3.5 w-3.5 text-primary" />
            <span>Cancele a qualquer momento</span>
          </div>
        </div>

        <div className="border-t border-zinc-800" />

        <div className="text-center">
          <h3 className="text-lg font-semibold">Dados para assinatura</h3>
          <p className="text-muted-foreground text-xs mt-1">Preencha seus dados para ativar o plano</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">WhatsApp *</label>
            <div className="relative">
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => {
                  const formatted = formatPhoneInput(e.target.value);
                  setPhone(formatted);
                  setCustomerFound(false);
                  setName('');
                  setEmail('');
                  const digits = formatted.replace(/\D/g, '');
                  if (digits.length >= 10) lookupCustomer(formatted);
                }}
                maxLength={15}
                className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
              />
              {lookingUp && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                </div>
              )}
            </div>
          </div>

          {customerFound && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm font-medium text-emerald-400">Bem-vindo de volta, {name}!</span>
              </div>
            </div>
          )}

          {!customerFound && phone.replace(/\D/g, '').length >= 10 && !lookingUp && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome completo *</label>
                <Input
                  placeholder="Seu nome"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
            </div>
          )}

          {(customerFound || phone.replace(/\D/g, '').length >= 10) && (
            <>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">E-mail *</label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-2">CPF *</label>
                <Input
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  inputMode="numeric"
                  maxLength={14}
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
            </>
          )}

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleProceedToPayment}
              disabled={!name || !phone || !email || !cpf}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium disabled:opacity-50"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Continuar para pagamento
            </Button>

            <button
              onClick={() => setSelectedPlan(null)}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar aos planos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Plan cards list
  return (
    <div className="space-y-4">
      {plans.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Repeat className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum plano de assinatura disponível</p>
        </div>
      ) : (
        plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className="w-full bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 rounded-2xl text-left transition-all duration-300 hover:bg-zinc-900 group overflow-hidden"
          >
            {plan.photo_url && (
              <div className="relative w-full aspect-[2/1] overflow-hidden">
                <img
                  src={plan.photo_url}
                  alt={plan.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg">
                  <span className="text-lg font-bold text-primary">
                    R$ {(plan.price_cents / 100).toFixed(2)}
                  </span>
                  <span className="text-muted-foreground text-xs">/mês</span>
                </div>
              </div>
            )}

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-base group-hover:text-white transition-colors leading-tight">
                  {plan.name}
                </h3>
                {!plan.photo_url && (
                  <div className="text-right shrink-0">
                    <span className="text-lg font-bold text-primary">
                      R$ {(plan.price_cents / 100).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground text-xs">/mês</span>
                  </div>
                )}
              </div>

              {plan.description && (
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                  {plan.description}
                </p>
              )}

              {plan.plan_services?.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  {plan.plan_services.map((ps: any) => (
                    <div key={ps.id} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-sm text-zinc-300">
                        {ps.service?.name || 'Serviço'}
                        {ps.sessions_per_cycle != null
                          ? <span className="text-muted-foreground"> · {ps.sessions_per_cycle}x por mês</span>
                          : <span className="text-muted-foreground"> · Uso ilimitado</span>
                        }
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-2">
                <div className="w-full py-2.5 rounded-xl bg-white/5 border border-zinc-700 group-hover:bg-primary group-hover:border-primary group-hover:text-zinc-900 text-center text-sm font-medium transition-all duration-300">
                  Assinar plano
                </div>
              </div>
            </div>
          </button>
        ))
      )}
    </div>
  );
}
