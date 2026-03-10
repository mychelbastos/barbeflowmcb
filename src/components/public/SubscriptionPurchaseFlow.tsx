import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Repeat, Loader2, ChevronLeft, Check, User, MapPin, CreditCard } from "lucide-react";
import { SubscriptionCardPayment } from "@/components/subscriptions/SubscriptionCardPayment";

interface SubscriptionPurchaseFlowProps {
  tenant: any;
  plans: any[];
}

function canonicalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
}

const formatPhoneInput = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCpfInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

const formatCepInput = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length > 5) return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  return digits;
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

type FlowStep = 'phone' | 'data' | 'address' | 'payment';

export function SubscriptionPurchaseFlow({ tenant, plans }: SubscriptionPurchaseFlowProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [formStep, setFormStep] = useState<FlowStep>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);

  // Address fields
  const [addressCep, setAddressCep] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [addressComplement, setAddressComplement] = useState('');
  const [addressNeighborhood, setAddressNeighborhood] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState(false);
  const numberInputRef = useRef<HTMLInputElement>(null);

  const handlePhoneLookup = async () => {
    const digits = phoneInput.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({ title: "Telefone inválido", description: "Digite um telefone com DDD.", variant: "destructive" });
      return;
    }
    setPhoneLoading(true);
    try {
      const canonical = canonicalPhone(phoneInput);
      setPhone(formatPhoneInput(phoneInput));
      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'lookup', phone: canonical, tenant_id: tenant.id },
      });
      if (!error && data?.found && data?.customer) {
        setName(data.customer.name || '');
        setEmail(data.customer.email || '');
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
      setFormStep('data');
    } catch (err) {
      console.error('Phone lookup error:', err);
      setFormStep('data');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResetPhone = () => {
    setPhoneInput(''); setPhone(''); setName(''); setEmail(''); setCpf('');
    setCustomerFound(false); setFormStep('phone');
    setAddressCep(''); setAddressStreet(''); setAddressNumber('');
    setAddressComplement(''); setAddressNeighborhood(''); setAddressCity(''); setAddressState('');
  };

  const handleBackToPlanList = () => {
    setSelectedPlan(null); setFormStep('phone'); handleResetPhone();
  };

  const validateDataStep = (): boolean => {
    if (!name.trim() || name.trim().split(' ').length < 2) {
      toast({ title: "Nome completo obrigatório", description: "Informe nome e sobrenome.", variant: "destructive" });
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return false;
    }
    if (!isValidCpf(cpf)) {
      toast({ title: "CPF inválido", variant: "destructive" });
      return false;
    }
    return true;
  };

  const validateAddressStep = (): boolean => {
    const cepDigits = addressCep.replace(/\D/g, '');
    if (cepDigits.length !== 8) {
      toast({ title: "CEP inválido", variant: "destructive" }); return false;
    }
    if (!addressStreet.trim()) {
      toast({ title: "Rua obrigatória", variant: "destructive" }); return false;
    }
    if (!addressNumber.trim()) {
      toast({ title: "Número obrigatório", variant: "destructive" }); return false;
    }
    if (!addressNeighborhood.trim()) {
      toast({ title: "Bairro obrigatório", variant: "destructive" }); return false;
    }
    if (!addressCity.trim()) {
      toast({ title: "Cidade obrigatória", variant: "destructive" }); return false;
    }
    if (!addressState.trim() || addressState.length !== 2) {
      toast({ title: "Estado obrigatório", variant: "destructive" }); return false;
    }
    return true;
  };

  const handleCepChange = async (value: string) => {
    setCepError(false);
    const digits = value.replace(/\D/g, '').slice(0, 8);
    setAddressCep(formatCepInput(value));
    if (digits.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setAddressStreet(data.logradouro || '');
          setAddressNeighborhood(data.bairro || '');
          setAddressCity(data.localidade || '');
          setAddressState(data.uf || '');
          setTimeout(() => numberInputRef.current?.focus(), 100);
        } else {
          setCepError(true);
        }
      } catch {
        setCepError(true);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const handlePaymentSuccess = (subscriptionId?: string) => {
    navigate(`/${tenant.slug}/subscription/callback?status=authorized&preapproval_id=${subscriptionId || ''}`);
  };

  // Stepper indicator
  const steps: { key: FlowStep; label: string; icon: any }[] = [
    { key: 'data', label: 'Dados', icon: User },
    { key: 'address', label: 'Endereço', icon: MapPin },
    { key: 'payment', label: 'Pagamento', icon: CreditCard },
  ];

  const currentStepIndex = steps.findIndex(s => s.key === formStep);

  if (selectedPlan) {
    return (
      <div className="space-y-4">
        {/* Plan summary */}
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

        {/* Stepper (only show after phone step) */}
        {formStep !== 'phone' && (
          <div className="flex items-center justify-center gap-2 px-4">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const isActive = s.key === formStep;
              const isDone = currentStepIndex > i;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 h-px ${isDone ? 'bg-primary' : 'bg-zinc-700'}`} />}
                  <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                    isActive ? 'bg-primary/10 text-primary' : isDone ? 'text-primary' : 'text-zinc-600'
                  }`}>
                    {isDone ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    <span className="hidden sm:inline">{s.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step: Phone */}
        {formStep === 'phone' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">WhatsApp *</label>
              <Input
                placeholder="(11) 99999-9999"
                value={phoneInput}
                onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneLookup(); }}
                className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl"
                maxLength={15} inputMode="tel"
              />
            </div>
            <Button onClick={handlePhoneLookup} disabled={phoneLoading || phoneInput.replace(/\D/g, '').length < 10}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
              {phoneLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</> : <><Repeat className="h-4 w-4 mr-2" /> Continuar para pagamento</>}
            </Button>
            <button onClick={handleBackToPlanList} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {/* Step: Personal Data */}
        {formStep === 'data' && (
          <div className="space-y-4">
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {customerFound ? (
                    <>
                      <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Check className="h-4 w-4 text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Olá, {name}!</p>
                        <p className="text-xs text-zinc-500">Seus dados foram encontrados</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-9 h-9 rounded-full bg-zinc-800 flex items-center justify-center">
                        <User className="h-4 w-4 text-zinc-500" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{phone}</p>
                        <p className="text-xs text-zinc-500">Preencha seus dados abaixo</p>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={handleResetPhone} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">Trocar</button>
              </div>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Nome completo *</label>
                <Input placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">E-mail *</label>
                <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">CPF *</label>
                <Input placeholder="000.000.000-00" value={cpf} onChange={(e) => setCpf(formatCpfInput(e.target.value))}
                  inputMode="numeric" maxLength={14}
                  className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
              </div>
            </div>
            <Button onClick={() => { if (validateDataStep()) setFormStep('address'); }}
              disabled={!name || !email || !cpf}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
              Continuar →
            </Button>
            <button onClick={handleBackToPlanList} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {/* Step: Address */}
        {formStep === 'address' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MapPin className="h-4 w-4" />
              <span>Endereço de cobrança</span>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">CEP *</label>
                <div className="relative">
                  <Input placeholder="00000-000" value={addressCep}
                    onChange={(e) => handleCepChange(e.target.value)}
                    inputMode="numeric" maxLength={9}
                    className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
                  {cepLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-zinc-500" />}
                </div>
                {cepError && <p className="text-xs text-red-400 mt-1">CEP não encontrado</p>}
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Rua *</label>
                <Input placeholder="Rua / Avenida" value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Número *</label>
                  <Input ref={numberInputRef} placeholder="Nº" value={addressNumber}
                    onChange={(e) => setAddressNumber(e.target.value)}
                    className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">Complemento</label>
                  <Input placeholder="Apto, Sala..." value={addressComplement}
                    onChange={(e) => setAddressComplement(e.target.value)}
                    className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-zinc-400 mb-1.5">Bairro *</label>
                <Input placeholder="Bairro" value={addressNeighborhood}
                  onChange={(e) => setAddressNeighborhood(e.target.value)}
                  className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-sm text-zinc-400 mb-1.5">Cidade *</label>
                  <Input placeholder="Cidade" value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1.5">UF *</label>
                  <Input placeholder="BA" value={addressState} maxLength={2}
                    onChange={(e) => setAddressState(e.target.value.toUpperCase())}
                    className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
                </div>
              </div>
            </div>
            <Button onClick={() => { if (validateAddressStep()) setFormStep('payment'); }}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
              Continuar →
            </Button>
            <button onClick={() => setFormStep('data')} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
              <ChevronLeft className="h-4 w-4" /> Voltar
            </button>
          </div>
        )}

        {/* Step: Payment */}
        {formStep === 'payment' && (
          <SubscriptionCardPayment
            tenantSlug={tenant.slug}
            tenantId={tenant.id}
            planId={selectedPlan.id}
            planName={selectedPlan.name}
            priceCents={selectedPlan.price_cents}
            customerName={name.trim()}
            customerPhone={phone}
            customerEmail={email.trim()}
            customerCpf={cpf.replace(/\D/g, '')}
            addressCep={addressCep.replace(/\D/g, '')}
            addressStreet={addressStreet}
            addressNumber={addressNumber}
            addressComplement={addressComplement}
            addressNeighborhood={addressNeighborhood}
            addressCity={addressCity}
            addressState={addressState}
            onSuccess={handlePaymentSuccess}
            onBack={() => setFormStep('address')}
          />
        )}
      </div>
    );
  }

  // Plan list
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
