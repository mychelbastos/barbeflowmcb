import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar as CalendarRac } from "@/components/ui/calendar-rac";
import { MercadoPagoCheckout } from "@/components/MercadoPagoCheckout";
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
  Banknote
} from "lucide-react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";
import type { DateValue } from "react-aria-components";

type PaymentMethod = 'on_site' | 'online' | null;

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
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  
  // Payment related states
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(null);
  const [allowOnlinePayment, setAllowOnlinePayment] = useState(false);
  const [requirePrepayment, setRequirePrepayment] = useState(false);
  const [prepaymentPercentage, setPrepaymentPercentage] = useState(0);

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
        toast({
          title: "Barbearia não encontrada",
          description: "Verifique o link e tente novamente.",
          variant: "destructive",
        });
        return;
      }

      setTenant(tenantData);
      
      // Extract payment settings
      const settings = (tenantData.settings || {}) as Record<string, any>;
      setAllowOnlinePayment(settings.allow_online_payment || false);
      setRequirePrepayment(settings.require_prepayment || false);
      setPrepaymentPercentage(settings.prepayment_percentage || 0);

      const [servicesRes, staffRes] = await Promise.all([
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
          .order('name')
      ]);

      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
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
    setNotes('');
    setCreatedBooking(null);
    setAvailableSlots([]);
    setOccupiedSlots([]);
    setAllTimeSlots([]);
    setPaymentMethod(null);
    setStep(1);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenant || !selectedService || !selectedDate || !selectedTime || !customerName || !customerPhone) {
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
      
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          slug: slug,
          service_id: selectedService,
          staff_id: selectedStaff,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || undefined,
          starts_at: startsAt.toISOString(),
          notes: notes || undefined,
          payment_method: paymentMethod === 'online' ? 'online' : 'onsite',
        },
      });

      if (error) throw error;

      if (data.success) {
        const booking = data.booking;
        setCreatedBooking(booking);
        
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
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `agendamento-${booking.id}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
                  R$ {((createdBooking?.service?.price_cents || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => generateCalendarFile(createdBooking)}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Adicionar ao calendário
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
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl flex items-center justify-center overflow-hidden">
              {tenant?.logo_url ? (
                <img 
                  src={tenant.logo_url} 
                  alt={`Logo ${tenant.name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Scissors className="h-6 w-6 text-white/80" />
              )}
            </div>
            <div>
              <h1 className="font-semibold text-lg">{tenant?.name || "Carregando..."}</h1>
              {tenant?.address && (
                <p className="text-zinc-500 text-sm flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {tenant.address}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <StepIndicator />

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div className="animate-in fade-in duration-300">
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold mb-2">Escolha o serviço</h2>
              <p className="text-zinc-500 text-sm">Selecione o que você precisa</p>
            </div>
            
            {loading ? (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-zinc-500 mb-4" />
                <p className="text-zinc-500">Carregando serviços...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service.id)}
                    className="w-full p-4 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all duration-200 hover:bg-zinc-900 group"
                  >
                    <div className="flex items-start gap-4">
                      {/* Service Image */}
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
            )}
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
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${member.color}20` }}
                    >
                      <User className="h-5 w-5" style={{ color: member.color }} />
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
                    <p className="text-zinc-500 text-sm">Pague agora via Mercado Pago</p>
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
                  R$ {((selectedServiceData?.price_cents || 0) / 100).toFixed(0)}
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
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Nome completo</label>
                <Input
                  placeholder="Seu nome"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  required
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">WhatsApp</label>
                <Input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  required
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">E-mail <span className="text-zinc-600">(opcional)</span></label>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  className="h-12 bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600"
                />
              </div>
              
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Observações <span className="text-zinc-600">(opcional)</span></label>
                <Textarea
                  placeholder="Alguma observação?"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  className="bg-zinc-900/50 border-zinc-800 rounded-xl focus:border-zinc-600 placeholder:text-zinc-600 resize-none"
                />
              </div>
              
              <div className="pt-4 space-y-3">
                <Button 
                  type="submit" 
                  disabled={submitting || !customerName || !customerPhone}
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
              amount={(createdBooking.service?.price_cents || 0) / 100}
              serviceName={createdBooking.service?.name || 'Serviço'}
              payer={{
                email: customerEmail || 'cliente@email.com',
              }}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              onPending={handlePaymentPending}
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
    </div>
  );
};

export default BookingPublic;
