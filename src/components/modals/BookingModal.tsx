import { useState, useEffect, useCallback, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useBookingModal } from "@/hooks/useBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, Package, Repeat } from "lucide-react";
import { cn } from "@/lib/utils";

const bookingFormSchema = z.object({
  customer_name: z.string().min(1, "Nome é obrigatório"),
  customer_phone: z.string().min(1, "Telefone é obrigatório"),
  customer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  service_id: z.string().min(1, "Serviço é obrigatório"),
  staff_id: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  extra_slots: z.number().min(0).optional(),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

interface CustomerSuggestion {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  benefits?: { hasSubscription: boolean; hasPackage: boolean; subscriptionName?: string; packageCount?: number };
}

interface AvailableSlot {
  time: string;
  staff_id: string;
  staff_name: string;
}

interface DetectedBenefit {
  type: 'subscription' | 'package';
  name: string;
  id: string;
  remaining?: number;
  validUntil?: string;
}

export function BookingModal() {
  const { currentTenant } = useTenant();
  const { isOpen, closeBookingModal, initialStaffId, initialDate, initialTime, customerPackageId, customerSubscriptionId, allowedServiceIds, preselectedCustomerId } = useBookingModal();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Customer autocomplete state
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Available slots state
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Benefit detection state
  const [detectedBenefits, setDetectedBenefits] = useState<DetectedBenefit[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);
  const [serviceBenefitsMap, setServiceBenefitsMap] = useState<Map<string, DetectedBenefit>>(new Map());

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      service_id: "",
      staff_id: "",
      date: "",
      time: "",
      extra_slots: 0,
      notes: "",
    },
  });

  const watchedDate = form.watch("date");
  const watchedServiceId = form.watch("service_id");
  const watchedStaffId = form.watch("staff_id");
  const watchedExtraSlots = form.watch("extra_slots") || 0;

  useEffect(() => {
    if (isOpen && currentTenant) {
      loadFormData();
      // Apply pre-fill values
      if (initialDate) form.setValue("date", initialDate);
      if (initialStaffId) form.setValue("staff_id", initialStaffId);
      if (initialTime) form.setValue("time", initialTime);
    }
    if (!isOpen) {
      form.reset();
      setCustomerSuggestions([]);
      setSelectedCustomerId(null);
      setAvailableSlots([]);
      setDetectedBenefits([]);
      setServiceBenefitsMap(new Map());
    }
  }, [isOpen, currentTenant]);

  // Pre-fill customer when opened via package/subscription
  useEffect(() => {
    if (isOpen && preselectedCustomerId && currentTenant) {
      const loadPreselectedCustomer = async () => {
        const { data: customer } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('id', preselectedCustomerId)
          .single();
        if (customer) {
          form.setValue('customer_name', customer.name);
          form.setValue('customer_phone', customer.phone);
          form.setValue('customer_email', customer.email || '');
          setSelectedCustomerId(customer.id);
        }
      };
      loadPreselectedCustomer();
    }
  }, [isOpen, preselectedCustomerId, currentTenant]);

  // Detect benefits when customer + service are selected
  useEffect(() => {
    if (!selectedCustomerId || !watchedServiceId || !currentTenant) {
      setDetectedBenefits([]);
      return;
    }
    const detectBenefits = async () => {
      setLoadingBenefits(true);
      const benefits: DetectedBenefit[] = [];
      try {
        // 1. Check active subscriptions
        const { data: subs } = await supabase
          .from('customer_subscriptions')
          .select('id, status, plan_id, started_at, current_period_start, current_period_end, plan:subscription_plans(name)')
          .eq('customer_id', selectedCustomerId)
          .eq('tenant_id', currentTenant.id)
          .in('status', ['active', 'authorized']);

        if (subs) {
          const now = new Date();
          for (const sub of subs) {
            const startDate = sub.current_period_start ? new Date(sub.current_period_start) : (sub.started_at ? new Date(sub.started_at) : null);
            if (!startDate) continue;
            const endDate = sub.current_period_end ? new Date(sub.current_period_end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (now > endDate) continue;

            const { data: planSvc } = await supabase
              .from('subscription_plan_services')
              .select('sessions_per_cycle')
              .eq('plan_id', sub.plan_id)
              .eq('service_id', watchedServiceId)
              .maybeSingle();

            if (planSvc) {
              benefits.push({
                type: 'subscription',
                name: (sub.plan as any)?.name || 'Assinatura',
                id: sub.id,
                validUntil: endDate.toLocaleDateString('pt-BR'),
              });
            }
          }
        }

        // 2. Check active packages
        const { data: pkgs } = await supabase
          .from('customer_packages')
          .select('id, status, payment_status, package:service_packages(name)')
          .eq('customer_id', selectedCustomerId)
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'active')
          .eq('payment_status', 'confirmed');

        if (pkgs) {
          for (const pkg of pkgs) {
            const { data: pkgSvc } = await supabase
              .from('customer_package_services')
              .select('sessions_used, sessions_total')
              .eq('customer_package_id', pkg.id)
              .eq('service_id', watchedServiceId)
              .maybeSingle();

            if (pkgSvc && pkgSvc.sessions_used < pkgSvc.sessions_total) {
              benefits.push({
                type: 'package',
                name: (pkg.package as any)?.name || 'Pacote',
                id: pkg.id,
                remaining: pkgSvc.sessions_total - pkgSvc.sessions_used,
              });
            }
          }
        }
      } catch (err) {
        console.error('Error detecting benefits:', err);
      } finally {
        setDetectedBenefits(benefits);
        setLoadingBenefits(false);
      }
    };
    detectBenefits();
  }, [selectedCustomerId, watchedServiceId, currentTenant]);

  // Load all service benefits when customer is selected (for service dropdown badges)
  useEffect(() => {
    if (!selectedCustomerId || !currentTenant || services.length === 0) {
      setServiceBenefitsMap(new Map());
      return;
    }
    const loadAllBenefits = async () => {
      const map = new Map<string, DetectedBenefit>();
      try {
        const now = new Date();
        // 1. Subscriptions
        const { data: subs } = await supabase
          .from('customer_subscriptions')
          .select('id, status, plan_id, started_at, current_period_start, current_period_end, plan:subscription_plans(name)')
          .eq('customer_id', selectedCustomerId)
          .eq('tenant_id', currentTenant.id)
          .in('status', ['active', 'authorized']);

        if (subs) {
          for (const sub of subs) {
            const startDate = sub.current_period_start ? new Date(sub.current_period_start) : (sub.started_at ? new Date(sub.started_at) : null);
            if (!startDate) continue;
            const endDate = sub.current_period_end ? new Date(sub.current_period_end) : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
            if (now > endDate) continue;

            const { data: planSvcs } = await supabase
              .from('subscription_plan_services')
              .select('service_id')
              .eq('plan_id', sub.plan_id);

            for (const ps of (planSvcs || [])) {
              if (!map.has(ps.service_id)) {
                map.set(ps.service_id, {
                  type: 'subscription',
                  name: (sub.plan as any)?.name || 'Assinatura',
                  id: sub.id,
                  validUntil: endDate.toLocaleDateString('pt-BR'),
                });
              }
            }
          }
        }

        // 2. Packages
        const { data: pkgs } = await supabase
          .from('customer_packages')
          .select('id, status, payment_status, package:service_packages(name)')
          .eq('customer_id', selectedCustomerId)
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'active')
          .eq('payment_status', 'confirmed');

        if (pkgs) {
          for (const pkg of pkgs) {
            const { data: pkgSvcs } = await supabase
              .from('customer_package_services')
              .select('service_id, sessions_used, sessions_total')
              .eq('customer_package_id', pkg.id);

            for (const ps of (pkgSvcs || [])) {
              if (ps.sessions_used < ps.sessions_total && !map.has(ps.service_id)) {
                map.set(ps.service_id, {
                  type: 'package',
                  name: (pkg.package as any)?.name || 'Pacote',
                  id: pkg.id,
                  remaining: ps.sessions_total - ps.sessions_used,
                });
              }
            }
          }
        }
      } catch (err) {
        console.error('Error loading service benefits map:', err);
      }
      setServiceBenefitsMap(map);
    };
    loadAllBenefits();
  }, [selectedCustomerId, currentTenant, services]);

  // Fetch available slots when date/service/staff changes
  useEffect(() => {
    if (watchedDate && currentTenant) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      form.setValue("time", "");
    }
  }, [watchedDate, watchedServiceId, watchedStaffId, currentTenant]);

  // Reset selected time when extra slots change (filtered slots change)
  useEffect(() => {
    form.setValue("time", "");
  }, [watchedExtraSlots]);

  const loadFormData = async () => {
    if (!currentTenant) return;
    try {
      const [servicesResult, staffResult] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name')
      ]);
      if (servicesResult.error) throw servicesResult.error;
      if (staffResult.error) throw staffResult.error;
      setServices(servicesResult.data || []);
      setStaff(staffResult.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do formulário",
        variant: "destructive",
      });
    }
  };

  const fetchAvailableSlots = async () => {
    if (!currentTenant || !watchedDate) return;
    setLoadingSlots(true);
    try {
      const body: any = {
        tenant_id: currentTenant.id,
        date: watchedDate,
      };
      if (watchedServiceId) body.service_id = watchedServiceId;
      if (watchedStaffId && watchedStaffId !== "none") body.staff_id = watchedStaffId;

      const { data, error } = await supabase.functions.invoke('get-available-slots', { body });
      if (error) throw error;
      setAvailableSlots(data?.available_slots || []);
      // Reset time if previously selected time is no longer available
      const currentTime = form.getValues("time");
      if (currentTime && !data?.available_slots?.find((s: AvailableSlot) => s.time === currentTime)) {
        form.setValue("time", "");
      }
    } catch (error) {
      console.error('Error fetching available slots:', error);
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Customer search with debounce
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchCustomers = useCallback((name: string) => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!name || name.length < 2 || !currentTenant) {
      setCustomerSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingCustomers(true);
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, phone, email')
          .eq('tenant_id', currentTenant.id)
          .ilike('name', `%${name}%`)
          .order('name')
          .limit(8);
        if (error) throw error;
        
        const customers: CustomerSuggestion[] = data || [];
        
        // Enrich with benefit info
        if (customers.length > 0) {
          const customerIds = customers.map(c => c.id);
          const now = new Date();
          
          const [subsRes, pkgsRes] = await Promise.all([
            supabase
              .from('customer_subscriptions')
              .select('customer_id, status, started_at, current_period_start, current_period_end, plan:subscription_plans(name)')
              .eq('tenant_id', currentTenant.id)
              .in('customer_id', customerIds)
              .in('status', ['active', 'authorized']),
            supabase
              .from('customer_packages')
              .select('customer_id, status, payment_status')
              .eq('tenant_id', currentTenant.id)
              .in('customer_id', customerIds)
              .eq('status', 'active')
              .eq('payment_status', 'confirmed'),
          ]);
          
          for (const c of customers) {
            const activeSub = (subsRes.data || []).find(s => {
              if (s.customer_id !== c.id) return false;
              const start = s.current_period_start ? new Date(s.current_period_start) : (s.started_at ? new Date(s.started_at) : null);
              if (!start) return false;
              const end = s.current_period_end ? new Date(s.current_period_end) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000);
              return now <= end;
            });
            const pkgCount = (pkgsRes.data || []).filter(p => p.customer_id === c.id).length;
            
            c.benefits = {
              hasSubscription: !!activeSub,
              hasPackage: pkgCount > 0,
              subscriptionName: activeSub ? (activeSub.plan as any)?.name : undefined,
              packageCount: pkgCount,
            };
          }
        }
        
        setCustomerSuggestions(customers);
        setShowSuggestions(customers.length > 0);
      } catch (err) {
        console.error('Error searching customers:', err);
      } finally {
        setSearchingCustomers(false);
      }
    }, 300);
  }, [currentTenant]);

  const selectCustomer = (customer: CustomerSuggestion) => {
    form.setValue("customer_name", customer.name);
    form.setValue("customer_phone", customer.phone);
    form.setValue("customer_email", customer.email || "");
    setSelectedCustomerId(customer.id);
    setShowSuggestions(false);
  };

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node) &&
          nameInputRef.current && !nameInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSubmit = async (data: BookingFormData) => {
    if (!currentTenant) return;
    try {
      setFormLoading(true);

      const startsAt = new Date(`${data.date}T${data.time}`);

      const { data: result, error } = await supabase.functions.invoke('create-booking', {
        body: {
          tenant_id: currentTenant.id,
          service_id: data.service_id,
          staff_id: data.staff_id === "none" ? null : data.staff_id,
          customer_name: data.customer_name,
          customer_phone: data.customer_phone,
          customer_email: data.customer_email || undefined,
          starts_at: startsAt.toISOString(),
          notes: data.notes || undefined,
          extra_slots: data.extra_slots || 0,
          created_via: 'admin',
          payment_method: 'onsite',
          customer_package_id: customerPackageId || undefined,
          customer_subscription_id: customerSubscriptionId || undefined,
        },
      });

      if (error) throw error;
      if (!result?.success) throw new Error(result?.error || 'Erro ao criar agendamento');

      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      });

      form.reset();
      setSelectedCustomerId(null);
      closeBookingModal();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeBookingModal}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Novo Agendamento
            {customerPackageId && (
              <Badge variant="secondary" className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs">
                <Package className="h-3 w-3 mr-1" /> Sessão de pacote
              </Badge>
            )}
            {customerSubscriptionId && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                <Repeat className="h-3 w-3 mr-1" /> Sessão de assinatura
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Criar um novo agendamento para cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 md:space-y-4">
            {/* Customer Name with Autocomplete */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem className="relative">
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: João Silva"
                        {...field}
                        ref={(e) => {
                          field.ref(e);
                          (nameInputRef as any).current = e;
                        }}
                        onChange={(e) => {
                          field.onChange(e);
                          setSelectedCustomerId(null);
                          searchCustomers(e.target.value);
                        }}
                        onFocus={() => {
                          if (customerSuggestions.length > 0) setShowSuggestions(true);
                        }}
                        autoComplete="off"
                      />
                    </FormControl>
                    {showSuggestions && customerSuggestions.length > 0 && (
                      <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
                      >
                        {customerSuggestions.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-accent text-sm transition-colors group"
                            onClick={() => selectCustomer(c)}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium text-foreground truncate">{c.name}</span>
                              <div className="flex items-center gap-1 shrink-0">
                                {c.benefits?.hasSubscription && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-400 dark:border-violet-500/20 group-hover:bg-white/90 group-hover:text-violet-700 group-hover:border-violet-300">
                                    <Repeat className="h-2.5 w-2.5 mr-0.5" />
                                    {c.benefits.subscriptionName || 'Assinatura'}
                                  </Badge>
                                )}
                                {c.benefits?.hasPackage && (
                                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20 group-hover:bg-white/90 group-hover:text-amber-700 group-hover:border-amber-300">
                                    <Package className="h-2.5 w-2.5 mr-0.5" />
                                    {c.benefits.packageCount}x Pacote
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchingCustomers && (
                      <div className="absolute right-3 top-9">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service and Staff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(allowedServiceIds
                          ? services.filter(s => allowedServiceIds.includes(s.id))
                          : services
                        ).map((service) => {
                          const benefit = serviceBenefitsMap.get(service.id);
                          return (
                            <SelectItem key={service.id} value={service.id}>
                              <div className="flex items-center gap-2 w-full">
                                <div 
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: service.color }}
                                />
                                <span className="truncate">{service.name} - {service.duration_minutes}min</span>
                                {benefit ? (
                                  <span className="ml-auto text-xs font-medium shrink-0 text-amber-400">
                                    {benefit.type === 'subscription' ? '🔓 Assinatura' : `📦 ${benefit.remaining}x`}
                                  </span>
                                ) : (
                                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                                    R$ {(service.price_cents / 100).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Qualquer profissional</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Benefit detection banner */}
            {selectedCustomerId && watchedServiceId && (
              loadingBenefits ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando benefícios do cliente...
                </div>
              ) : detectedBenefits.length > 0 ? (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1.5">
                  {detectedBenefits.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      {b.type === 'subscription' ? (
                        <>
                          <Repeat className="h-4 w-4 text-emerald-500 shrink-0" />
                          <span className="text-foreground">
                            🔓 Assinatura <strong>{b.name}</strong> ativa até {b.validUntil} — será R$ 0,00
                          </span>
                        </>
                      ) : (
                        <>
                          <Package className="h-4 w-4 text-amber-500 shrink-0" />
                          <span className="text-foreground">
                            ✅ <strong>{b.remaining}</strong> sessão(ões) disponível(eis) no pacote <strong>{b.name}</strong> — será R$ 0,00
                          </span>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">❌ Nenhum pacote ou assinatura ativa para este serviço</span>
                </div>
              )
            )}

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Data *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Extra time - before time selection so slots adapt */}
            {watchedServiceId && (
              <FormField
                control={form.control}
                name="extra_slots"
                render={({ field }) => {
                  const selectedService = services.find(s => s.id === watchedServiceId);
                  const extraSlotDuration = (currentTenant as any)?.settings?.extra_slot_duration || 5;
                  const baseDuration = selectedService?.duration_minutes || 60;
                  const totalDuration = baseDuration + (field.value || 0) * extraSlotDuration;
                  return (
                    <FormItem>
                      <FormLabel>Tempo adicional</FormLabel>
                      <div className="flex items-center gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!field.value || field.value <= 0}
                          onClick={() => field.onChange(Math.max(0, (field.value || 0) - 1))}
                        >
                          −
                        </Button>
                        <span className="text-sm font-medium min-w-[100px] text-center">
                          +{(field.value || 0) * extraSlotDuration} min
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => field.onChange((field.value || 0) + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Duração total: {totalDuration} min (base {baseDuration} min + {(field.value || 0) * extraSlotDuration} min extras)
                      </p>
                    </FormItem>
                  );
                }}
              />
            )}

            {/* Available Time Slots - filtered by total duration */}
            <FormField
              control={form.control}
              name="time"
              render={({ field }) => {
                const selectedService = services.find(s => s.id === watchedServiceId);
                const extraSlotDuration = (currentTenant as any)?.settings?.extra_slot_duration || 5;
                const slotDuration = (currentTenant as any)?.settings?.slot_duration || 15;
                const baseDuration = selectedService?.duration_minutes || 60;
                const totalDuration = baseDuration + (watchedExtraSlots || 0) * extraSlotDuration;

                // Filter slots: ensure enough consecutive available time
                const filteredSlots = availableSlots.filter((slot) => {
                  const [h, m] = slot.time.split(':').map(Number);
                  const startMin = h * 60 + m;
                  const endMin = startMin + totalDuration;

                  // Check all slot intervals within the needed duration are available
                  for (let t = startMin + slotDuration; t < endMin; t += slotDuration) {
                    const checkH = String(Math.floor(t / 60)).padStart(2, '0');
                    const checkM = String(t % 60).padStart(2, '0');
                    const checkTime = `${checkH}:${checkM}`;
                    const found = availableSlots.find(s => s.time === checkTime);
                    if (!found) return false;
                  }
                  return true;
                });

                return (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    {!watchedDate ? (
                      <p className="text-sm text-muted-foreground">Selecione uma data primeiro</p>
                    ) : loadingSlots ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Carregando horários disponíveis...
                      </div>
                    ) : filteredSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        {availableSlots.length > 0
                          ? `Nenhum horário comporta ${totalDuration} min seguidos`
                          : 'Nenhum horário disponível para esta data'}
                      </p>
                    ) : (
                      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1">
                        {filteredSlots.map((slot) => (
                          <button
                            key={slot.time}
                            type="button"
                            className={cn(
                              "flex items-center justify-center gap-1 px-2 py-2 rounded-md text-sm font-medium border transition-colors",
                              field.value === slot.time
                                ? "bg-primary text-primary-foreground border-primary"
                                : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                            )}
                            onClick={() => field.onChange(slot.time)}
                          >
                            <Clock className="h-3 w-3" />
                            {slot.time}
                          </button>
                        ))}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o agendamento..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => closeBookingModal()}
                disabled={formLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
                {formLoading ? "Criando..." : customerPackageId ? "Criar Agendamento (sessão do pacote)" : customerSubscriptionId ? "Criar Agendamento (sessão da assinatura)" : "Criar Agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
