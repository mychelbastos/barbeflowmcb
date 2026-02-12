import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { TenantNotFound } from "@/components/TenantNotFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackagePurchaseFlow } from "@/components/public/PackagePurchaseFlow";

import { Calendar as CalendarRac } from "@/components/ui/calendar-rac";
import { MercadoPagoCheckout } from "@/components/MercadoPagoCheckout";
import { CustomerBookingsModal } from "@/components/modals/CustomerBookingsModal";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Clock, 
  Scissors, 
  MapPin, 
  Phone, 
  User,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CalendarPlus,
  Sparkles,
  CreditCard,
  Banknote,
  CalendarCheck,
  Package,
  Repeat
} from "lucide-react";
import { PublicSubscriptionPlans } from "@/components/subscriptions/PublicSubscriptionPlans";
import { MyPackagesSection } from "@/components/public/MyPackagesSection";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import type { DateValue } from "react-aria-components";

type PaymentMethod = 'on_site' | 'online' | null;
type BookingTab = 'services' | 'packages' | 'subscriptions';

const BookingPublic = () => {
  const { slug } = useParams<{ slug: string }>();
  const { toast } = useToast();
  
  const [tenant, setTenant] = useState<any>(null);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<DateValue | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<any[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<any[]>([]);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tenantNotFound, setTenantNotFound] = useState(false);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerBirthday, setCustomerBirthday] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [customerFound, setCustomerFound] = useState(false);
  const [lookingUpCustomer, setLookingUpCustomer] = useState(false);
  
  // Payment related states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [allowOnlinePayment, setAllowOnlinePayment] = useState(false);
  const [requirePrepayment, setRequirePrepayment] = useState(false);
  const [prepaymentPercentage, setPrepaymentPercentage] = useState(0);
  
  // Availability settings
  const [maxAdvanceDays, setMaxAdvanceDays] = useState<number>(0);
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  
  // Customer bookings modal
  const [showCustomerBookings, setShowCustomerBookings] = useState(false);
  const [showMyPackages, setShowMyPackages] = useState(false);
  const [purchasingPackage, setPurchasingPackage] = useState<any>(null);

  // Packages
  const [packages, setPackages] = useState<any[]>([]);
  const [bookingTab, setBookingTab] = useState<BookingTab>('services');
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [activeCustomerPackage, setActiveCustomerPackage] = useState<any>(null);
  const [packageCoveredService, setPackageCoveredService] = useState(false);
  const [createdCustomerPackageId, setCreatedCustomerPackageId] = useState<string | null>(null);

  // Subscriptions
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [subscriptionCoveredService, setSubscriptionCoveredService] = useState(false);

  useEffect(() => {
    if (slug) {
      loadTenantData();
    }
  }, [slug]);

  useEffect(() => {
    if (selectedService && selectedDate) {
      loadAvailableSlots();
    }
  }, [selectedService, selectedStaff, selectedDate]);

  const loadTenantData = async () => {
    try {
      setLoading(true);
      
      const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      if (tenantError || !tenantData) {
        setTenantNotFound(true);
        setLoading(false);
        return;
      }

      setTenant(tenantData);
      
      // Extract payment settings
      const settings = (tenantData.settings || {}) as Record<string, any>;
      setAllowOnlinePayment(settings.allow_online_payment || false);
      setRequirePrepayment(settings.require_prepayment || false);
      setPrepaymentPercentage(settings.prepayment_percentage || 0);
      setMaxAdvanceDays(settings.max_advance_days || 0);

      const [servicesRes, staffRes, blocksRes] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true)
          .order('name'),
        
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', tenantData.id)
          .eq('active', true)
          .order('name'),
        
        // Load full-day blocks to disable dates in calendar
        supabase
          .from('blocks')
          .select('starts_at, ends_at, staff_id')
          .eq('tenant_id', tenantData.id)
          .gte('ends_at', new Date().toISOString())
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;
      
      // Process blocked dates (full-day blocks that apply to all staff)
      const blocked = new Set<string>();
      if (blocksRes.data) {
        for (const block of blocksRes.data) {
          // Check if it's a full-day block (00:00 to 23:59)
          const startDate = new Date(block.starts_at);
          const endDate = new Date(block.ends_at);
          const startHours = startDate.getHours();
          const startMinutes = startDate.getMinutes();
          const endHours = endDate.getHours();
          const endMinutes = endDate.getMinutes();
          
          const isFullDay = startHours === 0 && startMinutes === 0 && 
                            endHours === 23 && endMinutes >= 59;
          
          // Only block dates if it's a full-day block for all staff
          if (isFullDay && block.staff_id === null) {
            const dateStr = startDate.toISOString().split('T')[0];
            blocked.add(dateStr);
          }
        }
      }
      setBlockedDates(blocked);

      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);

      // Load active packages with their services
      const { data: pkgsData } = await supabase
        .from("service_packages")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .eq("active", true)
        .order("name");

      if (pkgsData && pkgsData.length > 0) {
        const { data: pkgSvcs } = await supabase
          .from("package_services")
          .select("*, service:services(name, duration_minutes, price_cents, photo_url)")
          .in("package_id", pkgsData.map(p => p.id));

        for (const pkg of pkgsData) {
          (pkg as any).package_services = (pkgSvcs || []).filter((ps: any) => ps.package_id === pkg.id);
        }
        setPackages(pkgsData);
      } else {
        setPackages([]);
      }

      // Load subscription plans
      const { data: subPlansData } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("tenant_id", tenantData.id)
        .eq("active", true)
        .order("name");

      if (subPlansData && subPlansData.length > 0) {
        const { data: planSvcs } = await supabase
          .from("subscription_plan_services")
          .select("*, service:services(name)")
          .in("plan_id", subPlansData.map(p => p.id));

        for (const plan of subPlansData) {
          (plan as any).plan_services = (planSvcs || []).filter((ps: any) => ps.plan_id === plan.id);
        }
        setSubscriptionPlans(subPlansData);
      } else {
        setSubscriptionPlans([]);
      }
    } catch (error) {
      console.error('Error loading tenant data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    if (!selectedService || !selectedDate || !tenant) return;

    try {
      setSlotsLoading(true);
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: {
          tenant_id: tenant.id,
          service_id: selectedService,
          staff_id: selectedStaff || null,
          date: selectedDate,
        },
      });

      if (error) throw error;
      
      const available = data.available_slots || [];
      const occupied = data.occupied_slots || [];
      
      setAvailableSlots(available);
      setOccupiedSlots(occupied);
      
      const slotMap = new Map();
      available.forEach((slot: any) => {
        slotMap.set(slot.time, { ...slot, available: true });
      });
      occupied.forEach((occupiedSlot: any) => {
        slotMap.set(occupiedSlot.time, { 
          ...occupiedSlot, 
          available: false,
          reason: occupiedSlot.reason 
        });
      });
      
      const allSlots = Array.from(slotMap.values());
      allSlots.sort((a, b) => a.time.localeCompare(b.time));
      setAllTimeSlots(allSlots);
      
    } catch (error) {
      console.error('Error loading slots:', error);
      toast({
        title: "Erro ao carregar horários",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleServiceSelect = (serviceId: string) => {
    setSelectedService(serviceId);
    setSelectedPackage(null);
    setActiveCustomerPackage(null);
    setPackageCoveredService(false);
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    setSelectedDate(tomorrowStr);
    setSelectedCalendarDate(parseDate(tomorrowStr));
    
    setStep(2);
  };

  const handlePackageSelect = (pkg: any) => {
    // When buying a package, we still need to select the first service to schedule
    // The package will be purchased and linked to the customer
    setSelectedPackage(pkg);
    const firstService = pkg.package_services?.[0];
    if (firstService) {
      setSelectedService(firstService.service_id);
    }
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    setSelectedDate(tomorrowStr);
    setSelectedCalendarDate(parseDate(tomorrowStr));

    setStep(2);
  };

  // Canonical phone normalization for Brazilian numbers
  const canonicalPhone = (phone: string): string => {
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
    if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
    return digits;
  };

  // Check if customer has an active package covering the selected service
  const checkActivePackage = async (phone: string) => {
    if (!tenant || !selectedService) return;
    
    const canonical = canonicalPhone(phone);
    if (canonical.length < 10) return;

    try {
      // Get all customers for this tenant and match by canonical phone
      const { data: matchingCustomers } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('tenant_id', tenant.id);

      const matchedCustomer = matchingCustomers?.find(c => 
        canonicalPhone(c.phone) === canonical
      );

      if (!matchedCustomer) {
        setActiveCustomerPackage(null);
        setPackageCoveredService(false);
        return;
      }

      // Check for active packages with remaining sessions for this service
      const { data: custPkgs } = await supabase
        .from('customer_packages')
        .select('*, package:service_packages(*)')
        .eq('customer_id', matchedCustomer.id)
        .eq('tenant_id', tenant.id)
        .eq('status', 'active')
        .eq('payment_status', 'confirmed');

      if (!custPkgs || custPkgs.length === 0) {
        setActiveCustomerPackage(null);
        setPackageCoveredService(false);
        return;
      }

      // Check customer_package_services for remaining sessions
      for (const cp of custPkgs) {
        const { data: cpServices } = await supabase
          .from('customer_package_services')
          .select('*')
          .eq('customer_package_id', cp.id)
          .eq('service_id', selectedService);

        const cpService = cpServices?.[0];
        if (cpService && cpService.sessions_used < cpService.sessions_total) {
          setActiveCustomerPackage({
            ...cp,
            serviceUsage: cpService,
          });
          setPackageCoveredService(true);
          return;
        }
      }

      setActiveCustomerPackage(null);
      setPackageCoveredService(false);
    } catch (err) {
      console.error('Error checking active package:', err);
    }
  };

  // Check if customer has an active subscription covering the selected service
  const checkActiveSubscription = async (phone: string) => {
    if (!tenant || !selectedService) return;
    const canonical = canonicalPhone(phone);
    if (canonical.length < 10) return;

    try {
      const { data: matchingCustomers } = await supabase
        .from('customers')
        .select('id, phone')
        .eq('tenant_id', tenant.id);

      const matchedCustomer = matchingCustomers?.find(c =>
        canonicalPhone(c.phone) === canonical
      );

      if (!matchedCustomer) {
        setActiveSubscription(null);
        setSubscriptionCoveredService(false);
        return;
      }

      // Check for active subscription
      const { data: subs } = await supabase
        .from('customer_subscriptions')
        .select('*, plan:subscription_plans(name, price_cents)')
        .eq('customer_id', matchedCustomer.id)
        .eq('tenant_id', tenant.id)
        .in('status', ['active', 'authorized']);

      if (!subs || subs.length === 0) {
        setActiveSubscription(null);
        setSubscriptionCoveredService(false);
        return;
      }

      const activeSub = subs[0];

      // Check if selected service is covered by the plan
      const { data: planServices } = await supabase
        .from('subscription_plan_services')
        .select('service_id, sessions_per_cycle')
        .eq('plan_id', activeSub.plan_id)
        .eq('service_id', selectedService);

      if (!planServices || planServices.length === 0) {
        setActiveSubscription(activeSub);
        setSubscriptionCoveredService(false);
        return;
      }

      const planService = planServices[0];

      // Check usage
      const { data: usage } = await supabase
        .from('subscription_usage')
        .select('sessions_used, sessions_limit')
        .eq('subscription_id', activeSub.id)
        .eq('service_id', selectedService)
        .order('period_start', { ascending: false })
        .limit(1)
        .maybeSingle();

      const sessionsUsed = usage?.sessions_used || 0;
      const sessionsLimit = usage?.sessions_limit ?? planService.sessions_per_cycle;

      if (sessionsLimit === null || sessionsUsed < sessionsLimit) {
        setActiveSubscription({ ...activeSub, usage: { used: sessionsUsed, limit: sessionsLimit } });
        setSubscriptionCoveredService(true);
      } else {
        setActiveSubscription({ ...activeSub, usage: { used: sessionsUsed, limit: sessionsLimit } });
        setSubscriptionCoveredService(false);
      }
    } catch (err) {
      console.error('Error checking subscription:', err);
    }
  };

  const handleStaffSelect = (staffId: string) => {
    setSelectedStaff(staffId === "any" ? null : staffId);
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    
    if (!selectedDate) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      setSelectedDate(tomorrowStr);
      setSelectedCalendarDate(parseDate(tomorrowStr));
    }
    
    setStep(3);
  };

  const handleDateSelect = (date: DateValue | null) => {
    setSelectedCalendarDate(date);
    if (date) {
      const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
      setSelectedDate(dateStr);
    }
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    // If online payment is enabled and not required, show payment method selection
    if (allowOnlinePayment && !requirePrepayment) {
      setStep(4); // Payment method selection step
    } else if (allowOnlinePayment && requirePrepayment) {
      // Skip to contact info, payment is mandatory online
      setPaymentMethod('online');
      setStep(5);
    } else {
      // No online payment, go directly to contact info
      setPaymentMethod('on_site');
      setStep(5);
    }
  };

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    setStep(5); // Go to contact info
  };

  const goToPreviousStep = () => {
    if (step === 5 && allowOnlinePayment && !requirePrepayment) {
      setStep(4); // Go back to payment method selection
    } else if (step === 5) {
      setStep(3); // Go back to time selection
    } else {
      setStep(prev => Math.max(prev - 1, 1));
    }
  };

  const resetBooking = () => {
    setSelectedService(null);
    setSelectedStaff(null);
    setSelectedDate('');
    setSelectedCalendarDate(null);
    setSelectedTime(null);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerBirthday('');
    setNotes('');
    setCreatedBooking(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    setPaymentMethod(null);
    setSelectedPackage(null);
    setActiveCustomerPackage(null);
    setPackageCoveredService(false);
    setBookingTab('services');
    setCreatedCustomerPackageId(null);
    setCustomerFound(false);
    setActiveSubscription(null);
    setSubscriptionCoveredService(false);
    setStep(1);
  };

  // Format phone for display
  const formatPhoneInput = (value: string): string => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) return digits.length > 0 ? `(${digits}` : '';
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
  };

  // Lookup returning customer by phone
  const lookupCustomerByPhone = async (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, '');
    if (digits.length < 10 || !tenant) return;
    
    setLookingUpCustomer(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'lookup', phone: digits, tenant_id: tenant.id },
      });
      
      if (error) throw error;
      
      if (data?.found && data.customer) {
        setCustomerName(data.customer.name);
        setCustomerEmail(data.customer.email || '');
        setCustomerBirthday(data.customer.birthday || '');
        setCustomerFound(true);
      } else {
        setCustomerFound(false);
      }
    } catch (err) {
      console.error('Error looking up customer:', err);
    } finally {
      setLookingUpCustomer(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant || !selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone || (!customerFound && (!customerEmail || !customerBirthday))) {
      toast({
        title: "Dados incompletos",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);
      
      const [hours, minutes] = selectedTime.split(':');
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startsAt = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);

      // If covered by active package or subscription, skip payment entirely
      const effectivePaymentMethod = (packageCoveredService || subscriptionCoveredService) ? 'onsite' : (paymentMethod === 'online' ? 'online' : 'onsite');
      
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          slug: slug,
          service_id: selectedService,
          staff_id: selectedStaff,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail,
          customer_birthday: customerBirthday || undefined,
          starts_at: startsAt.toISOString(),
          notes: notes || undefined,
          payment_method: effectivePaymentMethod,
          customer_package_id: (packageCoveredService && activeCustomerPackage) ? activeCustomerPackage.id : undefined,
          customer_subscription_id: (subscriptionCoveredService && activeSubscription) ? activeSubscription.id : undefined,
        },
      });

      if (error) throw error;

      if (data.success) {
        const booking = data.booking;
        setCreatedBooking(booking);

        // If covered by package or subscription, backend already handled session decrement
        if (packageCoveredService || subscriptionCoveredService) {
          setStep(6);
          toast({ title: "Agendamento confirmado!", description: packageCoveredService ? "Sessão do pacote utilizada." : "Sessão da assinatura utilizada." });
          return;
        }

        // If buying a package, create the customer_package record
        if (selectedPackage) {
          try {
            const canonical = canonicalPhone(customerPhone);
            // Find customer
            const { data: allCusts } = await supabase
              .from('customers')
              .select('id, phone')
              .eq('tenant_id', tenant.id);
            
            const matchedCust = allCusts?.find(c => canonicalPhone(c.phone) === canonical);
            
            if (matchedCust) {
              const paymentSt = paymentMethod === 'online' ? 'pending' : 'pending';
              const { data: newCp } = await supabase
                .from('customer_packages')
                .insert({
                  customer_id: matchedCust.id,
                  package_id: selectedPackage.id,
                  tenant_id: tenant.id,
                  sessions_total: selectedPackage.total_sessions || 0,
                  sessions_used: 0,
                  status: 'active',
                  payment_status: paymentSt,
                })
                .select()
                .single();

              // Store the customer package ID for payment linking
              if (newCp) {
                setCreatedCustomerPackageId(newCp.id);
              }

              // Create per-service tracking
              if (newCp && selectedPackage.package_services) {
                const svcRows = selectedPackage.package_services.map((ps: any) => ({
                  customer_package_id: newCp.id,
                  service_id: ps.service_id,
                  sessions_total: ps.sessions_count,
                  sessions_used: 0,
                }));
                await supabase.from('customer_package_services').insert(svcRows);
              }
            }
          } catch (pkgErr) {
            console.error('Error creating customer package:', pkgErr);
          }
        }
        
        // If user chose online payment, go to checkout step (transparent)
        if (paymentMethod === 'online') {
          setStep(7); // New step for transparent checkout
          return;
        }
        
        // On-site payment or no payment - show confirmation
        setStep(6);
        toast({
          title: "Agendamento confirmado!",
          description: "Você receberá uma confirmação em breve.",
        });
      }
    } catch (error: any) {
      console.error('Error creating booking:', error);
      toast({
        title: "Erro no agendamento",
        description: error.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaymentSuccess = (paymentData: any) => {
    console.log('Payment successful:', paymentData);
    toast({
      title: "Pagamento aprovado!",
      description: "Seu agendamento foi confirmado.",
    });
    setStep(6); // Go to confirmation
  };

  const handlePaymentError = (error: string) => {
    console.error('Payment error:', error);
    toast({
      title: "Erro no pagamento",
      description: error || "Tente novamente ou escolha outro método.",
      variant: "destructive",
    });
  };

  const handlePaymentPending = (paymentData: any) => {
    console.log('Payment pending:', paymentData);
    toast({
      title: "Pagamento em processamento",
      description: "Aguardando confirmação.",
    });
    setStep(6); // Go to confirmation with pending status
  };

  const TIMEZONE = 'America/Bahia';
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString + 'T00:00:00');
      const todayDate = new Date();
      const tomorrow = new Date(todayDate);
      tomorrow.setDate(todayDate.getDate() + 1);
      
      if (date.toDateString() === todayDate.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Amanhã';
      } else {
        return formatInTimeZone(date, TIMEZONE, "EEE, d 'de' MMM", { locale: ptBR });
      }
    } catch {
      return '';
    }
  };

  const formatBookingDateTime = (booking: any) => {
    if (!booking?.starts_at) return { date: '', time: '' };
    try {
      const startDate = new Date(booking.starts_at);
      const bahiaTime = formatInTimeZone(startDate, TIMEZONE, "yyyy-MM-dd HH:mm", { locale: ptBR });
      const [datePart, timePart] = bahiaTime.split(' ');
      return { date: formatDateForDisplay(datePart), time: timePart };
    } catch {
      return { date: '', time: '' };
    }
  };

  const generateGoogleCalendarUrl = (booking: any) => {
    if (!booking) return '';
    const startDate = new Date(booking.starts_at);
    const endDate = new Date(booking.ends_at);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Barbearia'}`,
      dates: `${fmt(startDate)}/${fmt(endDate)}`,
      details: 'Agendamento confirmado',
      location: tenant?.address || tenant?.name || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  const generateCalendarFile = (booking: any) => {
    if (!booking) return;

    const startDate = new Date(booking.starts_at);
    const endDate = new Date(booking.ends_at);
    
    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };
    
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Booking//Booking Event//EN
BEGIN:VEVENT
UID:booking-${booking.id}@${tenant?.slug || 'barbearia'}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Barbearia'}
DESCRIPTION:Agendamento confirmado
LOCATION:${tenant?.address || tenant?.name || 'Barbearia'}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    // On mobile, try to open directly (iOS/Android will prompt calendar app)
    // On desktop, download the file
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.open(url, '_blank');
    } else {
      const link = document.createElement('a');
      link.href = url;
      link.download = `agendamento-${booking.id}.ics`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const selectedServiceData = services.find(s => s.id === selectedService);
  const selectedStaffData = staff.find(s => s.id === selectedStaff);

  // Calculate total steps based on payment settings
  const totalSteps = allowOnlinePayment && !requirePrepayment ? 5 : 4;
  
  // Step indicator
  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: totalSteps }, (_, i) => i + 1).map((i) => (
        <div key={i} className="flex items-center">
          <div className={`w-2 h-2 rounded-full transition-all duration-300 ${
            step >= i ? 'bg-white' : 'bg-white/20'
          }`} />
          {i < totalSteps && <div className={`w-8 h-px mx-1 transition-all ${step > i ? 'bg-white/50' : 'bg-white/10'}`} />}
        </div>
      ))}
    </div>
  );

  // Tenant not found
  if (tenantNotFound) {
    return <TenantNotFound slug={slug} />;
  }

  // Confirmation Screen
  if (step === 6) {
    const bookingDateTime = formatBookingDateTime(createdBooking);
    
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check className="h-10 w-10 text-emerald-400" strokeWidth={3} />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2">Agendamento confirmado</h1>
          <p className="text-zinc-400 mb-8">Você receberá uma confirmação por WhatsApp</p>
          
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8 text-left">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Serviço</span>
                <span className="font-medium">{createdBooking?.service?.name}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Profissional</span>
                <span className="font-medium">{createdBooking?.staff?.name || 'Qualquer disponível'}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Data e hora</span>
                <span className="font-medium">{bookingDateTime.date} às {bookingDateTime.time}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Valor</span>
                <span className="font-semibold text-emerald-400">
                  {(packageCoveredService || subscriptionCoveredService) ? 'Incluso no plano/pacote' : `R$ ${((createdBooking?.service?.price_cents || 0) / 100).toFixed(2)}`}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <p className="text-xs text-zinc-500 text-center mb-2">Adicionar ao calendário</p>
            <Button 
              onClick={() => window.open(generateGoogleCalendarUrl(createdBooking), '_blank')}
              variant="outline"
              className="w-full h-11 border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-white rounded-xl text-sm"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Adicionar ao Google Calendar
            </Button>
            <Button 
              variant="ghost"
              onClick={resetBooking}
              className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
            >
              Fazer novo agendamento
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Cover Banner + Header */}
      <div className="relative">
        {tenant?.cover_url ? (
          <div className="w-full h-48 sm:h-56 overflow-hidden relative">
            <img
              src={tenant.cover_url}
              alt={`Capa ${tenant.name}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-zinc-950" />
          </div>
        ) : (
          <div className="w-full h-24 bg-gradient-to-br from-zinc-900 to-zinc-950" />
        )}

        {/* Floating header card */}
        <div className="max-w-lg mx-auto px-4">
          <div className={`relative ${tenant?.cover_url ? '-mt-14' : '-mt-4'} bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/60 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/40`}>
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="w-16 h-16 sm:w-18 sm:h-18 flex-shrink-0 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-zinc-700/50 shadow-lg">
                {tenant?.logo_url ? (
                  <img 
                    src={tenant.logo_url} 
                    alt={`Logo ${tenant.name}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Scissors className="h-7 w-7 text-white/80" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <h1 className="font-bold text-lg sm:text-xl truncate">{tenant?.name || "Carregando..."}</h1>
                {tenant?.address && (
                  <p className="text-zinc-400 text-xs sm:text-sm flex items-center gap-1.5 mt-0.5 truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{tenant.address}</span>
                  </p>
                )}
                {tenant?.phone && (
                  <p className="text-zinc-500 text-xs flex items-center gap-1.5 mt-0.5">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {tenant.phone}
                  </p>
                )}
              </div>

            </div>
          </div>

          {/* Action buttons below header */}
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Button
              variant="outline"
              onClick={() => setShowMyPackages(true)}
              className="border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl h-12 text-sm font-medium"
            >
              <Package className="h-4 w-4 mr-2 text-amber-400" />
              Meus Pacotes
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowCustomerBookings(true)}
              className="border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl h-12 text-sm font-medium"
            >
              <CalendarCheck className="h-4 w-4 mr-2 text-emerald-400" />
              Meus Agendamentos
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator />

        {/* Step 1: Select Service or Package */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-6">
              <h2 className="text-xl font-semibold mb-2">Escolha o serviço</h2>
              <p className="text-zinc-500 text-sm">Selecione o que você precisa</p>
            </div>

            {/* Tabs - show when packages or subscription plans exist */}
            {(packages.length > 0 || subscriptionPlans.length > 0) && (
              <div className="flex bg-zinc-900 rounded-xl p-1 mb-6">
                <button
                  onClick={() => setBookingTab('services')}
                  className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                    bookingTab === 'services'
                      ? 'bg-zinc-800 text-white shadow-sm'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  Serviços
                </button>
                {packages.length > 0 && (
                  <button
                    onClick={() => setBookingTab('packages')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      bookingTab === 'packages'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Package className="h-4 w-4 inline mr-1" />
                    Pacotes
                  </button>
                )}
                {subscriptionPlans.length > 0 && (
                  <button
                    onClick={() => setBookingTab('subscriptions')}
                    className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                      bookingTab === 'subscriptions'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <Repeat className="h-4 w-4 inline mr-1" />
                    Assinaturas
                  </button>
                )}
              </div>
            )}
            
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
                <p className="text-zinc-500">Carregando...</p>
              </div>
            ) : bookingTab === 'services' ? (
              <div className="space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service.id)}
                    className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                        {service.photo_url ? (
                          <img 
                            src={service.photo_url} 
                            alt={service.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Scissors className="h-6 w-6 text-zinc-600" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium mb-1 group-hover:text-white transition-colors">{service.name}</h3>
                          <span className="font-semibold text-emerald-400 whitespace-nowrap">
                            R$ {(service.price_cents / 100).toFixed(2)}
                          </span>
                        </div>
                        <p className="text-zinc-500 text-sm line-clamp-2 mb-2">{service.description}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes}min
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : bookingTab === 'subscriptions' ? (
              /* Subscriptions Tab */
              <PublicSubscriptionPlans
                tenant={tenant}
                plans={subscriptionPlans}
              />
            ) : bookingTab === 'packages' ? (
              /* Packages Tab — purchase without forced booking */
              purchasingPackage ? (
                <PackagePurchaseFlow
                  tenant={tenant}
                  pkg={purchasingPackage}
                  onSuccess={() => { setPurchasingPackage(null); }}
                  onCancel={() => setPurchasingPackage(null)}
                  onScheduleNow={() => {
                    // After purchase, go to service selection with first service of package
                    const firstSvc = purchasingPackage.package_services?.[0];
                    if (firstSvc) {
                      setPurchasingPackage(null);
                      handleServiceSelect(firstSvc.service_id);
                    } else {
                      setPurchasingPackage(null);
                    }
                  }}
                />
              ) : (
                <div className="space-y-3">
                  {packages.map((pkg: any) => (
                    <button
                      key={pkg.id}
                      onClick={() => setPurchasingPackage(pkg)}
                      className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Package className="h-4 w-4 text-emerald-400 shrink-0" />
                            <h3 className="font-medium group-hover:text-white transition-colors">{pkg.name}</h3>
                          </div>
                          <div className="space-y-1">
                            {(pkg.package_services || []).map((ps: any) => (
                              <div key={ps.id || ps.service_id} className="flex items-center gap-2 text-sm text-zinc-400">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/50 shrink-0" />
                                <span className="truncate">{ps.service?.name}</span>
                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 shrink-0">{ps.sessions_count}x</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                        <span className="font-semibold text-emerald-400 whitespace-nowrap text-lg">
                          R$ {(pkg.price_cents / 100).toFixed(0)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )
            ) : null}
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Escolha o profissional</h2>
              <p className="text-zinc-500 text-sm">Quem você prefere?</p>
            </div>
            
            <div className="space-y-3">
              {/* Any option */}
              <button
                onClick={() => handleStaffSelect("any")}
                className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-white transition-colors">Qualquer disponível</h3>
                    <p className="text-zinc-500 text-sm">Primeiro horário livre</p>
                  </div>
                </div>
              </button>

              {staff.map((member) => (
                <button
                  key={member.id}
                  onClick={() => handleStaffSelect(member.id)}
                  className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
                >
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: `${member.color}20` }}
                    >
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name} className="w-full h-full object-cover" />
                      ) : (
                        <User className="h-5 w-5" style={{ color: member.color }} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium group-hover:text-white transition-colors">{member.name}</h3>
                      {member.bio && <p className="text-zinc-500 text-sm line-clamp-1">{member.bio}</p>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            
            <button
              onClick={goToPreviousStep}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mt-8 mx-auto transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Escolha o horário</h2>
              <p className="text-zinc-500 text-sm">Selecione data e hora</p>
            </div>
            
            {/* Mini summary */}
            <div className="flex items-center gap-3 p-3 bg-zinc-900/30 border border-zinc-800/50 rounded-xl mb-6">
              <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center">
                <Scissors className="h-4 w-4 text-zinc-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedServiceData?.name}</p>
                <p className="text-zinc-500 text-xs">
                  {selectedStaffData?.name || 'Qualquer profissional'} • {selectedServiceData?.duration_minutes}min
                </p>
              </div>
              <span className="text-emerald-400 font-medium text-sm">
                R$ {((selectedServiceData?.price_cents || 0) / 100).toFixed(0)}
              </span>
            </div>
            
            {/* Calendar */}
            <div className="mb-6">
              <CalendarRac
                value={selectedCalendarDate}
                onChange={handleDateSelect}
                minValue={today(getLocalTimeZone())}
                maxValue={maxAdvanceDays > 0 ? today(getLocalTimeZone()).add({ days: maxAdvanceDays }) : undefined}
                isDateUnavailable={(date) => {
                  const dateStr = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
                  return blockedDates.has(dateStr);
                }}
                className="w-full [&_.rdp]:w-full [&_.rdp-months]:w-full [&_.rdp-month]:w-full [&_.rdp-table]:w-full"
              />
            </div>
            
            {/* Time slots */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-4">
                {selectedDate ? formatDateForDisplay(selectedDate) : 'Selecione uma data'}
              </h3>
              
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
                </div>
              ) : allTimeSlots.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  <Clock className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">{selectedDate ? "Nenhum horário disponível" : "Selecione uma data"}</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {allTimeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={slot.available ? () => handleTimeSelect(slot.time) : undefined}
                      disabled={!slot.available}
                      className={`py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        slot.available 
                          ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800 text-white' 
                          : 'bg-zinc-900/30 text-zinc-700 cursor-not-allowed line-through'
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            <button
              onClick={goToPreviousStep}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mt-8 mx-auto transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        )}

        {/* Step 4: Payment Method Selection (only if online payment enabled but not required) */}
        {step === 4 && allowOnlinePayment && !requirePrepayment && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Como deseja pagar?</h2>
              <p className="text-zinc-500 text-sm">Escolha a forma de pagamento</p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => handlePaymentMethodSelect('on_site')}
                className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-center">
                    <Banknote className="h-5 w-5 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-white transition-colors">Pagar no local</h3>
                    <p className="text-zinc-500 text-sm">Pague ao chegar na barbearia</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => handlePaymentMethodSelect('online')}
                className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-medium group-hover:text-white transition-colors">Pagar online</h3>
                    <p className="text-zinc-500 text-sm">Pague agora via Pix ou cartão</p>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={goToPreviousStep}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mt-8 mx-auto transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        )}

        {/* Step 5: Contact Info */}
        {step === 5 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Seus dados</h2>
              <p className="text-zinc-500 text-sm">Para confirmar o agendamento</p>
            </div>
            
            {/* Summary */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl mb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Scissors className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{selectedServiceData?.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {selectedStaffData?.name || 'Qualquer profissional'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-400">{formatDateForDisplay(selectedDate)}</span>
                  <span className="text-zinc-600">•</span>
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-400">{selectedTime}</span>
                </div>
                <span className="text-emerald-400 font-semibold">
                  {packageCoveredService ? 'Pacote' : selectedPackage 
                    ? `R$ ${(selectedPackage.price_cents / 100).toFixed(0)}`
                    : `R$ ${((selectedServiceData?.price_cents || 0) / 100).toFixed(0)}`
                  }
                </span>
              </div>
              {paymentMethod && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-800 text-sm">
                  {paymentMethod === 'online' ? (
                    <>
                      <CreditCard className="h-4 w-4 text-emerald-400" />
                      <span className="text-zinc-400">Pagamento online</span>
                    </>
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 text-amber-400" />
                      <span className="text-zinc-400">Pagamento no local</span>
                    </>
                  )}
                </div>
              )}
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone first — enables auto-fill for returning customers */}
              <div>
                <label className="block text-sm text-zinc-400 mb-2">WhatsApp *</label>
                <div className="relative">
                  <Input
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => {
                      const formatted = formatPhoneInput(e.target.value);
                      setCustomerPhone(formatted);
                      setCustomerFound(false);
                      setCustomerName('');
                      setCustomerEmail('');
                      setCustomerBirthday('');
                      const digits = formatted.replace(/\D/g, '');
                      if (digits.length >= 10) {
                        lookupCustomerByPhone(formatted);
                        checkActivePackage(formatted);
                        checkActiveSubscription(formatted);
                      }
                    }}
                    required
                    maxLength={15}
                    className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                  />
                  {lookingUpCustomer && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-zinc-500" />
                    </div>
                  )}
                </div>
              </div>

              {/* Returning customer banner */}
              {customerFound && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Bem-vindo de volta, {customerName}!</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Seus dados foram preenchidos automaticamente.
                  </p>
                </div>
              )}

              {/* Active package detected banner */}
              {packageCoveredService && activeCustomerPackage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Check className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">Pacote ativo detectado!</span>
                  </div>
                  <p className="text-xs text-zinc-400">
                    Sessões restantes: {activeCustomerPackage.serviceUsage.sessions_total - activeCustomerPackage.serviceUsage.sessions_used}. 
                    O pagamento será dispensado.
                  </p>
                </div>
              )}

              {/* Active subscription detected banner */}
              {activeSubscription && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <div className="flex items-center gap-2 mb-1">
                    <Repeat className="h-4 w-4 text-emerald-400" />
                    <span className="text-sm font-medium text-emerald-400">
                      Assinante — {activeSubscription.plan?.name}
                    </span>
                  </div>
                  {subscriptionCoveredService ? (
                    <p className="text-xs text-zinc-400">
                      Incluso no plano{activeSubscription.usage?.limit != null
                        ? ` (${activeSubscription.usage.used}/${activeSubscription.usage.limit} sessões usadas)`
                        : ' (ilimitado)'}. Pagamento dispensado.
                    </p>
                  ) : (
                    <p className="text-xs text-zinc-400">
                      {activeSubscription.usage?.limit != null && activeSubscription.usage.used >= activeSubscription.usage.limit
                        ? 'Limite de sessões atingido — será cobrado valor avulso.'
                        : 'Este serviço não está incluso no seu plano.'}
                    </p>
                  )}
                </div>
              )}

              {!customerFound && customerPhone.replace(/\D/g, '').length >= 10 && !lookingUpCustomer && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-3 bg-zinc-800/30 border border-zinc-700/40 rounded-xl">
                    <p className="text-xs text-zinc-400">
                      Não encontramos um cadastro com esse número. Preencha seus dados abaixo.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Nome completo *</label>
                    <Input
                      placeholder="Seu nome"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                      className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">E-mail *</label>
                    <Input
                      type="email"
                      placeholder="seu@email.com"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      required
                      className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-zinc-400 mb-2">Data de Nascimento *</label>
                    <Input
                      type="date"
                      value={customerBirthday}
                      onChange={(e) => setCustomerBirthday(e.target.value)}
                      required
                      className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                    />
                  </div>
                </div>
              )}



              
              <div className="pt-4 space-y-3">
                <Button 
                  type="submit" 
                  disabled={submitting || !customerName || !customerPhone || (!customerFound && (!customerEmail || !customerBirthday))}
                  className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium disabled:opacity-50"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Confirmando...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Confirmar agendamento
                    </>
                  )}
                </Button>
                
                <button
                  type="button"
                  onClick={goToPreviousStep}
                  className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Step 7: Transparent Checkout (Online Payment) */}
        {step === 7 && createdBooking && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Pagamento</h2>
              <p className="text-zinc-500 text-sm">Finalize seu agendamento</p>
            </div>
            
            {/* Booking Summary */}
            <div className="p-4 bg-zinc-900/30 border border-zinc-800/50 rounded-xl mb-6">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-lg flex items-center justify-center shrink-0">
                  <Scissors className="h-4 w-4 text-zinc-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{createdBooking.service?.name}</p>
                  <p className="text-zinc-500 text-xs">
                    {createdBooking.staff?.name || 'Qualquer profissional'}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-400">{formatDateForDisplay(selectedDate)}</span>
                  <span className="text-zinc-600">•</span>
                  <Clock className="h-4 w-4 text-zinc-500" />
                  <span className="text-zinc-400">{selectedTime}</span>
                </div>
              </div>
            </div>

            {/* MercadoPago Checkout */}
            <MercadoPagoCheckout
              bookingId={createdBooking.id}
              tenantSlug={slug || ''}
              amount={selectedPackage 
                ? (selectedPackage.price_cents / 100) 
                : (createdBooking.service?.price_cents || 0) / 100
              }
              serviceName={selectedPackage 
                ? selectedPackage.name 
                : (createdBooking.service?.name || 'Serviço')
              }
              payer={{
                email: customerEmail || 'cliente@email.com',
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onPending={handlePaymentPending}
              customerPackageId={createdCustomerPackageId || undefined}
              packageAmountCents={selectedPackage ? selectedPackage.price_cents : undefined}
            />
            
            <button
              onClick={() => setStep(5)}
              className="flex items-center gap-2 text-zinc-500 hover:text-white mt-6 mx-auto transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar
            </button>
          </div>
        )}
      </div>
      
      {/* Customer Bookings Modal */}
      {tenant && (
        <CustomerBookingsModal
          open={showCustomerBookings}
          onOpenChange={setShowCustomerBookings}
          tenantId={tenant.id}
          tenantName={tenant.name}
        />
      )}

      {/* My Packages Modal */}
      {tenant && (
        <MyPackagesSection
          open={showMyPackages}
          onOpenChange={setShowMyPackages}
          tenant={tenant}
          slug={slug || ''}
        />
      )}
    </div>
  );
};

export default BookingPublic;
