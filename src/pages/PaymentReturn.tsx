import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RefreshCw,
  CalendarPlus,
  ArrowLeft,
  Scissors
} from "lucide-react";

const PaymentReturn = () => {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const bookingId = searchParams.get('booking_id');
  const paymentId = searchParams.get('payment_id');
  
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [payment, setPayment] = useState<any>(null);
  const [booking, setBooking] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (paymentId && bookingId) {
      loadPaymentStatus();
    }
  }, [paymentId, bookingId]);

  // Poll for payment status updates
  useEffect(() => {
    if (payment?.status === 'pending') {
      const interval = setInterval(() => {
        loadPaymentStatus();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [payment?.status]);

  const loadPaymentStatus = async () => {
    try {
      // Get payment with booking and service data
      const { data: paymentData, error: paymentError } = await supabase
        .from('payments')
        .select(`
          *,
          booking:bookings(
            *,
            service:services(*),
            staff:staff(*),
            customer:customers(*)
          )
        `)
        .eq('id', paymentId)
        .maybeSingle();

      if (paymentError) throw paymentError;
      if (!paymentData) return; // Not found yet, will retry on next poll

      setPayment(paymentData);
      setBooking(paymentData.booking);

      // Get tenant
      const { data: tenantData } = await supabase
        .from('tenants')
        .select('*')
        .eq('slug', slug)
        .single();

      setTenant(tenantData);
    } catch (error) {
      console.error('Error loading payment status:', error);
      toast({
        title: "Erro ao carregar status",
        description: "Tente atualizar a página.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!bookingId) return;

    try {
      setRetrying(true);
      
      const { data, error } = await supabase.functions.invoke('mp-create-checkout', {
        body: { booking_id: bookingId },
      });

      if (error) throw error;

      if (data?.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (error: any) {
      console.error('Error retrying payment:', error);
      toast({
        title: "Erro ao tentar novamente",
        description: error.message || "Não foi possível criar um novo checkout",
        variant: "destructive",
      });
      setRetrying(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const generateGoogleCalendarUrl = () => {
    if (!booking) return '';
    const startDate = new Date(booking.starts_at);
    const endDate = new Date(booking.ends_at);
    const formatGCal = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: `${booking.service?.name || 'Agendamento'} - ${tenant?.name || 'Estabelecimento'}`,
      dates: `${formatGCal(startDate)}/${formatGCal(endDate)}`,
      details: 'Agendamento confirmado',
      location: tenant?.address || tenant?.name || '',
    });
    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin mx-auto text-zinc-400 mb-4" />
          <p className="text-zinc-400">Verificando pagamento...</p>
        </div>
      </div>
    );
  }

  const getStatusConfig = () => {
    switch (payment?.status) {
      case 'paid':
        return {
          icon: CheckCircle,
          iconColor: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/30',
          title: 'Pagamento aprovado!',
          subtitle: 'Seu agendamento está confirmado',
        };
      case 'pending':
        return {
          icon: Clock,
          iconColor: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/30',
          title: 'Aguardando pagamento',
          subtitle: 'O pagamento está sendo processado',
        };
      case 'failed':
      case 'cancelled':
        return {
          icon: XCircle,
          iconColor: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/30',
          title: 'Pagamento não aprovado',
          subtitle: 'Houve um problema com o pagamento',
        };
      default:
        return {
          icon: Clock,
          iconColor: 'text-zinc-400',
          bgColor: 'bg-zinc-500/10 border-zinc-500/30',
          title: 'Status desconhecido',
          subtitle: 'Verifique seu email para mais detalhes',
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <header className="border-b border-zinc-800/50">
        <div className="max-w-lg mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl flex items-center justify-center">
              <Scissors className="h-6 w-6 text-white/80" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">{tenant?.name || "Estabelecimento"}</h1>
              <p className="text-zinc-500 text-sm">Status do pagamento</p>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-12">
        {/* Status Icon */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 ${statusConfig.bgColor} border rounded-full flex items-center justify-center mx-auto mb-6`}>
            <StatusIcon className={`h-10 w-10 ${statusConfig.iconColor}`} strokeWidth={2} />
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">{statusConfig.title}</h2>
          <p className="text-zinc-400">{statusConfig.subtitle}</p>
          
          {payment?.status === 'pending' && (
            <p className="text-zinc-500 text-sm mt-2 flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Atualizando automaticamente...
            </p>
          )}
        </div>

        {/* Booking Details */}
        {booking && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Serviço</span>
                <span className="font-medium">{booking.service?.name}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Profissional</span>
                <span className="font-medium">{booking.staff?.name || 'Qualquer disponível'}</span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Data e hora</span>
                <span className="font-medium">
                  {formatDate(booking.starts_at)} às {formatTime(booking.starts_at)}
                </span>
              </div>
              <div className="h-px bg-zinc-800" />
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 text-sm">Valor pago</span>
                <span className="font-semibold text-primary">
                  R$ {((payment?.amount_cents || 0) / 100).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          {payment?.status === 'paid' && (
            <Button 
              onClick={() => window.open(generateGoogleCalendarUrl(), '_blank')}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium"
            >
              <CalendarPlus className="h-4 w-4 mr-2" />
              Adicionar ao Google Calendar
            </Button>
          )}

          {(payment?.status === 'failed' || payment?.status === 'cancelled') && (
            <Button 
              onClick={handleRetry}
              disabled={retrying}
              className="w-full h-12 bg-white text-zinc-900 hover:bg-zinc-100 rounded-xl font-medium"
            >
              {retrying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Criando checkout...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tentar novamente
                </>
              )}
            </Button>
          )}

          <Link to={`/${slug}`}>
            <Button 
              variant="ghost"
              className="w-full h-12 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default PaymentReturn;
