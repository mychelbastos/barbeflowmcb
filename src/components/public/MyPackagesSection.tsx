import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Package, Repeat, Loader2, Phone, ArrowRight, Calendar, ChevronLeft } from "lucide-react";
import { PackageBookingFlow } from "./PackageBookingFlow";

interface MyPackagesSectionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenant: any;
  slug: string;
}

interface ServiceUsage {
  serviceId: string;
  serviceName: string;
  sessionsUsed: number;
  sessionsTotal: number | null;
}

interface BenefitItem {
  id: string;
  type: 'package' | 'subscription';
  name: string;
  services: ServiceUsage[];
  nextRenewal?: string;
  customerPackageId?: string;
  customerSubscriptionId?: string;
}

function canonicalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
}

export function MyPackagesSection({ open, onOpenChange, tenant, slug }: MyPackagesSectionProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(false);
  const [benefits, setBenefits] = useState<BenefitItem[]>([]);
  const [searched, setSearched] = useState(false);
  const [bookingService, setBookingService] = useState<{
    serviceId: string; serviceName: string;
    customerPackageId?: string; customerSubscriptionId?: string;
    benefitLabel: string;
  } | null>(null);

  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  const searchBenefits = async () => {
    const canonical = canonicalPhone(phone);
    if (canonical.length < 10) {
      toast({ title: "Telefone inválido", variant: "destructive" });
      return;
    }

    setLoading(true);
    setSearched(true);
    try {
      const { data: lookupData, error: lookupError } = await supabase.functions.invoke('public-customer-bookings', {
        body: { phone: canonical, tenant_id: tenant.id, action: 'lookup' },
      });

      if (lookupError) throw lookupError;

      if (!lookupData?.found || !lookupData?.customer?.id) {
        setBenefits([]);
        setCustomerName('');
        setLoading(false);
        return;
      }

      const matched = { id: lookupData.customer.id, name: lookupData.customer.name };
      setCustomerName(matched.name || '');

      const items: BenefitItem[] = [];

      const { data: custPkgs } = await supabase
        .from('customer_packages')
        .select('*, package:service_packages(name)')
        .eq('customer_id', matched.id).eq('tenant_id', tenant.id)
        .eq('status', 'active').eq('payment_status', 'confirmed');

      if (custPkgs) {
        for (const cp of custPkgs) {
          const { data: svcUsage } = await supabase
            .from('customer_package_services')
            .select('*, service:services(name)')
            .eq('customer_package_id', cp.id);

          items.push({
            id: cp.id, type: 'package',
            name: cp.package?.name || 'Pacote',
            customerPackageId: cp.id,
            services: (svcUsage || []).map((s: any) => ({
              serviceId: s.service_id, serviceName: s.service?.name || 'Serviço',
              sessionsUsed: s.sessions_used, sessionsTotal: s.sessions_total,
            })),
          });
        }
      }

      const { data: subs } = await supabase
        .from('customer_subscriptions')
        .select('*, plan:subscription_plans(name, price_cents)')
        .eq('customer_id', matched.id).eq('tenant_id', tenant.id)
        .in('status', ['active', 'authorized']);

      if (subs) {
        for (const sub of subs) {
          const { data: planSvcs } = await supabase
            .from('subscription_plan_services')
            .select('*, service:services(name)')
            .eq('plan_id', sub.plan_id);

          const services: ServiceUsage[] = [];
          for (const ps of (planSvcs || [])) {
            const todayStr = new Date().toISOString().split('T')[0];
            const { data: usage } = await supabase
              .from('subscription_usage')
              .select('sessions_used, sessions_limit')
              .eq('subscription_id', sub.id).eq('service_id', ps.service_id)
              .lte('period_start', todayStr).gte('period_end', todayStr)
              .maybeSingle();

            services.push({
              serviceId: ps.service_id, serviceName: ps.service?.name || 'Serviço',
              sessionsUsed: usage?.sessions_used || 0,
              sessionsTotal: usage?.sessions_limit ?? ps.sessions_per_cycle,
            });
          }

          items.push({
            id: sub.id, type: 'subscription',
            name: sub.plan?.name || 'Assinatura',
            customerSubscriptionId: sub.id,
            nextRenewal: sub.current_period_end ? new Date(sub.current_period_end).toLocaleDateString('pt-BR') : undefined,
            services,
          });
        }
      }

      setBenefits(items);
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao buscar benefícios", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getAvailableServices = (item: BenefitItem) => {
    return item.services.filter(s => s.sessionsTotal === null || s.sessionsUsed < s.sessionsTotal);
  };

  const handleBookService = (item: BenefitItem, svc: ServiceUsage) => {
    setBookingService({
      serviceId: svc.serviceId, serviceName: svc.serviceName,
      customerPackageId: item.customerPackageId,
      customerSubscriptionId: item.customerSubscriptionId,
      benefitLabel: item.type === 'package' ? 'pacote' : 'assinatura',
    });
  };

  if (bookingService) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Agendar Serviço</DialogTitle>
          </DialogHeader>
          <PackageBookingFlow
            tenant={tenant}
            serviceId={bookingService.serviceId}
            serviceName={bookingService.serviceName}
            customerPhone={phone.replace(/\D/g, '')}
            customerName={customerName}
            customerPackageId={bookingService.customerPackageId}
            customerSubscriptionId={bookingService.customerSubscriptionId}
            benefitLabel={bookingService.benefitLabel}
            slug={slug}
            onSuccess={() => { setBookingService(null); onOpenChange(false); }}
            onCancel={() => setBookingService(null)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-zinc-950 border-zinc-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            Meus Pacotes & Assinaturas
          </DialogTitle>
        </DialogHeader>

        {!searched ? (
          <div className="space-y-4">
            <p className="text-sm text-zinc-400">Digite seu telefone para ver seus benefícios ativos.</p>
            <div className="flex gap-2">
              <Input
                placeholder="(00) 00000-0000"
                value={phone}
                onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
                className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl"
              />
              <Button onClick={searchBenefits} disabled={loading} className="h-12 px-6 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
              </Button>
            </div>
          </div>
        ) : loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>
        ) : benefits.length === 0 ? (
          <div className="text-center py-8">
            <Package className="h-10 w-10 mx-auto text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400 mb-1">Nenhum pacote ou assinatura ativa encontrada.</p>
            <p className="text-xs text-zinc-500">Verifique o número ou adquira um pacote.</p>
            <Button variant="outline" size="sm" onClick={() => { setSearched(false); setPhone(''); }} className="mt-4 border-zinc-700 text-zinc-400">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Tentar outro número
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {benefits.map((item) => (
              <div key={item.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {item.type === 'package' ? (
                      <Package className="h-4 w-4 text-amber-400" />
                    ) : (
                      <Repeat className="h-4 w-4 text-primary" />
                    )}
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <Badge variant="secondary" className={`text-[10px] ${
                    item.type === 'package' ? 'bg-zinc-800 text-zinc-400' : 'bg-primary/10 text-primary border-primary/20'
                  }`}>
                    {item.type === 'package' ? 'PACOTE' : 'ASSINATURA'}
                  </Badge>
                </div>

                <div className="space-y-2">
                  {item.services.map((svc) => {
                    const isUnlimited = svc.sessionsTotal === null;
                    const remaining = isUnlimited ? null : svc.sessionsTotal! - svc.sessionsUsed;
                    const pct = isUnlimited ? 0 : (svc.sessionsUsed / svc.sessionsTotal!) * 100;
                    const hasRemaining = isUnlimited || (remaining !== null && remaining > 0);

                    return (
                      <div key={svc.serviceId} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-zinc-400 truncate">{svc.serviceName}</span>
                          <span className="font-medium shrink-0 ml-2">
                            {isUnlimited ? '∞ ilimitado' : `${svc.sessionsUsed}/${svc.sessionsTotal} usados`}
                          </span>
                        </div>
                        {!isUnlimited && (
                          <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${100 - pct}%` }} />
                          </div>
                        )}
                        {hasRemaining && (
                          <button
                            onClick={() => handleBookService(item, svc)}
                            className="text-[11px] text-primary hover:text-yellow-300 flex items-center gap-1 mt-1"
                          >
                            <Calendar className="h-3 w-3" /> Agendar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                {item.nextRenewal && (
                  <p className="text-[10px] text-zinc-500">Próxima renovação: {item.nextRenewal}</p>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => { setSearched(false); setPhone(''); setBenefits([]); }} className="w-full border-zinc-700 text-zinc-400">
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
