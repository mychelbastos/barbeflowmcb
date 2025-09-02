import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Calendar as CalendarRac } from "@/components/ui/calendar-rac";
import { 
  Calendar, 
  Clock, 
  Scissors, 
  Star, 
  MapPin, 
  Phone, 
  Mail,
  User,
  CheckCircle,
  Loader2,
  X
} from "lucide-react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import { formatInTimeZone } from "date-fns-tz";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateValue } from "react-aria-components";

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
  
  // Form data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [createdBooking, setCreatedBooking] = useState<any>(null);

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
      
      // Get tenant by slug
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

      // Load services and staff
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
      console.log('Loading slots for:', {
        tenant_id: tenant.id,
        service_id: selectedService,
        staff_id: selectedStaff || null,
        date: selectedDate
      });
      
      const { data, error } = await supabase.functions.invoke('get-available-slots', {
        body: {
          tenant_id: tenant.id,
          service_id: selectedService,
          staff_id: selectedStaff || null,
          date: selectedDate,
        },
      });

      if (error) {
        console.error('Error from function:', error);
        throw error;
      }
      
      console.log('Received slots data:', data);
      
      // Separate available and occupied slots
      const available = data.available_slots || [];
      const occupied = data.occupied_slots || [];
      
      setAvailableSlots(available);
      setOccupiedSlots(occupied);
      
      // Create combined list for display
      const allSlots = [...available.map((slot: any) => ({ ...slot, available: true }))];
      
      // Add occupied slots if they exist
      if (occupied.length > 0) {
        occupied.forEach((occupiedSlot: any) => {
          const isAlreadyInList = allSlots.some(slot => slot.time === occupiedSlot.time);
          if (!isAlreadyInList) {
            allSlots.push({ ...occupiedSlot, available: false });
          }
        });
      }
      
      // Sort all slots by time
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
    
    // Set default date to tomorrow if today is too late
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
    
    // Set default date if not already set
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
    setStep(4);
  };

  const goToNextStep = () => {
    setStep(prev => Math.min(prev + 1, 5));
  };

  const goToPreviousStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
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
      
      // Combine date and time into ISO string for starts_at
      const [hours, minutes] = selectedTime.split(':');
      
      // Parse the selected date properly to avoid timezone issues
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startsAt = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log('Submitting booking with:', {
        slug: slug,
        service_id: selectedService,
        staff_id: selectedStaff,
        customer_name: customerName,
        customer_phone: customerPhone,
        starts_at: startsAt.toISOString(),
        selected_date_string: selectedDate,
        selected_time: selectedTime,
        constructed_date: startsAt
      });
      
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
        },
      });

      if (error) throw error;

      if (data.success) {
        setCreatedBooking(data.booking);
        setStep(5);
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

  // Format dates and times consistently with timezone
  const TIMEZONE = 'America/Bahia';
  
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return 'Data não disponível';
    
    try {
      const date = new Date(dateString + 'T00:00:00');
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Hoje';
      } else if (date.toDateString() === tomorrow.toDateString()) {
        return 'Amanhã';
      } else {
        return formatInTimeZone(date, TIMEZONE, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
      }
    } catch (error) {
      console.error('Error formatting date:', error);
      return 'Data inválida';
    }
  };

  const formatTimeForDisplay = (time: string) => {
    if (!time) return 'Horário não disponível';
    return time;
  };

  const formatBookingDateTime = (booking: any) => {
    if (!booking?.starts_at) return { date: 'Data não disponível', time: 'Horário não disponível' };
    
    try {
      const startDate = new Date(booking.starts_at);
      const bahiaTime = formatInTimeZone(startDate, TIMEZONE, "yyyy-MM-dd HH:mm", { locale: ptBR });
      const [datePart, timePart] = bahiaTime.split(' ');
      
      const dateFormatted = formatDateForDisplay(datePart);
      const timeFormatted = timePart;
      
      return { date: dateFormatted, time: timeFormatted };
    } catch (error) {
      console.error('Error formatting booking date time:', error);
      return { date: 'Data não disponível', time: 'Horário não disponível' };
    }
  };

  const formatSelectedDateTime = () => {
    if (!selectedDate || !selectedTime) return 'Data e horário não selecionados';
    
    const dateFormatted = formatDateForDisplay(selectedDate);
    const timeFormatted = formatTimeForDisplay(selectedTime);
    
    return `${dateFormatted} às ${timeFormatted}`;
  };

  const generateCalendarFile = (booking: any) => {
    if (!booking) return;

    const startDate = new Date(booking.starts_at);
    const endDate = new Date(booking.ends_at);
    
    // Format for ICS file (YYYYMMDDTHHMMSSZ)
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
DESCRIPTION:Agendamento confirmado\\n\\nServiço: ${booking.service?.name || 'N/A'}\\nProfissional: ${booking.staff?.name || 'N/A'}\\nCliente: ${booking.customer?.name || 'N/A'}\\nTelefone: ${booking.customer?.phone || 'N/A'}${booking.notes ? `\\nObservações: ${booking.notes}` : ''}
LOCATION:${tenant?.address || tenant?.name || 'Barbearia'}
BEGIN:VALARM
TRIGGER:-PT30M
ACTION:DISPLAY
DESCRIPTION:Lembrete: ${booking.service?.name || 'Agendamento'} em 30 minutos
END:VALARM
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
    
    toast({
      title: "Arquivo baixado!",
      description: "O arquivo do calendário foi baixado. Abra-o para adicionar o agendamento ao seu calendário.",
    });
  };

  if (step === 5) {
    const bookingDateTime = formatBookingDateTime(createdBooking);
    
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-success/20 shadow-large">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-success" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Agendamento Confirmado!
            </h2>
            <p className="text-muted-foreground mb-6">
              Seu horário foi reservado com sucesso. Você receberá uma confirmação por WhatsApp.
            </p>
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span className="font-medium">{createdBooking?.service?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">{createdBooking?.staff?.name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">{bookingDateTime.date}, {bookingDateTime.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium text-accent">
                    R$ {((createdBooking?.service?.price_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
            <div className="space-y-3">
              <Button 
                className="w-full" 
                variant="hero"
                onClick={() => generateCalendarFile(createdBooking)}
                disabled={!createdBooking}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Adicionar ao Calendário
              </Button>
              
              <Button 
                className="w-full" 
                variant="outline"
                onClick={resetBooking}
              >
                Fazer Novo Agendamento
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative h-64 bg-gradient-primary overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-end pb-8">
          <div className="text-primary-foreground">
            <h1 className="text-3xl font-bold mb-2">{tenant?.name || "Carregando..."}</h1>
            <div className="flex items-center space-x-4 text-sm opacity-90">
              {tenant?.address && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {tenant.address}
                </div>
              )}
              {tenant?.phone && (
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  {tenant.phone}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Booking Summary - Show after step 1 */}
        {step > 1 && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Resumo do Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid md:grid-cols-2 gap-4">
                {selectedService && (
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ 
                        backgroundColor: `${services.find(s => s.id === selectedService)?.color}20`,
                        color: services.find(s => s.id === selectedService)?.color 
                      }}
                    >
                      <Scissors className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Serviço</p>
                      <p className="font-medium">{services.find(s => s.id === selectedService)?.name}</p>
                    </div>
                  </div>
                )}
                
                {(selectedStaff || step >= 3) && (
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-sm"
                      style={{ 
                        backgroundColor: selectedStaff ? `${staff.find(s => s.id === selectedStaff)?.color}20` : '#f3f4f620',
                        color: selectedStaff ? staff.find(s => s.id === selectedStaff)?.color : '#6b7280'
                      }}
                    >
                      <User className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profissional</p>
                      <p className="font-medium">
                        {selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Qualquer disponível'}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedDate && step >= 3 && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Data</p>
                      <p className="font-medium">
                        {formatDateForDisplay(selectedDate)}
                      </p>
                    </div>
                  </div>
                )}
                
                {selectedTime && (
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Horário</p>
                      <p className="font-medium">{selectedTime}</p>
                    </div>
                  </div>
                )}
              </div>
              
              {selectedService && (
                <Separator />
              )}
              
              {selectedService && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Valor do serviço:</span>
                  <span className="text-lg font-bold text-primary">
                    R$ {((services.find(s => s.id === selectedService)?.price_cents || 0) / 100).toFixed(2)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Progress Indicator */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step >= i ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {i}
                </div>
                {i < 4 && (
                  <div className={`w-12 h-0.5 mx-2 ${
                    step > i ? 'bg-primary' : 'bg-muted'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Select Service */}
        {step === 1 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha seu serviço
              </h2>
              <p className="text-muted-foreground">
                Selecione o serviço que deseja agendar
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {loading ? (
                <div className="col-span-2 text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Carregando serviços...</p>
                </div>
              ) : services.length === 0 ? (
                <div className="col-span-2 text-center py-8">
                  <p className="text-muted-foreground">Nenhum serviço disponível no momento.</p>
                </div>
              ) : (
                services.map((service) => (
                  <Card 
                    key={service.id} 
                    className="cursor-pointer border-border hover:border-primary hover:shadow-medium transition-all duration-300"
                    onClick={() => handleServiceSelect(service.id)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${service.color}20`,
                            color: service.color 
                          }}
                        >
                          <Scissors className="h-6 w-6" />
                        </div>
                        <Badge variant="secondary" className="text-accent font-semibold">
                          R$ {(service.price_cents / 100).toFixed(2)}
                        </Badge>
                      </div>
                      <h3 className="font-semibold text-foreground mb-2">{service.name}</h3>
                      <p className="text-sm text-muted-foreground mb-3">{service.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <Clock className="h-3 w-3 mr-1" />
                        {service.duration_minutes} minutos
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-center mt-8">
              <div className="flex space-x-4 max-w-sm w-full">
                {/* No back button on step 1 */}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Select Staff */}
        {step === 2 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha o profissional
              </h2>
              <p className="text-muted-foreground">
                Selecione quem você prefere que faça o atendimento
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="mb-6 border-accent/20 bg-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => handleStaffSelect("any")}
                      className="border-accent/20 hover:bg-accent/10"
                    >
                      Qualquer profissional disponível
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Separator className="mb-6" />
              
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Carregando profissionais...</p>
                  </div>
                ) : (
                  staff.map((member) => (
                    <Card 
                      key={member.id}
                      className="cursor-pointer border-border hover:border-primary hover:shadow-medium transition-all duration-300"
                      onClick={() => handleStaffSelect(member.id)}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center space-x-4">
                          <div 
                            className="w-16 h-16 rounded-full flex items-center justify-center"
                            style={{ 
                              backgroundColor: `${member.color}20`,
                              color: member.color 
                            }}
                          >
                            <User className="h-8 w-8" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-foreground mb-1">{member.name}</h3>
                            <p className="text-sm text-muted-foreground mb-2">{member.bio}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-center mt-8">
              <div className="flex space-x-4 max-w-sm w-full">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={goToNextStep}
                  disabled={!selectedService}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Select Time */}
        {step === 3 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Escolha data e horário
              </h2>
              <p className="text-muted-foreground">
                Selecione o melhor horário para você
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Selecione a data
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-4">
                    <CalendarRac
                      value={selectedCalendarDate}
                      onChange={handleDateSelect}
                      minValue={today(getLocalTimeZone())}
                      className="rounded-lg border border-border p-2 mx-auto w-fit"
                    />
                  </div>
                  
                   {slotsLoading ? (
                     <div className="text-center py-8">
                       <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                       <p className="text-muted-foreground">Carregando horários disponíveis...</p>
                     </div>
                   ) : allTimeSlots.length === 0 ? (
                     <div className="text-center py-8 text-muted-foreground">
                       {selectedDate ? "Nenhum horário disponível para esta data." : "Selecione uma data para ver os horários."}
                     </div>
                   ) : (
                      <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                        {allTimeSlots.map((slot) => (
                          <Button
                            key={slot.time}
                            variant={slot.available ? "outline" : "secondary"}
                            onClick={slot.available ? () => handleTimeSelect(slot.time) : undefined}
                            disabled={!slot.available}
                            className={`h-12 relative ${
                              slot.available 
                                ? "hover:border-primary hover:bg-primary/5 cursor-pointer" 
                                : "bg-destructive/10 border-destructive/20 text-destructive cursor-not-allowed opacity-75"
                            }`}
                          >
                            {slot.available ? (
                              slot.time
                            ) : (
                              <div className="flex items-center space-x-1">
                                <X className="h-3 w-3" />
                                <span className="text-xs">{slot.time}</span>
                              </div>
                            )}
                          </Button>
                        ))}
                      </div>
                   )}
                </CardContent>
              </Card>
            </div>
            
            {/* Navigation Buttons */}
            <div className="flex justify-center mt-8">
              <div className="flex space-x-4 max-w-sm w-full">
                <Button 
                  variant="outline" 
                  onClick={goToPreviousStep}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button 
                  variant="hero" 
                  onClick={goToNextStep}
                  disabled={!selectedDate || !selectedTime}
                  className="flex-1"
                >
                  Continuar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Contact Information */}
        {step === 4 && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                Seus dados de contato
              </h2>
              <p className="text-muted-foreground">
                Precisamos dessas informações para confirmar seu agendamento
              </p>
            </div>
            
            <div className="max-w-xl mx-auto">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Nome completo *</Label>
                      <Input
                        id="name"
                        placeholder="Seu nome completo"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="phone">WhatsApp *</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(11) 99999-9999"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        className="h-11"
                      />
                      <p className="text-xs text-muted-foreground">
                        Enviaremos a confirmação por WhatsApp
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="email">E-mail (opcional)</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        className="h-11"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações (opcional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Alguma observação especial?"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Summary */}
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Resumo do agendamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Serviço:</span>
                        <span className="font-medium">
                          {services.find(s => s.id === selectedService)?.name || 'Não selecionado'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profissional:</span>
                        <span className="font-medium">
                          {selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Qualquer disponível'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data e hora:</span>
                        <span className="font-medium">{formatSelectedDateTime()}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-accent">
                          R$ {((services.find(s => s.id === selectedService)?.price_cents || 0) / 100).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex space-x-4">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={goToPreviousStep}
                    className="flex-1"
                    disabled={submitting}
                  >
                    Voltar
                  </Button>
                  <Button type="submit" size="lg" className="flex-1" variant="hero" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      "Confirmar Agendamento"
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPublic;