import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isCustomDomain } from "@/lib/hostname";
import { useToast } from "@/hooks/use-toast";
import { TenantNotFound } from "@/components/TenantNotFound";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PackagePurchaseFlow } from "@/components/public/PackagePurchaseFlow";
import { BenefitBadge } from "@/components/public/BenefitBadge";

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
  const [searchParams] = useSearchParams();
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
  const [customerCpf, setCustomerCpf] = useState('');
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
  const initialTab = searchParams.get('tab') as BookingTab | null;
  const [bookingTab, setBookingTab] = useState<BookingTab>(
    initialTab && ['services', 'packages', 'subscriptions'].includes(initialTab) ? initialTab : 'services'
  );
  const [selectedPackage, setSelectedPackage] = useState<any>(null);
  const [activeCustomerPackage, setActiveCustomerPackage] = useState<any>(null);
  const [packageCoveredService, setPackageCoveredService] = useState(false);
  const [createdCustomerPackageId, setCreatedCustomerPackageId] = useState<string | null>(null);

  // Subscriptions
  const [subscriptionPlans, setSubscriptionPlans] = useState<any[]>([]);
  const [activeSubscription, setActiveSubscription] = useState<any>(null);
  const [subscriptionCoveredService, setSubscriptionCoveredService] = useState(false);
  const [subscriptionAllowedStaff, setSubscriptionAllowedStaff] = useState<string[]>([]);
  
  // Benefits map for service cards display
  const [benefitsMap, setBenefitsMap] = useState<Map<string, any>>(new Map());
  
  // Early identification
  const [earlyPhone, setEarlyPhone] = useState('');
  const [earlyIdentified, setEarlyIdentified] = useState(false);
  const [earlyIdentifiedName, setEarlyIdentifiedName] = useState('');
  const [earlyLoading, setEarlyLoading] = useState(false);
  const [forcedOnlinePayment, setForcedOnlinePayment] = useState(false);

  useEffect(() => {
    if (isCustomDomain()) {
      loadTenantByCustomDomain();
    } else if (slug) {
      loadTenantData();
    }
  }, [slug]);

  const loadTenantByCustomDomain = async () => {
    try {
      setLoading(true);
      const host = window.location.hostname;
      const { data: tenantData, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("custom_domain", host)
        .single();

      if (error || !tenantData) {
        setTenantNotFound(true);
        return;
      }

      await loadTenantDataFromRecord(tenantData);
    } catch (err) {
      console.error("Error loading by custom domain:", err);
      setTenantNotFound(true);
    } finally {
      setLoading(false);
    }
  };

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

      await loadTenantDataFromRecord(tenantData);
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

  const loadTenantDataFromRecord = async (tenantData: any) => {
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
      
      supabase
        .from('blocks')
        .select('starts_at, ends_at, staff_id')
        .eq('tenant_id', tenantData.id)
        .gte('ends_at', new Date().toISOString())
    ]);

    if (servicesRes.error) throw servicesRes.error;
    if (staffRes.error) throw staffRes.error;
    
    const blocked = new Set<string>();
    if (blocksRes.data) {
      for (const block of blocksRes.data) {
        const startDate = new Date(block.starts_at);
        const endDate = new Date(block.ends_at);
        const isFullDay = startDate.getHours() === 0 && startDate.getMinutes() === 0 && 
                          endDate.getHours() === 23 && endDate.getMinutes() >= 59;
        if (isFullDay && block.staff_id === null) {
          blocked.add(startDate.toISOString().split('T')[0]);
        }
      }
    }
    setBlockedDates(blocked);
    setServices(servicesRes.data || []);
    setStaff(staffRes.data || []);

    const { data: pkgsData } = await supabase
      .from("service_packages")
      .select("*")
      .eq("tenant_id", tenantData.id)
      .eq("active", true)
      .eq("public", true)
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

    const { data: subPlansData } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("tenant_id", tenantData.id)
      .eq("active", true)
      .eq("public", true)
      .order("name");

    if (subPlansData && subPlansData.length > 0) {
      const planIds = subPlansData.map(p => p.id);
      const [{ data: planSvcs }, { data: planStaffData }] = await Promise.all([
        supabase.from("subscription_plan_services").select("*, service:services(name)").in("plan_id", planIds),
        supabase.from("subscription_plan_staff").select("plan_id, staff_id").in("plan_id", planIds),
      ]);
      for (const plan of subPlansData) {
        (plan as any).plan_services = (planSvcs || []).filter((ps: any) => ps.plan_id === plan.id);
        (plan as any).plan_staff = (planStaffData || []).filter((ps: any) => ps.plan_id === plan.id);
      }
      setSubscriptionPlans(subPlansData);
    } else {
      setSubscriptionPlans([]);
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
    setSelectedTime(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    
    // Check if this service is covered by an active benefit from early identification
    const benefit = benefitsMap.get(serviceId);
    if (benefit?.type === 'subscription') {
      setSubscriptionCoveredService(true);
      setActiveSubscription({ id: benefit.customerSubscriptionId, usage: { used: benefit.used, limit: benefit.limit } });
      setSubscriptionAllowedStaff(benefit.allowedStaffIds || []);
      setActiveCustomerPackage(null);
      setPackageCoveredService(false);
    } else if (benefit?.type === 'package') {
      setPackageCoveredService(true);
      setActiveCustomerPackage({ id: benefit.customerPackageId, serviceUsage: { sessions_total: benefit.total, sessions_used: benefit.total - benefit.remaining } });
      setSubscriptionCoveredService(false);
      setSubscriptionAllowedStaff([]);
      setActiveSubscription(null);
    } else {
      setActiveCustomerPackage(null);
      setPackageCoveredService(false);
      setSubscriptionCoveredService(false);
      setSubscriptionAllowedStaff([]);
      setActiveSubscription(null);
    }
    
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
      // Use edge function to find customer and get benefits (bypasses RLS for anonymous users)
      const { data: benefitsData, error: benefitsErr } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'benefits', phone: canonical, tenant_id: tenant.id },
      });

      if (benefitsErr || !benefitsData?.customer_id) {
        setActiveCustomerPackage(null);
        setPackageCoveredService(false);
        return;
      }

      const custPkgs = benefitsData.packages || [];

      if (custPkgs.length === 0) {
        setActiveCustomerPackage(null);
        setPackageCoveredService(false);
        return;
      }

      // Check customer_package_services for remaining sessions
      for (const cp of custPkgs) {
        const svc = (cp.services || []).find((s: any) => s.service_id === selectedService);
        if (svc && svc.sessions_used < svc.sessions_total) {
          setActiveCustomerPackage({
            ...cp,
            serviceUsage: svc,
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
      // Use edge function to find customer and get benefits (bypasses RLS for anonymous users)
      const { data: benefitsData, error: benefitsErr } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'benefits', phone: canonical, tenant_id: tenant.id },
      });

      if (benefitsErr || !benefitsData?.customer_id) {
        setActiveSubscription(null);
        setSubscriptionCoveredService(false);
        return;
      }

      const subs = benefitsData.subscriptions || [];

      if (subs.length === 0) {
        setActiveSubscription(null);
        setSubscriptionCoveredService(false);
        return;
      }

      const activeSub = subs[0];

      // Check if selected service is covered by the plan
      const planService = (activeSub.plan_services || []).find((ps: any) => ps.service_id === selectedService);

      if (!planService) {
        setActiveSubscription(activeSub);
        setSubscriptionCoveredService(false);
        return;
      }

      // Check usage from the subscription data
      const todayStr = new Date().toISOString().split('T')[0];
      const currentUsage = (activeSub.usage || []).find((u: any) => 
        u.service_id === selectedService && u.period_start <= todayStr && u.period_end >= todayStr
      );

      const sessionsUsed = currentUsage?.sessions_used || 0;
      const sessionsLimit = currentUsage?.sessions_limit ?? planService.sessions_per_cycle;

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

  // Fetch all benefits for the customer (for service card badges)
  const fetchCustomerBenefits = async (phone: string) => {
    if (!tenant) return;
    const canonical = canonicalPhone(phone);
    if (canonical.length < 10) return;

    try {
      // Use edge function to bypass RLS for anonymous users
      const { data: benefitsData, error: benefitsErr } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'benefits', phone: canonical, tenant_id: tenant.id },
      });

      if (benefitsErr || !benefitsData?.customer_id) {
        setBenefitsMap(new Map());
        return;
      }

      const map = new Map();
      (benefitsData.packages || []).forEach((pkg: any) => {
        (pkg.services || []).forEach((svc: any) => {
          const remaining = svc.sessions_total - svc.sessions_used;
          if (remaining > 0) map.set(svc.service_id, { type: 'package' as const, remaining, total: svc.sessions_total, customerPackageId: pkg.id });
        });
      });
      const todayStr = new Date().toISOString().split('T')[0];
      (benefitsData.subscriptions || []).forEach((sub: any) => {
        const allowedStaffIds = (sub.plan_staff || []).map((ps: any) => ps.staff_id);
        
        // First, map services from usage records (active period)
        const usageMapped = new Set<string>();
        (sub.usage || []).forEach((u: any) => {
          if (u.period_start <= todayStr && u.period_end >= todayStr) {
            usageMapped.add(u.service_id);
            const remaining = u.sessions_limit === null ? null : u.sessions_limit - u.sessions_used;
            if (remaining === null || remaining > 0) {
              map.set(u.service_id, { type: 'subscription' as const, remaining, limit: u.sessions_limit, used: u.sessions_used, customerSubscriptionId: sub.id, allowedStaffIds });
            }
          }
        });
        // Then, map plan_services that don't have usage records yet (no bookings made)
        (sub.plan_services || []).forEach((ps: any) => {
          if (!usageMapped.has(ps.service_id) && !map.has(ps.service_id)) {
            const limit = ps.sessions_per_cycle ?? null;
            map.set(ps.service_id, { type: 'subscription' as const, remaining: limit, limit, used: 0, customerSubscriptionId: sub.id, allowedStaffIds });
          }
        });
      });
      setBenefitsMap(map);
    } catch (err) {
      console.error('Error fetching benefits:', err);
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
    
    // If covered by benefit, skip payment entirely
    if (packageCoveredService || subscriptionCoveredService) {
      setPaymentMethod('on_site');
      setStep(5);
      return;
    }
    
    // If forced online payment (risk policy), force online
    if (forcedOnlinePayment && allowOnlinePayment) {
      setPaymentMethod('online');
      setStep(5);
      return;
    }
    
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
    setCustomerCpf('');
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
    setEarlyPhone('');
    setEarlyIdentified(false);
    setEarlyIdentifiedName('');
    setBenefitsMap(new Map());
    setForcedOnlinePayment(false);
    setStep(1);
  };

  // Early identification: lookup customer and load benefits for service badges
  const handleEarlyIdentification = async (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, '');
    if (digits.length < 10 || !tenant) return;
    
    setEarlyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { action: 'lookup', phone: digits, tenant_id: tenant.id },
      });
      
      if (error) throw error;
      
      if (data?.found && data.customer) {
        setEarlyIdentified(true);
        setEarlyIdentifiedName(data.customer.name);
        // Pre-fill contact info for later
        setCustomerPhone(phoneValue);
        setCustomerName(data.customer.name);
        setCustomerEmail(data.customer.email || '');
        setCustomerBirthday(data.customer.birthday || '');
        setCustomerFound(true);
        setForcedOnlinePayment(data.customer.forced_online_payment || false);
        // Fetch benefits to show badges
        await fetchCustomerBenefits(digits);
      } else {
        // Not registered — save phone, user will fill rest at step 5
        setEarlyIdentified(true);
        setEarlyIdentifiedName('');
        setCustomerPhone(phoneValue);
        setCustomerFound(false);
        setBenefitsMap(new Map());
      }
    } catch (err) {
      console.error('Error in early identification:', err);
    } finally {
      setEarlyLoading(false);
    }
  };

  // Format phone for display
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
        setForcedOnlinePayment(data.customer.forced_online_payment || false);
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
      text: `${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Estabelecimento'}`,
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
UID:booking-${booking.id}@${tenant?.slug || 'modogestor'}
DTSTAMP:${formatICSDate(new Date())}
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Estabelecimento'}
DESCRIPTION:Agendamento confirmado
LOCATION:${tenant?.address || tenant?.name || 'Estabelecimento'}
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

          {/* Action button below header */}
          <div className="mt-3">
            <Button
              variant="outline"
              onClick={() => setShowCustomerBookings(true)}
              className="w-full border-zinc-700/60 bg-zinc-900/40 text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-xl h-12 text-sm font-medium"
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
              <div className="space-y-4 py-4">
                <div className="h-5 w-48 bg-zinc-800 rounded-md animate-pulse mx-auto" />
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-4">
                      <div className="w-14 h-14 bg-zinc-800 rounded-xl animate-pulse shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                        <div className="h-3 w-20 bg-zinc-800/60 rounded animate-pulse" />
                      </div>
                      <div className="h-4 w-16 bg-zinc-800 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              </div>
            ) : bookingTab === 'services' ? (
              <div className="space-y-3">
              {/* Early phone identification */}
                <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl">
                  {earlyIdentified ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <Check className="h-4 w-4 text-emerald-400" />
                          </div>
                          <div>
                          <p className="text-sm font-medium text-white">
                              {earlyIdentifiedName ? `Olá, ${earlyIdentifiedName}!` : 'Bem-vindo!'}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {earlyIdentifiedName 
                                ? (benefitsMap.size > 0 
                                    ? 'Seus benefícios estão visíveis abaixo' 
                                    : 'Nenhum pacote ou assinatura ativa')
                                : 'Primeira vez? Seus dados serão preenchidos ao finalizar'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setEarlyPhone('');
                            setEarlyIdentified(false);
                            setEarlyIdentifiedName('');
                            setBenefitsMap(new Map());
                            setCustomerFound(false);
                          }}
                          className="text-xs text-zinc-500 hover:text-zinc-300 underline"
                        >
                          Trocar
                        </button>
                      </div>
                      {benefitsMap.size === 0 && (
                        <p className="text-xs text-zinc-500 mt-2 pl-10">
                          Selecione um serviço abaixo para agendar normalmente.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-zinc-400 mb-2">
                        <User className="h-3 w-3 inline mr-1" />
                        Informe seu telefone para identificação
                      </p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="(11) 99999-9999"
                          value={earlyPhone}
                          onChange={(e) => {
                            const formatted = formatPhoneInput(e.target.value);
                            setEarlyPhone(formatted);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleEarlyIdentification(earlyPhone);
                            }
                          }}
                          className="bg-zinc-800 border-zinc-700 text-white text-sm h-9"
                          maxLength={15}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEarlyIdentification(earlyPhone)}
                          disabled={earlyLoading || earlyPhone.replace(/\D/g, '').length < 10}
                          className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 h-9 px-3 shrink-0"
                        >
                          {earlyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Sort: services with benefits first */}
                {[...services].sort((a, b) => {
                  const aHas = benefitsMap.has(a.id) ? 0 : 1;
                  const bHas = benefitsMap.has(b.id) ? 0 : 1;
                  return aHas - bHas;
                }).map((service) => {
                  const benefit = benefitsMap.get(service.id);
                  return (
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
                          {benefit ? (
                            <span className="font-semibold text-amber-400 whitespace-nowrap text-xs">
                              R$ 0,00
                            </span>
                          ) : (
                            <span className="font-semibold text-emerald-400 whitespace-nowrap">
                              R$ {(service.price_cents / 100).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <p className="text-zinc-500 text-sm line-clamp-2 mb-2">{service.description}</p>
                        <div className="flex items-center gap-3 text-xs text-zinc-600">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {service.duration_minutes}min
                          </span>
                        </div>
                        {benefit && (
                          <div className="mt-2">
                            <BenefitBadge
                              type={benefit.type}
                              remaining={benefit.remaining}
                              label={
                                benefit.type === 'package'
                                  ? `Incluso no pacote (${benefit.remaining} restante${benefit.remaining !== 1 ? 's' : ''} de ${benefit.total})`
                                  : benefit.remaining === null
                                    ? `Incluso no plano (ilimitado)`
                                    : `Incluso no plano (${benefit.remaining} restante${benefit.remaining !== 1 ? 's' : ''} de ${benefit.limit})`
                              }
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                  );
                })}
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
              {/* Any option - only show if no staff restriction or multiple allowed */}
              {(subscriptionAllowedStaff.length === 0 || subscriptionAllowedStaff.length > 1) && (
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
              )}

              {(subscriptionAllowedStaff.length > 0
                ? staff.filter(m => subscriptionAllowedStaff.includes(m.id))
                : staff
              ).map((member) => (
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
                {(subscriptionCoveredService || packageCoveredService) 
                  ? 'R$ 0' 
                  : `R$ ${((selectedServiceData?.price_cents || 0) / 100).toFixed(0)}`}
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
              {!forcedOnlinePayment && (
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
                      <p className="text-zinc-500 text-sm">Pague ao chegar no estabelecimento</p>
                    </div>
                  </div>
                </button>
              )}

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
              
              {forcedOnlinePayment && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  <p className="text-amber-400 text-xs text-center">⚠️ Pagamento antecipado obrigatório para este cliente.</p>
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
                  {(subscriptionCoveredService || packageCoveredService) 
                    ? 'Incluso no plano' 
                    : selectedPackage 
                      ? `R$ ${(selectedPackage.price_cents / 100).toFixed(0)}`
                      : `R$ ${((selectedServiceData?.price_cents || 0) / 100).toFixed(0)}`
                  }
                </span>
              </div>
              {paymentMethod && !subscriptionCoveredService && !packageCoveredService && (
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
                        fetchCustomerBenefits(formatted);
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

              {!customerFound && customerPhone.replace(/\D/g, '').length >= 10 && !lookingUpCustomer && !customerName && (
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

              {/* CPF — only required for online payment */}
              {paymentMethod === 'online' && customerPhone.replace(/\D/g, '').length >= 10 && !lookingUpCustomer && (
                <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <label className="block text-sm text-zinc-400 mb-2">CPF *</label>
                  <Input
                    placeholder="000.000.000-00"
                    value={customerCpf}
                    onChange={(e) => setCustomerCpf(formatCpfInput(e.target.value))}
                    inputMode="numeric"
                    maxLength={14}
                    className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                  />
                  {customerCpf.replace(/\D/g, '').length === 11 && !isValidCpf(customerCpf) && (
                    <p className="text-xs text-red-400 mt-1">CPF inválido</p>
                  )}
                </div>
              )}


              <div className="pt-4 space-y-3">
                <Button 
                  type="submit" 
                  disabled={submitting || !customerName || !customerPhone || (!customerFound && (!customerEmail || !customerBirthday)) || (paymentMethod === 'online' && (!customerCpf || !isValidCpf(customerCpf)))}
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
                identification: customerCpf.replace(/\D/g, '').length === 11 
                  ? { type: 'CPF', number: customerCpf.replace(/\D/g, '') } 
                  : undefined,
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
