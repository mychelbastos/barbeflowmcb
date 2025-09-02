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
  Loader2
} from "lucide-react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
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
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  
  // Form data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [notes, setNotes] = useState('');

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
      setAvailableSlots(data.available_slots || []);
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
  };

  const handleTimeSelect = (time: string) => {
    setSelectedTime(time);
    setStep(4);
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
      const startsAt = new Date(selectedDate);
      startsAt.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      
      console.log('Submitting booking with:', {
        tenant_id: tenant.id,
        service_id: selectedService,
        staff_id: selectedStaff,
        customer_name: customerName,
        customer_phone: customerPhone,
        starts_at: startsAt.toISOString()
      });
      
      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          tenant_id: tenant.id,
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

  if (step === 5) {
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
                  <span className="font-medium">Corte + Barba</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span className="font-medium">Carlos Silva</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Data:</span>
                  <span className="font-medium">Hoje, 15:30</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Valor:</span>
                  <span className="font-medium text-accent">R$ 40,00</span>
                </div>
              </div>
            </div>
            <Button className="w-full" variant="hero">
              Adicionar ao Calendário
            </Button>
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
                        {new Date(selectedDate + 'T00:00:00').toLocaleDateString('pt-BR', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
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
                  ) : availableSlots.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      {selectedDate ? "Nenhum horário disponível para esta data." : "Selecione uma data para ver os horários."}
                    </div>
                  ) : (
                     <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                       {availableSlots.map((slot) => (
                         <Button
                           key={slot.time}
                           variant="outline"
                           onClick={() => handleTimeSelect(slot.time)}
                           className="h-12 hover:border-primary hover:bg-primary/5"
                         >
                           {slot.time}
                         </Button>
                       ))}
                     </div>
                  )}
                </CardContent>
              </Card>
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
                        <span className="font-medium">Corte + Barba</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profissional:</span>
                        <span className="font-medium">Carlos Silva</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Data e hora:</span>
                        <span className="font-medium">Hoje, 15:30</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-semibold">
                        <span>Total:</span>
                        <span className="text-accent">R$ 40,00</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full" variant="hero" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    "Confirmar Agendamento"
                  )}
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BookingPublic;