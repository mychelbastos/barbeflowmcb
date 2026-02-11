import { useState, useEffect, useCallback, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useBookingModal } from "@/hooks/useBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerSuggestion {
  id: string;
  name: string;
  phone: string;
  email: string | null;
}

interface AvailableSlot {
  time: string;
  staff_id: string;
  staff_name: string;
}

interface ServiceItem {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  color: string | null;
}

export function BookingModal() {
  const { currentTenant } = useTenant();
  const { isOpen, closeBookingModal, initialStaffId, initialDate, initialTime, customerPackageId, customerSubscriptionId, allowedServiceIds } = useBookingModal();
  const { toast } = useToast();

  const [services, setServices] = useState<ServiceItem[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  // Form fields
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");

  // Customer autocomplete
  const [customerSuggestions, setCustomerSuggestions] = useState<CustomerSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchingCustomers, setSearchingCustomers] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Available slots
  const [availableSlots, setAvailableSlots] = useState<AvailableSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Derived values
  const selectedServices = services.filter(s => selectedServiceIds.includes(s.id));
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration_minutes, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price_cents, 0);

  useEffect(() => {
    if (isOpen && currentTenant) {
      loadFormData();
      if (initialDate) setDate(initialDate);
      if (initialStaffId) setStaffId(initialStaffId);
      if (initialTime) setTime(initialTime);
    }
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen, currentTenant]);

  // Fetch available slots when date/services/staff changes
  useEffect(() => {
    if (date && currentTenant) {
      fetchAvailableSlots();
    } else {
      setAvailableSlots([]);
      setTime("");
    }
  }, [date, selectedServiceIds, staffId, currentTenant]);

  const resetForm = () => {
    setCustomerName("");
    setCustomerPhone("");
    setCustomerEmail("");
    setSelectedServiceIds([]);
    setStaffId("");
    setDate("");
    setTime("");
    setNotes("");
    setCustomerSuggestions([]);
    setSelectedCustomerId(null);
    setAvailableSlots([]);
  };

  const loadFormData = async () => {
    if (!currentTenant) return;
    try {
      const [servicesResult, staffResult] = await Promise.all([
        supabase.from('services').select('id, name, duration_minutes, price_cents, color').eq('tenant_id', currentTenant.id).eq('active', true).order('name'),
        supabase.from('staff').select('*').eq('tenant_id', currentTenant.id).eq('active', true).order('name')
      ]);
      if (servicesResult.error) throw servicesResult.error;
      if (staffResult.error) throw staffResult.error;
      setServices(servicesResult.data || []);
      setStaff(staffResult.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast({ title: "Erro", description: "Erro ao carregar dados do formulário", variant: "destructive" });
    }
  };

  const fetchAvailableSlots = async () => {
    if (!currentTenant || !date) return;
    setLoadingSlots(true);
    try {
      const body: any = { tenant_id: currentTenant.id, date };
      // Use the first selected service for slot calculation, or total duration
      if (selectedServiceIds.length > 0) body.service_id = selectedServiceIds[0];
      if (staffId && staffId !== "none") body.staff_id = staffId;

      const { data, error } = await supabase.functions.invoke('get-available-slots', { body });
      if (error) throw error;
      setAvailableSlots(data?.available_slots || []);
      if (time && !data?.available_slots?.find((s: AvailableSlot) => s.time === time)) {
        setTime("");
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
          .from('customers').select('id, name, phone, email')
          .eq('tenant_id', currentTenant.id).ilike('name', `%${name}%`)
          .order('name').limit(8);
        if (error) throw error;
        setCustomerSuggestions(data || []);
        setShowSuggestions((data || []).length > 0);
      } catch (err) { console.error('Error searching customers:', err); }
      finally { setSearchingCustomers(false); }
    }, 300);
  }, [currentTenant]);

  const selectCustomer = (customer: CustomerSuggestion) => {
    setCustomerName(customer.name);
    setCustomerPhone(customer.phone);
    setCustomerEmail(customer.email || "");
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

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleSubmit = async () => {
    if (!currentTenant) return;

    // Validation
    if (!customerName.trim()) { toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" }); return; }
    if (!customerPhone.trim()) { toast({ title: "Erro", description: "Telefone é obrigatório", variant: "destructive" }); return; }
    if (selectedServiceIds.length === 0) { toast({ title: "Erro", description: "Selecione ao menos um serviço", variant: "destructive" }); return; }
    if (!date) { toast({ title: "Erro", description: "Data é obrigatória", variant: "destructive" }); return; }
    if (!time) { toast({ title: "Erro", description: "Horário é obrigatório", variant: "destructive" }); return; }

    try {
      setFormLoading(true);
      let customerId = selectedCustomerId;

      // Find or create customer
      if (!customerId) {
        const { data: existingCustomer } = await supabase
          .from('customers').select('id')
          .eq('tenant_id', currentTenant.id).eq('phone', customerPhone.replace(/\D/g, ''))
          .single();

        if (existingCustomer) {
          customerId = existingCustomer.id;
          await supabase.from('customers')
            .update({ name: customerName.trim(), email: customerEmail.trim() || null })
            .eq('id', customerId);
        } else {
          const { data: newCustomer, error: customerError } = await supabase
            .from('customers')
            .insert({
              tenant_id: currentTenant.id,
              name: customerName.trim(),
              phone: customerPhone.replace(/\D/g, ''),
              email: customerEmail.trim() || null,
            })
            .select().single();
          if (customerError) throw customerError;
          customerId = newCustomer.id;
        }
      }

      // Create consecutive bookings for each selected service
      let currentStartTime = new Date(`${date}T${time}`);
      const createdBookingIds: string[] = [];

      for (const service of selectedServices) {
        const startsAt = new Date(currentStartTime);
        const endsAt = new Date(startsAt.getTime() + service.duration_minutes * 60000);

        const { data: newBooking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            tenant_id: currentTenant.id,
            customer_id: customerId,
            service_id: service.id,
            staff_id: staffId === "none" ? null : staffId || null,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'confirmed',
            notes: selectedServices.length > 1
              ? `${notes ? notes + ' | ' : ''}Combo: ${selectedServices.map(s => s.name).join(' + ')}`
              : notes || null,
          })
          .select('id').single();

        if (bookingError) throw bookingError;
        if (newBooking) createdBookingIds.push(newBooking.id);

        // Next service starts where this one ends
        currentStartTime = endsAt;
      }

      // Send WhatsApp notification for the first booking
      if (createdBookingIds.length > 0) {
        try {
          await supabase.functions.invoke('send-whatsapp-notification', {
            body: { type: 'booking_confirmed', booking_id: createdBookingIds[0], tenant_id: currentTenant.id },
          });
        } catch (notifError) {
          console.error('Error sending WhatsApp notification:', notifError);
        }
      }

      toast({
        title: "Sucesso",
        description: selectedServices.length > 1
          ? `${selectedServices.length} agendamentos consecutivos criados!`
          : "Agendamento criado com sucesso!",
      });

      resetForm();
      closeBookingModal();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao criar agendamento", variant: "destructive" });
    } finally {
      setFormLoading(false);
    }
  };

  const availableServices = allowedServiceIds
    ? services.filter(s => allowedServiceIds.includes(s.id))
    : services;

  return (
    <Dialog open={isOpen} onOpenChange={closeBookingModal}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>Criar um novo agendamento para cliente</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 md:space-y-4">
          {/* Customer Name with Autocomplete */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2 relative">
              <Label>Nome do Cliente *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={customerName}
                ref={nameInputRef}
                onChange={(e) => {
                  setCustomerName(e.target.value);
                  setSelectedCustomerId(null);
                  searchCustomers(e.target.value);
                }}
                onFocus={() => { if (customerSuggestions.length > 0) setShowSuggestions(true); }}
                autoComplete="off"
              />
              {showSuggestions && customerSuggestions.length > 0 && (
                <div ref={suggestionsRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                  {customerSuggestions.map((c) => (
                    <button key={c.id} type="button" className="w-full px-3 py-2 text-left hover:bg-accent text-sm transition-colors flex flex-col" onClick={() => selectCustomer(c)}>
                      <span className="font-medium text-foreground">{c.name}</span>
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
            </div>

            <div className="space-y-2">
              <Label>Telefone *</Label>
              <Input placeholder="(11) 99999-9999" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Email (Opcional)</Label>
            <Input placeholder="cliente@email.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
          </div>

          {/* Multi-Service Selection */}
          <div className="space-y-2">
            <Label>Serviços * <span className="text-muted-foreground font-normal">(selecione um ou mais)</span></Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
              {availableServices.map((service) => {
                const isSelected = selectedServiceIds.includes(service.id);
                return (
                  <button
                    key={service.id}
                    type="button"
                    onClick={() => toggleService(service.id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border text-left transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-accent/50"
                    )}
                  >
                    <Checkbox checked={isSelected} className="pointer-events-none" />
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: service.color || '#3B82F6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.duration_minutes}min · R$ {(service.price_cents / 100).toFixed(2)}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Summary of selected services */}
            {selectedServices.length > 1 && (
              <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border border-border text-sm">
                <Badge variant="secondary" className="text-xs">
                  {selectedServices.length} serviços
                </Badge>
                <span className="text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {totalDuration}min total
                </span>
                <span className="font-medium text-foreground ml-auto">
                  R$ {(totalPrice / 100).toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Staff */}
          <div className="space-y-2">
            <Label>Profissional</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Qualquer profissional</SelectItem>
                {staff.map((member) => (
                  <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label>Data *</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* Available Time Slots */}
          <div className="space-y-2">
            <Label>Horário *</Label>
            {!date ? (
              <p className="text-sm text-muted-foreground">Selecione uma data primeiro</p>
            ) : loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando horários disponíveis...
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Nenhum horário disponível para esta data</p>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1">
                {availableSlots.map((slot) => (
                  <button
                    key={slot.time}
                    type="button"
                    className={cn(
                      "flex items-center justify-center gap-1 px-2 py-2 rounded-md text-sm font-medium border transition-colors",
                      time === slot.time
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background text-foreground border-border hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => setTime(slot.time)}
                  >
                    <Clock className="h-3 w-3" />
                    {slot.time}
                  </button>
                ))}
              </div>
            )}

            {/* Show time range preview when time and multiple services are selected */}
            {time && selectedServices.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {selectedServices.length > 1 ? 'Período: ' : 'Horário: '}
                {time} → {(() => {
                  const [h, m] = time.split(':').map(Number);
                  const end = new Date(2000, 0, 1, h, m + totalDuration);
                  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                })()} ({totalDuration}min)
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              placeholder="Observações sobre o agendamento..."
              className="resize-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => closeBookingModal()} disabled={formLoading} className="w-full sm:w-auto">
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={formLoading} className="w-full sm:w-auto">
            {formLoading ? "Criando..." : selectedServices.length > 1 ? `Criar ${selectedServices.length} Agendamentos` : "Criar Agendamento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
