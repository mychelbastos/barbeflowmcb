import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Plus, CreditCard, Banknote, AlertCircle } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useBookingModal } from "@/hooks/useBookingModal";
import { NoTenantState } from "@/components/NoTenantState";

export default function Agenda() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { openBookingModal } = useBookingModal();
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week'>('week');

  useEffect(() => {
    if (currentTenant) {
      loadBookings();
    }
  }, [currentTenant, selectedDate, viewMode]);

  const loadBookings = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      let startDate, endDate;
      
      if (viewMode === 'day') {
        startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
        endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
      } else {
        startDate = startOfWeek(selectedDate, { locale: ptBR });
        endDate = endOfWeek(selectedDate, { locale: ptBR });
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, color, duration_minutes, price_cents),
          staff:staff(name, color),
          customer:customers(name, phone)
        `)
        .eq('tenant_id', currentTenant.id)
        .gte('starts_at', startDate.toISOString())
        .lt('starts_at', endDate.toISOString())
        .order('starts_at');

      if (error) throw error;

      // Load payments for these bookings
      const bookingIds = (data || []).map(b => b.id);
      let paymentsMap: Record<string, any> = {};
      
      if (bookingIds.length > 0) {
        const { data: payments } = await supabase
          .from('payments')
          .select('*')
          .in('booking_id', bookingIds);
        
        if (payments) {
          paymentsMap = payments.reduce((acc, p) => {
            acc[p.booking_id] = p;
            return acc;
          }, {} as Record<string, any>);
        }
      }

      // Merge payments into bookings
      const bookingsWithPayments = (data || []).map(booking => ({
        ...booking,
        payment: paymentsMap[booking.id] || null,
      }));

      setBookings(bookingsWithPayments);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingsForDay = (date: Date) => {
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    return bookings.filter(booking => {
      const bookingDate = new Date(booking.starts_at);
      return bookingDate >= dayStart && bookingDate < dayEnd;
    }).sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  };

  const renderDayView = () => {
    const dayBookings = getBookingsForDay(selectedDate);
    
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <Button onClick={openBookingModal}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
        
        <Card>
          <CardContent className="p-6">
            {dayBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum agendamento para este dia</p>
              </div>
            ) : (
              <div className="space-y-4">
                {dayBookings.map((booking) => (
                  <div key={booking.id} className="flex items-center space-x-4 p-4 rounded-lg border border-border">
                    <div 
                      className="w-4 h-16 rounded-full"
                      style={{ backgroundColor: booking.service?.color || '#3B82F6' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">
                          {format(new Date(booking.starts_at), 'HH:mm')} - 
                          {format(new Date(booking.ends_at), 'HH:mm')}
                        </span>
                      </div>
                      <h4 className="font-semibold text-foreground">{booking.customer?.name}</h4>
                      <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <div className="flex items-center text-xs text-muted-foreground">
                          <User className="h-3 w-3 mr-1" />
                          {booking.staff?.name || 'Qualquer profissional'}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end space-y-2">
                      {/* Payment Status */}
                      {booking.payment ? (
                        <div className="flex items-center gap-1">
                          {booking.payment.status === 'paid' && (
                            <CreditCard className="h-3 w-3 text-emerald-500" />
                          )}
                          {booking.payment.status === 'pending' && (
                            <AlertCircle className="h-3 w-3 text-amber-500" />
                          )}
                          <span className={`text-xs ${
                            booking.payment.status === 'paid' ? 'text-emerald-500' :
                            booking.payment.status === 'pending' ? 'text-amber-500' :
                            'text-muted-foreground'
                          }`}>
                            {booking.payment.status === 'paid' ? 'Pago' : 
                             booking.payment.status === 'pending' ? 'Aguardando' : 'Falhou'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Banknote className="h-3 w-3" />
                          <span className="text-xs">No local</span>
                        </div>
                      )}
                      
                      {/* Booking Status */}
                      <Badge variant={
                        booking.status === 'confirmed' ? 'default' :
                        booking.status === 'pending' ? 'outline' :
                        booking.status === 'cancelled' ? 'destructive' :
                        'secondary'
                      }>
                        {booking.status === 'confirmed' ? 'Confirmado' :
                         booking.status === 'pending' ? 'Aguardando' :
                         booking.status === 'cancelled' ? 'Cancelado' :
                         booking.status === 'no_show' ? 'Faltou' : booking.status}
                      </Badge>
                      
                      <span className="text-sm font-medium text-success">
                        R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekStart = startOfWeek(selectedDate, { locale: ptBR });
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    
    return (
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h2 className="text-lg md:text-xl font-semibold">
            Semana de {format(weekStart, "dd", { locale: ptBR })} a {format(endOfWeek(selectedDate, { locale: ptBR }), "dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <Button onClick={openBookingModal} size="sm" className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Novo Agendamento
          </Button>
        </div>
        
        {/* Mobile: Horizontal scroll cards */}
        <div className="md:hidden overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3" style={{ width: 'max-content' }}>
            {days.map((day) => {
              const dayBookings = getBookingsForDay(day);
              const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
              
              return (
                <Card key={day.toISOString()} className={`w-40 flex-shrink-0 ${isToday ? 'border-primary' : ''}`}>
                  <CardHeader className="pb-2 px-3 pt-3">
                    <CardTitle className="text-sm">
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </p>
                        <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                          {format(day, 'dd')}
                        </p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 pb-3 pt-0">
                    <div className="space-y-2">
                      {dayBookings.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-2">
                          Sem agendamentos
                        </p>
                      ) : (
                        dayBookings.slice(0, 2).map((booking) => (
                          <div 
                            key={booking.id}
                            className="p-2 rounded-md text-xs"
                            style={{ 
                              backgroundColor: `${booking.service?.color || '#3B82F6'}20`,
                              borderLeft: `3px solid ${booking.service?.color || '#3B82F6'}`
                            }}
                          >
                            <div className="font-medium text-foreground">
                              {format(new Date(booking.starts_at), 'HH:mm')}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {booking.customer?.name}
                            </div>
                          </div>
                        ))
                      )}
                      {dayBookings.length > 2 && (
                        <div className="text-xs text-muted-foreground text-center">
                          +{dayBookings.length - 2} mais
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
        
        {/* Desktop: Grid layout */}
        <div className="hidden md:grid md:grid-cols-7 gap-4">
          {days.map((day) => {
            const dayBookings = getBookingsForDay(day);
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <Card key={day.toISOString()} className={isToday ? 'border-primary' : ''}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase">
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className={`text-lg font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                        {format(day, 'dd')}
                      </p>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {dayBookings.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Nenhum agendamento
                      </p>
                    ) : (
                      dayBookings.slice(0, 3).map((booking) => (
                        <div 
                          key={booking.id}
                          className="p-2 rounded-md text-xs"
                          style={{ 
                            backgroundColor: `${booking.service?.color || '#3B82F6'}20`,
                            borderLeft: `3px solid ${booking.service?.color || '#3B82F6'}`
                          }}
                        >
                          <div className="font-medium text-foreground">
                            {format(new Date(booking.starts_at), 'HH:mm')}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {booking.customer?.name}
                          </div>
                          <div className="text-muted-foreground truncate">
                            {booking.service?.name}
                          </div>
                        </div>
                      ))
                    )}
                    {dayBookings.length > 3 && (
                      <div className="text-xs text-muted-foreground text-center py-1">
                        +{dayBookings.length - 3} mais
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-64 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Calendário</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Visualize seus agendamentos em calendário
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant={viewMode === 'day' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('day')}
              className="flex-1 sm:flex-none"
            >
              Dia
            </Button>
            <Button
              variant={viewMode === 'week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('week')}
              className="flex-1 sm:flex-none"
            >
              Semana
            </Button>
          </div>
          
          <div className="flex items-center gap-2 justify-center sm:justify-start">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(
                viewMode === 'day' 
                  ? new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000)
                  : new Date(selectedDate.getTime() - 7 * 24 * 60 * 60 * 1000)
              )}
              className="px-3"
            >
              ←
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(new Date())}
              className="min-w-[60px]"
            >
              Hoje
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedDate(
                viewMode === 'day' 
                  ? new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000)
                  : new Date(selectedDate.getTime() + 7 * 24 * 60 * 60 * 1000)
              )}
              className="px-3"
            >
              →
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="h-8 bg-muted rounded animate-pulse" />
          <div className="h-64 bg-muted rounded animate-pulse" />
        </div>
      ) : (
        viewMode === 'day' ? renderDayView() : renderWeekView()
      )}
    </div>
  );
}