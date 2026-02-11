import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Loader2, ChevronLeft, Repeat } from "lucide-react";

interface PublicSubscriptionPlansProps {
  tenant: any;
  plans: any[];
  onBack?: () => void;
}

export function PublicSubscriptionPlans({ tenant, plans, onBack }: PublicSubscriptionPlansProps) {
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

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

  const handleSubscribe = async () => {
    if (!selectedPlan || !phone || !email || !name) return;

    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }

    if (!email.includes('@')) {
      toast({ title: "Email obrigatório para assinaturas", description: "O Mercado Pago exige um email válido.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      // Find or create customer
      const { data: customers } = await supabase
        .from('customers')
        .select('id, phone, name')
        .eq('tenant_id', tenant.id);

      let customerId: string;
      const canonicalize = (p: string) => {
        let d = p.replace(/\D/g, '');
        if (d.startsWith('55') && d.length >= 12) d = d.slice(2);
        if (d.length === 10) d = d.slice(0, 2) + '9' + d.slice(2);
        return d;
      };
      const canonicalDigits = canonicalize(digits);
      const matched = customers?.find(c => canonicalize(c.phone) === canonicalDigits);

      if (matched) {
        customerId = matched.id;
        // Update email if needed
        await supabase.from('customers').update({ email }).eq('id', customerId);
      } else {
        const { data: newCust, error: custErr } = await supabase
          .from('customers')
          .insert({ tenant_id: tenant.id, name: name.trim(), phone: digits, email })
          .select('id')
          .single();
        if (custErr || !newCust) throw new Error('Erro ao criar cliente');
        customerId = newCust.id;
      }

      // Create subscription record
      const { data: sub, error: subErr } = await supabase
        .from('customer_subscriptions')
        .insert({
          tenant_id: tenant.id,
          customer_id: customerId,
          plan_id: selectedPlan.id,
          status: 'pending',
        })
        .select()
        .single();

      if (subErr || !sub) throw new Error('Erro ao criar assinatura');

      // Call edge function to create MP preapproval
      const { data: mpResult, error: mpErr } = await supabase.functions.invoke('mp-create-subscription', {
        body: { subscription_id: sub.id },
      });

      if (mpErr) throw mpErr;

      if (mpResult?.checkout_url) {
        // Redirect to MP authorization page
        window.location.href = mpResult.checkout_url;
      } else {
        throw new Error('URL de checkout não gerada');
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      toast({ title: "Erro ao assinar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Plan selection form
  if (selectedPlan) {
    return (
      <div className="animate-in fade-in duration-300">
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2">Assinar plano</h2>
          <p className="text-zinc-500 text-sm">{selectedPlan.name} — R$ {(selectedPlan.price_cents / 100).toFixed(2)}/mês</p>
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
            <div>
              <label className="block text-sm text-zinc-400 mb-2">E-mail * <span className="text-zinc-600">(obrigatório para assinaturas)</span></label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
              />
            </div>
          )}

          <div className="pt-4 space-y-3">
            <Button
              onClick={handleSubscribe}
              disabled={submitting || !name || !phone || !email}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Assinar por R$ {(selectedPlan.price_cents / 100).toFixed(2)}/mês
                </>
              )}
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
    <div className="space-y-3">
      {plans.length === 0 ? (
        <div className="text-center py-12 text-zinc-500">
          <Repeat className="h-8 w-8 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Nenhum plano de assinatura disponível</p>
        </div>
      ) : (
        plans.map((plan) => (
          <button
            key={plan.id}
            onClick={() => setSelectedPlan(plan)}
            className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium group-hover:text-white transition-colors">{plan.name}</h3>
                {plan.description && (
                  <p className="text-zinc-500 text-sm line-clamp-2 mt-1">{plan.description}</p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-semibold text-emerald-400">
                  R$ {(plan.price_cents / 100).toFixed(2)}
                </span>
                <span className="text-zinc-500 text-sm">/mês</span>
              </div>
            </div>

            {plan.plan_services?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {plan.plan_services.map((ps: any) => (
                  <Badge key={ps.id} variant="secondary" className="text-xs bg-zinc-800 text-zinc-300 border-zinc-700">
                    {ps.service?.name || 'Serviço'}
                    {ps.sessions_per_cycle != null ? ` (${ps.sessions_per_cycle}x)` : ' (∞)'}
                  </Badge>
                ))}
              </div>
            )}
          </button>
        ))
      )}
    </div>
  );
}
