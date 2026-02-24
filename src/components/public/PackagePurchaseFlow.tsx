import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, Check, Loader2, ChevronLeft, Calendar, User, Search, Phone } from "lucide-react";
import { MercadoPagoCheckout } from "@/components/MercadoPagoCheckout";

interface PackagePurchaseFlowProps {
  tenant: any;
  pkg: any;
  onSuccess: (customerPackageId?: string) => void;
  onCancel: () => void;
  onScheduleNow: (customerPackageId?: string) => void;
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

export function PackagePurchaseFlow({ tenant, pkg, onSuccess, onCancel, onScheduleNow }: PackagePurchaseFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'data' | 'success'>('phone');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [customerFound, setCustomerFound] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [customerPackageId, setCustomerPackageId] = useState<string | null>(null);
  const [paymentRecordId, setPaymentRecordId] = useState<string | null>(null);

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
      setStep('data');
    } catch (err) {
      console.error('Phone lookup error:', err);
      setStep('data');
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleResetPhone = () => {
    setPhoneInput('');
    setPhone('');
    setName('');
    setEmail('');
    setCpf('');
    setCustomerFound(false);
    setStep('phone');
  };

  const handlePurchase = async () => {
    if (!name || !phone || !email || !cpf) {
      toast({ title: "Preencha todos os campos obrigatórios", variant: "destructive" });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      toast({ title: "E-mail inválido", description: "Verifique o e-mail digitado.", variant: "destructive" });
      return;
    }
    if (!isValidCpf(cpf)) {
      toast({ title: "CPF inválido", description: "Verifique o CPF digitado.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('mp-create-package-checkout', {
        body: {
          tenant_id: tenant.id,
          package_id: pkg.id,
          customer_name: name.trim(),
          customer_phone: phone,
          customer_email: email.trim(),
          customer_cpf: cpf.replace(/\D/g, ''),
        },
      });

      if (error) throw new Error(data?.error || error.message);
      if (data?.error) throw new Error(data.error);

      // Save IDs and show inline checkout
      setCustomerPackageId(data.customer_package_id);
      setPaymentRecordId(data.payment_id);
      setShowPayment(true);
    } catch (err: any) {
      console.error('Package purchase error:', err);
      toast({ title: "Erro ao processar", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="text-center py-6 space-y-4">
        <div className="w-16 h-16 bg-primary/10 border border-primary/30 rounded-full flex items-center justify-center mx-auto">
          <Check className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold">Pacote adquirido!</h3>
        <p className="text-sm text-zinc-400">Você tem {pkg.total_sessions || 0} sessões disponíveis.</p>
        <div className="space-y-2 pt-2">
          <Button onClick={() => onScheduleNow(customerPackageId ?? undefined)} className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl">
            <Calendar className="h-4 w-4 mr-2" /> Agendar agora
          </Button>
          <Button variant="outline" onClick={() => onSuccess(customerPackageId ?? undefined)} className="w-full border-zinc-700 text-zinc-400 rounded-xl">
            Agendar depois
          </Button>
        </div>
      </div>
    );
  }

  // Inline payment view
  if (showPayment && customerPackageId && paymentRecordId) {
    return (
      <div className="space-y-4">
        {/* Package summary */}
        <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-emerald-400" />
              <span className="font-medium">{pkg.name}</span>
            </div>
            <span className="text-lg font-semibold text-emerald-400">
              R$ {(pkg.price_cents / 100).toFixed(2)}
            </span>
          </div>
        </div>

        <MercadoPagoCheckout
          tenantSlug={tenant.slug}
          amount={pkg.price_cents / 100}
          serviceName={pkg.name}
          customerPackageId={customerPackageId}
          paymentId={paymentRecordId}
          payer={{
            email: email.trim(),
            identification: {
              type: 'CPF',
              number: cpf.replace(/\D/g, ''),
            },
          }}
          onSuccess={() => setStep('success')}
          onError={(err) => {
            toast({ title: "Erro no pagamento", description: err, variant: "destructive" });
            setShowPayment(false);
          }}
          onPending={() => {
            toast({ title: "Pagamento em processamento" });
          }}
        />

        <button
          onClick={() => setShowPayment(false)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm"
        >
          <ChevronLeft className="h-4 w-4" /> Voltar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero do pacote */}
      {pkg.photo_url && (
        <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden">
          <img src={pkg.photo_url} alt={pkg.name} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">{pkg.name}</h2>
            </div>
            <span className="text-2xl font-bold text-emerald-400">R$ {(pkg.price_cents / 100).toFixed(0)}</span>
          </div>
        </div>
      )}

      {/* Fallback sem imagem */}
      {!pkg.photo_url && (
        <div className="text-center py-4">
          <Package className="h-6 w-6 text-emerald-400 mx-auto mb-2" />
          <h2 className="text-xl font-bold mb-1">{pkg.name}</h2>
          <span className="text-2xl font-bold text-emerald-400">R$ {(pkg.price_cents / 100).toFixed(0)}</span>
        </div>
      )}

      {/* Serviços incluídos */}
      {(pkg.package_services || []).length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-zinc-300">O que está incluído</h3>
          <div className="space-y-2">
            {(pkg.package_services || []).map((ps: any) => (
              <div key={ps.service_id} className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium">{ps.service?.name || 'Serviço'}</span>
                  <span className="text-xs text-zinc-500 ml-2">
                    {ps.sessions_count} {ps.sessions_count === 1 ? 'sessão' : 'sessões'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Total de sessões */}
      <div className="flex items-center gap-2 text-zinc-400 text-xs">
        <Package className="h-3.5 w-3.5 text-emerald-400" />
        <span>{(pkg.package_services || []).reduce((sum: number, ps: any) => sum + (ps.sessions_count || 0), 0)} sessões no total</span>
      </div>

      {/* Separador */}
      <div className="border-t border-zinc-800" />

      {/* Título do formulário */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">Dados para aquisição</h3>
        <p className="text-zinc-500 text-xs mt-1">Preencha seus dados para adquirir o pacote</p>
      </div>

      {/* Etapa 1: Identificação por telefone */}
      {step === 'phone' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-zinc-400 mb-1.5">WhatsApp *</label>
            <Input
              placeholder="(11) 99999-9999"
              value={phoneInput}
              onChange={(e) => setPhoneInput(formatPhoneInput(e.target.value))}
              onKeyDown={(e) => { if (e.key === 'Enter') handlePhoneLookup(); }}
              className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl"
              maxLength={15}
              inputMode="tel"
            />
          </div>
          <Button
            onClick={handlePhoneLookup}
            disabled={phoneLoading || phoneInput.replace(/\D/g, '').length < 10}
            className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium"
          >
            {phoneLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Buscando...</> : <><Package className="h-4 w-4 mr-2" /> Continuar para pagamento</>}
          </Button>
        </div>
      )}

      {/* Etapa 2: Formulário de dados */}
      {step === 'data' && (
        <div className="space-y-4">
          {/* Identificação */}
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
              <button onClick={handleResetPhone} className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
                Trocar
              </button>
            </div>
          </div>

          {/* Campos */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm text-zinc-400 mb-1.5">Nome *</label>
              <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)}
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

          <Button onClick={handlePurchase} disabled={submitting || !name || !phone || !email || !cpf}
            className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : <><Package className="h-4 w-4 mr-2" /> Comprar pacote</>}
          </Button>
          <button onClick={onCancel} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      )}
    </div>
  );
}
