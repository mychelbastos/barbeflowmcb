import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format, eachDayOfInterval, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  TrendingUp, 
  Scissors, 
  Phone,
  ArrowUpRight,
  Sparkles,
  CreditCard,
  Banknote,
  AlertCircle,
  UserCheck
} from "lucide-react";
import { NewServiceModal, NewStaffModal, BlockTimeModal } from "@/components/modals/QuickActions";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.4 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

const Dashboard = () => {
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [periodBookings, setPeriodBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [recurringClients, setRecurringClients] = useState<any[]>([]);
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNewService, setShowNewService] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { dateRange } = useDateRange();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !tenantLoading) {
      loadDashboardData();
    }
  }, [user, currentTenant, tenantLoading, dateRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!currentTenant) {
        setTodayBookings([]);
        setPeriodBookings([]);
        setServices([]);
        setStaff([]);
        setLoading(false);
        return;
      }
      
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const [todayBookingsRes, periodBookingsRes, servicesRes, staffRes, recurringRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, color, price_cents),
            staff:staff(name),
            customer:customers(name, phone)
          `)
          .eq('tenant_id', currentTenant.id)
          .gte('starts_at', startOfDay.toISOString())
          .lt('starts_at', endOfDay.toISOString())
          .order('starts_at'),
        
        supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, color, price_cents, duration_minutes),
            staff:staff(name, color),
            customer:customers(name, phone)
          `)
          .eq('tenant_id', currentTenant.id)
          .gte('starts_at', dateRange.from.toISOString())
          .lte('starts_at', dateRange.to.toISOString())
          .order('starts_at'),
        
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),

        supabase
          .from('recurring_clients')
          .select('*, staff:staff(name, color), service:services(name, color, duration_minutes, price_cents)')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
      ]);

      if (todayBookingsRes.error) throw todayBookingsRes.error;
      if (periodBookingsRes.error) throw periodBookingsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setTodayBookings(todayBookingsRes.data || []);
      setPeriodBookings(periodBookingsRes.data || []);
      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
      setRecurringClients(recurringRes.data || []);
      
      const revenueValue = await calculateRevenue(periodBookingsRes.data || []);
      setRevenue(revenueValue);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateRevenue = async (bookingsList: any[]) => {
    if (!currentTenant) return 0;
    
    try {
      let totalRevenue = 0;
      
      // Calculate revenue from bookings
      if (bookingsList.length > 0) {
        const bookingIds = bookingsList.map(b => b.id);
        
        // Fetch all paid payments for these bookings
        const { data: payments } = await supabase
          .from('payments')
          .select('amount_cents, status')
          .in('booking_id', bookingIds)
          .eq('status', 'paid');

        const paidPayments = payments?.reduce((sum, payment) => sum + payment.amount_cents, 0) || 0;
        
        // If there are paid payments, use that value
        if (paidPayments > 0) {
          totalRevenue += paidPayments;
        } else {
          // For bookings without online payment (confirmed/completed),
          // calculate expected revenue based on service price
          const revenueBookings = bookingsList.filter(
            booking => booking.status === 'confirmed' || booking.status === 'completed'
          );
          
          totalRevenue += revenueBookings.reduce((sum, booking) => {
            return sum + (booking.service?.price_cents || 0);
          }, 0);
        }
      }
      
      // Add product sales revenue for the period
      const { data: productSales } = await supabase
        .from('product_sales')
        .select('sale_price_snapshot_cents, quantity')
        .eq('tenant_id', currentTenant.id)
        .gte('sale_date', dateRange.from.toISOString())
        .lte('sale_date', dateRange.to.toISOString());
      
      if (productSales && productSales.length > 0) {
        const productRevenue = productSales.reduce((sum, sale) => 
          sum + (sale.sale_price_snapshot_cents * sale.quantity), 0);
        totalRevenue += productRevenue;
      }
      
      return totalRevenue;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      return 0;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  if (tenantLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-32 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Date Range Selector */}
      <DateRangeSelector className="overflow-x-auto" />

      {/* Welcome Section */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-4 md:mb-8"
      >
        <h1 className="text-xl md:text-2xl font-bold text-zinc-100 mb-1 md:mb-2">
          {getGreeting()}! 👋
        </h1>
        <p className="text-sm md:text-base text-zinc-500">
          {loading 
            ? "Carregando dados..." 
            : `Você tem ${todayBookings.length} agendamentos hoje.`
          }
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div 
        variants={staggerContainer}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4 mb-4 md:mb-8"
      >
        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/bookings')}
          className="group p-3 md:p-5 rounded-xl md:rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Calendar className="h-4 w-4 md:h-5 md:w-5 text-blue-400" />
            </div>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-zinc-100 mb-0.5 md:mb-1">
            {loading ? "..." : todayBookings.length}
          </p>
          <p className="text-xs md:text-sm text-zinc-500">Agendamentos hoje</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/services')}
          className="group p-3 md:p-5 rounded-xl md:rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Scissors className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
            </div>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-zinc-100 mb-0.5 md:mb-1">
            {loading ? "..." : services.length}
          </p>
          <p className="text-xs md:text-sm text-zinc-500">Serviços ativos</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/staff')}
          className="group p-3 md:p-5 rounded-xl md:rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 md:h-5 md:w-5 text-violet-400" />
            </div>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-zinc-100 mb-0.5 md:mb-1">
            {loading ? "..." : staff.length}
          </p>
          <p className="text-xs md:text-sm text-zinc-500">Profissionais</p>
        </motion.div>

        <motion.div 
          variants={fadeInUp}
          onClick={() => navigate('/app/finance')}
          className="group p-3 md:p-5 rounded-xl md:rounded-2xl bg-zinc-900/50 border border-zinc-800/50 hover:border-zinc-700/50 cursor-pointer transition-all duration-300"
        >
          <div className="flex items-start justify-between mb-2 md:mb-4">
            <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl bg-amber-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-amber-400" />
            </div>
            <ArrowUpRight className="h-3 w-3 md:h-4 md:w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-zinc-100 mb-0.5 md:mb-1">
            {loading ? "..." : `R$ ${(revenue / 100).toFixed(0)}`}
          </p>
          <p className="text-xs md:text-sm text-zinc-500">Faturamento</p>
        </motion.div>
      </motion.div>

      {/* Calendar Section - Full Width */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
      >
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl md:rounded-2xl">
          <div className="flex items-center justify-between p-3 md:p-5 border-b border-zinc-800/50">
            <div>
              <h2 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-blue-400" />
                Calendário de Agendamentos
              </h2>
              <p className="text-xs md:text-sm text-zinc-500 mt-0.5">
                {format(dateRange.from, "dd/MM", { locale: ptBR })} — {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/app/bookings')}
              className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 text-xs md:text-sm"
            >
              Ver Todos
            </Button>
          </div>
          <div className="p-3 md:p-5">
            {loading ? (
              <div className="text-center text-zinc-500 py-8 text-sm">Carregando calendário...</div>
            ) : (() => {
              const days = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
              const getBookingsForDay = (day: Date) => {
                const dayBookings = periodBookings.filter(b => isSameDay(new Date(b.starts_at), day));
                const dayOfWeek = day.getDay();
                const recurringForDay = recurringClients
                  .filter(r => r.weekday === dayOfWeek && new Date(r.start_date) <= day)
                  .map(r => {
                    const [h, m] = r.start_time.split(':').map(Number);
                    const startsAt = new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m);
                    const duration = r.service?.duration_minutes || r.duration_minutes;
                    const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
                    return {
                      id: `recurring-${r.id}-${day.toISOString()}`,
                      starts_at: startsAt.toISOString(),
                      ends_at: endsAt.toISOString(),
                      status: 'recurring',
                      customer: { name: r.client_name, phone: r.client_phone },
                      service: r.service || { name: 'Cliente Fixo', color: '#8B5CF6', price_cents: 0 },
                      staff: r.staff,
                      is_recurring: true,
                      notes: r.notes,
                    };
                  });
                return [...dayBookings, ...recurringForDay]
                  .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
              };

              const daysWithBookings = days.map(day => ({
                day,
                bookings: getBookingsForDay(day),
              }));

              const hasAnyBookings = daysWithBookings.some(d => d.bookings.length > 0);

              if (!hasAnyBookings) {
                return (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-6 w-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">Nenhum agendamento no período selecionado</p>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  {daysWithBookings.map(({ day, bookings: dayBookings }) => {
                    if (dayBookings.length === 0) return null;
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div key={day.toISOString()} className={`rounded-xl border ${isToday ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-zinc-800/50 bg-zinc-800/20'}`}>
                        <div className="flex items-center gap-3 px-4 py-3 border-b border-zinc-800/30">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-lg ${isToday ? 'bg-emerald-500 text-zinc-950' : 'bg-zinc-800 text-zinc-300'}`}>
                            {format(day, 'dd')}
                          </div>
                          <div>
                            <p className={`font-medium text-sm capitalize ${isToday ? 'text-emerald-400' : 'text-zinc-200'}`}>
                              {format(day, 'EEEE', { locale: ptBR })}
                            </p>
                            <p className="text-xs text-zinc-500">{format(day, "dd 'de' MMMM", { locale: ptBR })}</p>
                          </div>
                          <Badge className={`ml-auto text-xs ${isToday ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'}`}>
                            {dayBookings.length} {dayBookings.length === 1 ? 'agendamento' : 'agendamentos'}
                          </Badge>
                        </div>
                        <div className="divide-y divide-zinc-800/30">
                          {dayBookings.map((booking: any) => (
                            <div key={booking.id} className="flex items-center gap-3 md:gap-4 px-4 py-3 hover:bg-zinc-800/20 transition-colors">
                              <div
                                className="w-1 h-10 rounded-full flex-shrink-0"
                                style={{ backgroundColor: booking.service?.color || '#3B82F6' }}
                              />
                              <div className="flex items-center gap-2 text-zinc-400 w-16 flex-shrink-0">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-sm font-medium">
                                  {format(new Date(booking.starts_at), 'HH:mm')}
                                </span>
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  {booking.is_recurring && <UserCheck className="h-3.5 w-3.5 text-violet-400 flex-shrink-0" />}
                                  <p className="text-sm font-medium text-zinc-100 truncate">
                                    {booking.customer?.name}
                                  </p>
                                </div>
                                <p className="text-xs text-zinc-500 truncate">
                                  {booking.service?.name}
                                  {booking.staff?.name ? ` • ${booking.staff.name}` : ''}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                {booking.is_recurring ? (
                                  <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30 text-xs">
                                    Fixo
                                  </Badge>
                                ) : (
                                  <Badge className={`text-xs ${
                                    booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' :
                                    booking.status === 'completed' ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' :
                                    booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400 border-red-500/30' :
                                    booking.status === 'no_show' ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' :
                                    'bg-zinc-700/50 text-zinc-400 border-zinc-600/30'
                                  }`}>
                                    {booking.status === 'confirmed' ? 'Confirmado' :
                                     booking.status === 'completed' ? 'Concluído' :
                                     booking.status === 'cancelled' ? 'Cancelado' :
                                     booking.status === 'no_show' ? 'Faltou' :
                                     booking.status === 'pending' ? 'Pendente' : booking.status}
                                  </Badge>
                                )}
                                <span className="text-sm font-medium text-emerald-400 hidden sm:block">
                                  R$ {((booking.service?.price_cents || 0) / 100).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        </div>
      </motion.div>

      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-3">
        {/* Upcoming Appointments */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="lg:col-span-2"
        >
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl md:rounded-2xl">
            <div className="flex items-center justify-between p-3 md:p-5 border-b border-zinc-800/50">
              <div>
                <h2 className="text-base md:text-lg font-semibold text-zinc-100">Próximos Agendamentos</h2>
                <p className="text-xs md:text-sm text-zinc-500">Agendamentos de hoje</p>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/app/bookings')}
                className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 text-xs md:text-sm"
              >
                Ver Todos
              </Button>
            </div>
            <div className="p-3 md:p-5">
              <div className="space-y-2 md:space-y-3">
                {loading ? (
                  <div className="text-center text-zinc-500 py-6 md:py-8 text-sm">
                    Carregando agendamentos...
                  </div>
                ) : todayBookings.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-zinc-800 flex items-center justify-center mx-auto mb-3 md:mb-4">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-zinc-600" />
                    </div>
                    <p className="text-sm text-zinc-500">Nenhum agendamento para hoje</p>
                  </div>
                ) : (
                  todayBookings.slice(0, 4).map((booking) => (
                    <div 
                      key={booking.id} 
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-lg md:rounded-xl bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 md:gap-4">
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-zinc-700/50 rounded-full flex items-center justify-center flex-shrink-0">
                          <Users className="h-4 w-4 md:h-5 md:w-5 text-zinc-400" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-sm md:text-base text-zinc-100 truncate">{booking.customer?.name}</h4>
                          <p className="text-xs md:text-sm text-zinc-500 truncate">{booking.service?.name}</p>
                          <div className="flex items-center mt-1 gap-2 md:gap-3 flex-wrap">
                            <span className="text-xs text-zinc-500 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(booking.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-xs text-zinc-500 flex items-center hidden sm:flex">
                              <Phone className="h-3 w-3 mr-1" />
                              {booking.customer?.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={`px-2 md:px-3 py-1 rounded-full text-xs font-medium self-start sm:self-auto ${
                        booking.status === 'confirmed' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : 'bg-zinc-700/50 text-zinc-400'
                      }`}>
                        {booking.status === 'confirmed' ? 'Confirmado' : 
                         booking.status === 'pending' ? 'Pendente' : 
                         booking.status}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Sidebar - Mobile: Horizontal scroll, Desktop: Vertical stack */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="space-y-4 md:space-y-6"
        >
          {/* Top Services */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl md:rounded-2xl">
            <div className="p-3 md:p-5 border-b border-zinc-800/50">
              <h2 className="text-base md:text-lg font-semibold text-zinc-100">Serviços Populares</h2>
              <p className="text-xs md:text-sm text-zinc-500">Este mês</p>
            </div>
            <div className="p-3 md:p-5">
              <div className="space-y-3 md:space-y-4">
                {loading ? (
                  <div className="text-center text-zinc-500">
                    Carregando...
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center text-zinc-500">
                    Nenhum serviço cadastrado
                  </div>
                ) : (
                  services.slice(0, 3).map((service) => (
                    <div key={service.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ 
                            backgroundColor: `${service.color}15`,
                            color: service.color 
                          }}
                        >
                          <Scissors className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium text-zinc-200 text-sm">{service.name}</p>
                          <p className="text-xs text-zinc-500">{service.duration_minutes}min</p>
                        </div>
                      </div>
                      <p className="font-medium text-emerald-400 text-sm">
                        R$ {(service.price_cents / 100).toFixed(0)}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl md:rounded-2xl">
            <div className="p-3 md:p-5 border-b border-zinc-800/50">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                <h2 className="text-base md:text-lg font-semibold text-zinc-100">Ações Rápidas</h2>
              </div>
            </div>
            <div className="p-3 md:p-5 space-y-2">
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowNewService(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                Novo Serviço
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowNewStaff(true)}
              >
                <Users className="h-4 w-4 mr-2" />
                Adicionar Profissional
              </Button>
              <Button 
                variant="ghost" 
                className="w-full justify-start text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50" 
                size="sm"
                onClick={() => setShowBlockTime(true)}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Bloquear Horário
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      <NewServiceModal 
        open={showNewService} 
        onOpenChange={setShowNewService}
        onSuccess={loadDashboardData}
      />
      <NewStaffModal 
        open={showNewStaff} 
        onOpenChange={setShowNewStaff}
        onSuccess={loadDashboardData}
      />
      <BlockTimeModal 
        open={showBlockTime} 
        onOpenChange={setShowBlockTime}
        onSuccess={loadDashboardData}
      />
    </div>
  );
};

export default Dashboard;
