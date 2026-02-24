import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Package, Check, Loader2, ChevronLeft, Calendar, ArrowRight } from "lucide-react";

interface PackagePurchaseFlowProps {
  tenant: any;
  pkg: any;
  onSuccess: () => void;
  onCancel: () => void;
  onScheduleNow: () => void;
}

function canonicalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
}

export function PackagePurchaseFlow({ tenant, pkg, onSuccess, onCancel, onScheduleNow }: PackagePurchaseFlowProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'data' | 'success'>('data');
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

  const handlePurchase = async () => {
    if (!name || !phone) {
      toast({ title: "Preencha nome e telefone", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const canonical = canonicalPhone(phone);
      const { data: custResult, error: custErr } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'find-or-create', phone: canonical, tenant_id: tenant.id, name: name.trim(), email: email || null },
      });
      if (custErr || !custResult?.customer_id) throw new Error('Erro ao identificar cliente');
      const customerId = custResult.customer_id;
      const { data: pkgSvcs } = await supabase
        .from('package_services').select('service_id, sessions_count').eq('package_id', pkg.id);
      const totalSessions = (pkgSvcs || []).reduce((sum: number, s: any) => sum + s.sessions_count, 0);
      const { data: newCp, error: cpErr } = await supabase
        .from('customer_packages')
        .insert({
          customer_id: customerId, package_id: pkg.id, tenant_id: tenant.id,
          sessions_total: totalSessions, sessions_used: 0,
          status: 'active', payment_status: 'pending',
        })
        .select().single();
      if (cpErr) throw cpErr;
      if (newCp && pkgSvcs && pkgSvcs.length > 0) {
        await supabase.from('customer_package_services').insert(
          pkgSvcs.map((ps: any) => ({
            customer_package_id: newCp.id, service_id: ps.service_id,
            sessions_total: ps.sessions_count, sessions_used: 0,
          }))
        );
      }
      toast({ title: "Pacote adquirido!" });
      setStep('success');
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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
          <Button onClick={onScheduleNow} className="w-full bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl">
            <Calendar className="h-4 w-4 mr-2" /> Agendar agora
          </Button>
          <Button variant="outline" onClick={onSuccess} className="w-full border-zinc-700 text-zinc-400 rounded-xl">
            Agendar depois
          </Button>
        </div>
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
          <label className="block text-sm text-zinc-400 mb-1.5">E-mail</label>
          <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)}
            className="h-11 bg-zinc-900/50 border-zinc-800 rounded-xl" />
        </div>
      </div>

      <Button onClick={handlePurchase} disabled={submitting || !name || !phone} className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
        {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</> : <><Check className="h-4 w-4 mr-2" /> Comprar pacote</>}
      </Button>
      <button onClick={onCancel} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
        <ChevronLeft className="h-4 w-4" /> Voltar
      </button>
    </div>
  );
}
