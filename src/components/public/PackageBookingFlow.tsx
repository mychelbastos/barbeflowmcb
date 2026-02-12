import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarRac } from "@/components/ui/calendar-rac";
import { Loader2, User, Sparkles, Clock, ChevronLeft, Check, Briefcase } from "lucide-react";
import { getLocalTimeZone, today, parseDate } from "@internationalized/date";
import type { DateValue } from "react-aria-components";

interface PackageBookingFlowProps {
  tenant: any;
  serviceId: string;
  serviceName: string;
  customerPhone: string;
  customerName: string;
  customerPackageId?: string;
  customerSubscriptionId?: string;
  benefitLabel: string;
  slug: string;
  onSuccess: (booking: any) => void;
  onCancel: () => void;
}

export function PackageBookingFlow({
  tenant, serviceId, serviceName, customerPhone, customerName,
  customerPackageId, customerSubscriptionId,
  benefitLabel, slug, onSuccess, onCancel,
}: PackageBookingFlowProps) {
  const { toast } = useToast();
  const [flowStep, setFlowStep] = useState<'staff' | 'datetime' | 'confirm'>('staff');
  const [staff, setStaff] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<DateValue | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [allTimeSlots, setAllTimeSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  useEffect(() => {
    if (selectedDate && serviceId) loadSlots();
  }, [selectedDate, selectedStaff]);

  const loadStaff = async () => {
    const { data } = await supabase
      .from('staff').select('*')
      .eq('tenant_id', tenant.id).eq('active', true).order('name');
    setStaff(data || []);
    setLoading(false);
  };

  const loadSlots = async () => {
    setSlotsLoading(true);
    try {
      const { data } = await supabase.functions.invoke('get-available-slots', {
        body: { tenant_id: tenant.id, service_id: serviceId, staff_id: selectedStaff || null, date: selectedDate },
      });
      const available = data?.available_slots || [];
      const occupied = data?.occupied_slots || [];
      const slotMap = new Map();
      available.forEach((s: any) => slotMap.set(s.time, { ...s, available: true }));
      occupied.forEach((s: any) => slotMap.set(s.time, { ...s, available: false }));
      const all = Array.from(slotMap.values()).sort((a, b) => a.time.localeCompare(b.time));
      setAllTimeSlots(all);
    } catch (err) {
      console.error(err);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleStaffSelect = (id: string) => {
    setSelectedStaff(id === 'any' ? null : id);
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    setSelectedDate(tomorrowStr);
    setSelectedCalendarDate(parseDate(tomorrowStr));
    setFlowStep('datetime');
  };

  const handleDateSelect = (date: DateValue | null) => {
    setSelectedCalendarDate(date);
    if (date) {
      setSelectedDate(`${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`);
    }
    setSelectedTime(null);
    setAllTimeSlots([]);
  };

  const handleConfirm = async () => {
    if (!selectedTime || !selectedDate) return;
    setSubmitting(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const [year, month, day] = selectedDate.split('-').map(Number);
      const startsAt = new Date(year, month - 1, day, parseInt(hours), parseInt(minutes));

      const { data, error } = await supabase.functions.invoke('create-booking', {
        body: {
          slug,
          service_id: serviceId,
          staff_id: selectedStaff,
          customer_name: customerName,
          customer_phone: customerPhone,
          starts_at: startsAt.toISOString(),
          payment_method: 'onsite',
          customer_package_id: customerPackageId,
          customer_subscription_id: customerSubscriptionId,
        },
      });

      if (error) throw error;
      if (data?.success) {
        toast({ title: "Agendamento confirmado!", description: `Sessão do ${benefitLabel} utilizada.` });
        onSuccess(data.booking);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="p-3 bg-primary/10 border border-primary/30 rounded-xl">
        <div className="flex items-center gap-2">
          <Briefcase className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">{serviceName}</span>
        </div>
        <p className="text-xs text-zinc-400 mt-1">Sessão do {benefitLabel} — sem cobrança adicional</p>
      </div>

      {flowStep === 'staff' && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-zinc-400">Escolha o profissional</h3>
          <button onClick={() => handleStaffSelect('any')}
            className="w-full p-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 border border-primary/30 rounded-lg flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-medium">Qualquer disponível</span>
            </div>
          </button>
          {staff.map((m) => (
            <button key={m.id} onClick={() => handleStaffSelect(m.id)}
              className="w-full p-3 bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700 rounded-xl text-left transition-all">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${m.color}20` }}>
                  {m.photo_url ? <img src={m.photo_url} alt={m.name} className="w-full h-full object-cover rounded-lg" /> : <User className="h-4 w-4" style={{ color: m.color }} />}
                </div>
                <span className="text-sm font-medium">{m.name}</span>
              </div>
            </button>
          ))}
          <button onClick={onCancel} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto mt-4 transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      )}

      {flowStep === 'datetime' && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-zinc-400">Escolha data e horário</h3>
          <CalendarRac value={selectedCalendarDate} onChange={handleDateSelect} minValue={today(getLocalTimeZone())} />
          {slotsLoading ? (
            <div className="flex justify-center py-4"><Loader2 className="h-5 w-5 animate-spin text-zinc-500" /></div>
          ) : allTimeSlots.length === 0 ? (
            <p className="text-center text-zinc-500 text-sm py-4">{selectedDate ? 'Nenhum horário disponível' : 'Selecione uma data'}</p>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {allTimeSlots.map((slot) => (
                <button key={slot.time} disabled={!slot.available}
                  onClick={() => { setSelectedTime(slot.time); setFlowStep('confirm'); }}
                  className={`py-2.5 rounded-lg text-sm font-medium transition-all ${
                    slot.available ? 'bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-white' : 'bg-zinc-900/30 text-zinc-700 cursor-not-allowed line-through'
                  }`}>
                  {slot.time}
                </button>
              ))}
            </div>
          )}
          <button onClick={() => setFlowStep('staff')} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      )}

      {flowStep === 'confirm' && (
        <div className="space-y-4">
          <div className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-xl space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Serviço</span>
              <span className="font-medium">{serviceName}</span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Profissional</span>
              <span className="font-medium">{selectedStaff ? staff.find(s => s.id === selectedStaff)?.name : 'Qualquer disponível'}</span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Data/Hora</span>
              <span className="font-medium">{selectedDate} às {selectedTime}</span>
            </div>
            <div className="h-px bg-zinc-800" />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Valor</span>
              <span className="font-medium text-primary">Incluso no {benefitLabel}</span>
            </div>
          </div>
          <Button onClick={handleConfirm} disabled={submitting} className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium">
            {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Confirmando...</> : <><Check className="h-4 w-4 mr-2" /> Confirmar agendamento</>}
          </Button>
          <button onClick={() => setFlowStep('datetime')} className="flex items-center gap-2 text-zinc-500 hover:text-white mx-auto transition-colors text-sm">
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
        </div>
      )}
    </div>
  );
}
