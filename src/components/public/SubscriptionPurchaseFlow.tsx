import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Repeat, Loader2, ChevronLeft, ExternalLink } from "lucide-react";

interface SubscriptionPurchaseFlowProps {
  tenant: any;
  plans: any[];
}

export function SubscriptionPurchaseFlow({ tenant, plans }: SubscriptionPurchaseFlowProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const handleSubscribe = async () => {
    if (!selectedPlan || !name || !phone || !email) {
      toast({ title: "Preencha todos os campos, incluindo e-mail", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "E-mail inválido", description: "Verifique o e-mail digitado e tente novamente.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mp-create-subscription', {
        body: {
          tenant_id: tenant.id, plan_id: selectedPlan.id,
          customer_name: name.trim(), customer_phone: phone, customer_email: email.trim(),
        },
      });
      if (error) { const errorMessage = data?.error || error.message || 'Erro ao criar assinatura'; throw new Error(errorMessage); }
      if (data?.error) throw new Error(data.error);
      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else if (data?.activated) {
        navigate(`/${tenant.slug}/subscription/callback?status=authorized&preapproval_id=${data.mp_preapproval_id || ''}`);
      } else {
        toast({ title: "Assinatura criada!", description: "Aguardando confirmação de pagamento." });
        setSelectedPlan(null);
      }
    } catch (err: any) {
      console.error('Subscription error:', err);
      toast({ title: "Erro ao criar assinatura", description: err.message, variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  if (selectedPlan) {
    return (
      <div className="space-y-4">
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-primary" />
              <span className="font-medium">{selectedPlan.name}</span>
            </div>
            <span className="text-lg font-semibold text-primary">
              R$ {(selectedPlan.price_cents / 100).toFixed(0)}/mês
            </span>
          </div>
          {selectedPlan.description && <p className="text-xs text-zinc-400 mb-3">{selectedPlan.description}</p>}
          <div className="space-y-1">
            {(selectedPlan.plan_services || []).map((ps: any) => (
              <div key={ps.service_id} className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/50" />
                <span className="truncate">{ps.service?.name}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {ps.sessions_per_cycle === null ? '∞' : `${ps.sessions_per_cycle}x/mês`}
                </Badge>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Nome *</label>
            <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)}
              className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">Telefone *</label>
            <Input placeholder="(00) 00000-0000" value={phone} onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
          </div>
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">E-mail * (obrigatório para assinatura)</label>
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
              className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
          </div>
        </div>

        <Button onClick={handleSubscribe} disabled={submitting || !name || !phone || !email}
          className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : <><ExternalLink className="h-4 w-4 mr-2" /> Assinar agora</>}
        </Button>
        <button onClick={() => setSelectedPlan(null)} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {plans.length === 0 ? (
        <div className="text-center py-8">
          <Repeat className="h-8 w-8 mx-auto text-zinc-600 mb-3" />
          <p className="text-sm text-zinc-400">Nenhum plano disponível no momento.</p>
        </div>
      ) : plans.map((plan: any) => (
        <button key={plan.id} onClick={() => setSelectedPlan(plan)}
          className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Repeat className="h-4 w-4 text-primary shrink-0" />
                <h3 className="font-medium group-hover:text-white transition-colors">{plan.name}</h3>
              </div>
              {plan.description && <p className="text-xs text-zinc-500 mb-2">{plan.description}</p>}
              <div className="space-y-1">
                {(plan.plan_services || []).map((ps: any) => (
                  <div key={ps.service_id} className="flex items-center gap-2 text-sm text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                    <span className="truncate">{ps.service?.name}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">
                      {ps.sessions_per_cycle === null ? '∞' : `${ps.sessions_per_cycle}x/mês`}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-lg font-semibold text-primary">R$ {(plan.price_cents / 100).toFixed(0)}</span>
              <span className="text-xs text-zinc-500 block">/mês</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
