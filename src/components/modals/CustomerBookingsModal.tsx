import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar, 
  Clock, 
  User, 
  Scissors, 
  Phone,
  X,
  Loader2,
  CalendarX,
  ArrowLeft
} from "lucide-react";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

interface CustomerBookingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  tenantName: string;
}

interface Booking {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service: { name: string; price_cents: number } | null;
  staff: { name: string } | null;
}

const TIMEZONE = 'America/Bahia';

// Normalize phone to E.164 format for comparison
const normalizePhone = (phone: string): string => {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return '+' + digits;
  }
  if (digits.length === 11 || digits.length === 10) {
    return '+55' + digits;
  }
  return '+55' + digits;
};

// Format phone for display
const formatPhoneDisplay = (value: string): string => {
  const digits = value.replace(/\D/g, '');
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export function CustomerBookingsModal({ 
  open, 
  onOpenChange, 
  tenantId,
  tenantName 
}: CustomerBookingsModalProps) {
  const { toast } = useToast();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState<'phone' | 'bookings'>('phone');
  const [loading, setLoading] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPhone('');
      setStep('phone');
      setBookings([]);
    }
  }, [open]);

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setPhone(formatted);
  };

  const handleSearch = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      toast({
        title: "Número inválido",
        description: "Digite um número de celular válido com DDD.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const digits = phone.replace(/\D/g, '');

      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { phone: digits, tenant_id: tenantId },
      });

      if (error) throw error;

      setBookings(data?.bookings || []);
      setStep('bookings');
    } catch (error) {
      console.error('Error searching bookings:', error);
      toast({
        title: "Erro ao buscar",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (bookingId: string) => {
    try {
      setCancellingId(bookingId);

      const { data, error } = await supabase.functions.invoke('public-customer-bookings', {
        body: { 
          action: 'cancel',
          booking_id: bookingId,
          tenant_id: tenantId,
        },
      });

      if (error) throw error;

      setBookings(prev => prev.filter(b => b.id !== bookingId));
      
      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso.",
      });
    } catch (error) {
      console.error('Error cancelling booking:', error);
      toast({
        title: "Erro ao cancelar",
        description: "Não foi possível cancelar. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setCancellingId(null);
    }
  };

  const formatBookingDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatInTimeZone(date, TIMEZONE, "EEE, d 'de' MMM", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const formatBookingTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return formatInTimeZone(date, TIMEZONE, "HH:mm", { locale: ptBR });
    } catch {
      return '';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmado';
      case 'pending': return 'Pendente';
      case 'pending_payment': return 'Aguardando Pagamento';
      case 'completed': return 'Concluído';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-emerald-500/10 text-emerald-400';
      case 'pending': return 'bg-amber-500/10 text-amber-400';
      case 'pending_payment': return 'bg-blue-500/10 text-blue-400';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {step === 'phone' ? 'Meus Agendamentos' : 'Seus Agendamentos'}
          </DialogTitle>
        </DialogHeader>

        {step === 'phone' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Digite seu número de celular para consultar seus agendamentos em {tenantName}.
            </p>
            
            <div>
              <label className="block text-sm text-muted-foreground mb-2">
                <Phone className="h-4 w-4 inline mr-1" />
                Número do celular
              </label>
              <Input
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={handlePhoneChange}
                maxLength={15}
                className="h-12 rounded-xl"
              />
            </div>

            <Button
              onClick={handleSearch}
              disabled={loading || phone.replace(/\D/g, '').length < 10}
              className="w-full h-12 rounded-xl font-medium"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Buscando...
                </>
              ) : (
                'Consultar agendamentos'
              )}
            </Button>
          </div>
        )}

        {step === 'bookings' && (
          <div className="space-y-4">
            <button
              onClick={() => setStep('phone')}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Trocar número
            </button>

            {bookings.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                  <CalendarX className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-medium text-foreground mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-sm text-muted-foreground">
                  Não encontramos agendamentos futuros para este número.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[400px] overflow-y-auto">
                {bookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 bg-muted/50 border border-border rounded-xl"
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Scissors className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-foreground truncate">
                            {booking.service?.name || 'Serviço'}
                          </span>
                        </div>
                        {booking.staff?.name && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <User className="h-3 w-3" />
                            {booking.staff.name}
                          </div>
                        )}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                        {getStatusLabel(booking.status)}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatBookingDate(booking.starts_at)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {formatBookingTime(booking.starts_at)}
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (window.confirm('Tem certeza que deseja cancelar este agendamento?')) {
                          handleCancel(booking.id);
                        }
                      }}
                      disabled={cancellingId === booking.id || booking.status === 'cancelled'}
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      {cancellingId === booking.id ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cancelando...
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-2" />
                          Cancelar agendamento
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
