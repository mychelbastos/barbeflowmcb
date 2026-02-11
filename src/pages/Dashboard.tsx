import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { dashPath } from "@/lib/hostname";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { format, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";

const smoothSpring = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.8 };
const gentleEase = [0.22, 1, 0.36, 1] as const;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.05 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.97 },
  show: { 
    opacity: 1, y: 0, scale: 1,
    transition: { duration: 0.5, ease: gentleEase },
  },
};
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
  UserCheck,
  User,
  ChevronRight,
} from "lucide-react";
import { NewServiceModal, NewStaffModal, BlockTimeModal } from "@/components/modals/QuickActions";

const Dashboard = () => {
  const [todayBookings, setTodayBookings] = useState<any[]>([]);
  const [periodBookings, setPeriodBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [recurringClients, setRecurringClients] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [revenue, setRevenue] = useState<number>(0);
  const [loading, setLoading] = useState(true);
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
        supabase.from('bookings').select(`*, service:services(name, color, price_cents), staff:staff(name), customer:customers(name, phone)`)
          .eq('tenant_id', currentTenant.id).gte('starts_at', startOfDay.toISOString()).lt('starts_at', endOfDay.toISOString()).order('starts_at'),
        supabase.from('bookings').select(`*, service:services(name, color, price_cents, duration_minutes), staff:staff(name, color), customer:customers(name, phone)`)
          .eq('tenant_id', currentTenant.id).gte('starts_at', dateRange.from.toISOString()).lte('starts_at', dateRange.to.toISOString()).order('starts_at'),
        supabase.from('services').select('*').eq('tenant_id', currentTenant.id).eq('active', true),
        supabase.from('staff').select('*').eq('tenant_id', currentTenant.id).eq('active', true),
        supabase.from('recurring_clients').select('*, staff:staff(name, color), service:services(name, color, duration_minutes, price_cents), customer:customers(name, phone)')
          .eq('tenant_id', currentTenant.id).eq('active', true)
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
      if (bookingsList.length > 0) {
        const bookingIds = bookingsList.map(b => b.id);
        const { data: payments } = await supabase.from('payments').select('amount_cents, status').in('booking_id', bookingIds).eq('status', 'paid');
        const paidPayments = payments?.reduce((sum, payment) => sum + payment.amount_cents, 0) || 0;
        if (paidPayments > 0) {
          totalRevenue += paidPayments;
        } else {
          const revenueBookings = bookingsList.filter(booking => booking.status === 'confirmed' || booking.status === 'completed');
          totalRevenue += revenueBookings.reduce((sum, booking) => sum + (booking.service?.price_cents || 0), 0);
        }
      }
      const { data: productSales } = await supabase.from('product_sales').select('sale_price_snapshot_cents, quantity')
        .eq('tenant_id', currentTenant.id).gte('sale_date', dateRange.from.toISOString()).lte('sale_date', dateRange.to.toISOString());
      if (productSales && productSales.length > 0) {
        totalRevenue += productSales.reduce((sum, sale) => sum + (sale.sale_price_snapshot_cents * sale.quantity), 0);
      }
      return totalRevenue;
    } catch (error) {
      console.error('Error fetching revenue data:', error);
      return 0;
    }
  };

  if (tenantLoading) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-zinc-900/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  const confirmedToday = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;
  const pendingToday = todayBookings.filter(b => b.status === 'pending').length;

  const statCards = [
    {
      label: "Agendamentos hoje",
      value: loading ? "—" : String(todayBookings.length),
      sub: loading ? "" : `${confirmedToday} confirmados`,
      icon: Calendar,
      iconBg: "bg-blue-500/10",
      iconColor: "text-blue-400",
      href: dashPath('/app/bookings'),
    },
    {
      label: "Serviços ativos",
      value: loading ? "—" : String(services.length),
      sub: "catálogo",
      icon: Scissors,
      iconBg: "bg-emerald-500/10",
      iconColor: "text-emerald-400",
      href: dashPath('/app/services'),
    },
    {
      label: "Profissionais",
      value: loading ? "—" : String(staff.length),
      sub: "na equipe",
      icon: Users,
      iconBg: "bg-violet-500/10",
      iconColor: "text-violet-400",
      href: dashPath('/app/staff'),
    },
    {
      label: "Faturamento",
      value: loading ? "—" : `R$ ${(revenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      sub: "no período",
      icon: TrendingUp,
      iconBg: "bg-amber-500/10",
      iconColor: "text-amber-400",
      href: dashPath('/app/finance'),
    },
  ];

  // Calendar helpers
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
          customer: r.customer || { name: 'Cliente Fixo', phone: '' },
          service: r.service || { name: 'Cliente Fixo', color: '#8B5CF6', price_cents: 0 },
          staff: r.staff,
          is_recurring: true,
          notes: r.notes,
        };
      });
    return [...dayBookings, ...recurringForDay]
      .sort((a: any, b: any) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  };

  const daysWithBookings = days.map(day => ({ day, bookings: getBookingsForDay(day) }));
  const hasAnyBookings = daysWithBookings.some(d => d.bookings.length > 0);

  const quickActions = [
    { label: "Novo Serviço", icon: Plus, onClick: () => setShowNewService(true) },
    { label: "Adicionar Profissional", icon: Users, onClick: () => setShowNewStaff(true) },
    { label: "Bloquear Horário", icon: Calendar, onClick: () => setShowBlockTime(true) },
  ];

  return (
    <div className="space-y-6 px-4 md:px-0">
      {/* Date Range */}
      <DateRangeSelector className="overflow-x-auto" />

      {/* Stats */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3"
      >
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={itemVariants}
            whileHover={{ y: -4, transition: smoothSpring }}
            whileTap={{ scale: 0.98, transition: { duration: 0.1 } }}
            onClick={() => navigate(card.href)}
            className="group relative cursor-pointer"
          >
            {/* Glow on hover */}
            <motion.div
              className="absolute -inset-px rounded-2xl pointer-events-none"
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              style={{ background: "linear-gradient(135deg, rgba(113,113,122,0.15), rgba(82,82,91,0.08))" }}
            />
            <div className="relative p-4 md:p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-sm hover:border-zinc-700/60 transition-colors duration-500">
              <div className="flex items-start justify-between mb-3">
                <motion.div
                  className={`w-9 h-9 rounded-xl ${card.iconBg} flex items-center justify-center`}
                  whileHover={{ scale: 1.1, rotate: 3 }}
                  transition={smoothSpring}
                >
                  <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
                </motion.div>
                <motion.div
                  initial={{ opacity: 0.3, x: -2, y: 2 }}
                  whileHover={{ opacity: 1, x: 2, y: -2 }}
                  transition={{ duration: 0.3 }}
                >
                  <ArrowUpRight className="h-3.5 w-3.5 text-zinc-500" />
                </motion.div>
              </div>
              <p className="text-xl md:text-2xl font-bold text-zinc-100 tracking-tight mb-0.5">
                {card.value}
              </p>
              <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
              {card.sub && (
                <p className="text-[10px] text-zinc-600 mt-0.5">{card.sub}</p>
              )}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main grid: Calendar + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Calendar */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: gentleEase }}
          className="rounded-2xl bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-sm overflow-hidden"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/40">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-400" />
                Agenda
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {format(dateRange.from, "dd/MM", { locale: ptBR })} — {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(dashPath('/app/bookings'))}
              className="text-xs text-zinc-500 hover:text-zinc-100 gap-1"
            >
              Ver Todos <ChevronRight className="h-3 w-3" />
            </Button>
          </div>

          <div className="p-4">
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-zinc-800/30 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !hasAnyBookings ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 rounded-2xl bg-zinc-800/60 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="h-5 w-5 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500 font-medium">Nenhum agendamento</p>
                <p className="text-xs text-zinc-600 mt-1">no período selecionado</p>
              </div>
            ) : (
              <div className="space-y-2">
                {daysWithBookings.map(({ day, bookings: dayBookings }) => {
                  if (dayBookings.length === 0) return null;
                  const isToday = isSameDay(day, new Date());
                  return (
                    <div key={day.toISOString()} className="group/day">
                      {/* Day header */}
                      <div className="flex items-center gap-3 px-3 py-2.5">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm transition-colors ${
                          isToday 
                            ? 'bg-emerald-500 text-zinc-950 shadow-lg shadow-emerald-500/20' 
                            : 'bg-zinc-800/60 text-zinc-400'
                        }`}>
                          {format(day, 'dd')}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium capitalize ${isToday ? 'text-emerald-400' : 'text-zinc-300'}`}>
                            {format(day, 'EEEE', { locale: ptBR })}
                          </p>
                          <p className="text-[11px] text-zinc-600">{format(day, "dd 'de' MMMM", { locale: ptBR })}</p>
                        </div>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          isToday 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : 'bg-zinc-800/60 text-zinc-500'
                        }`}>
                          {dayBookings.length}
                        </span>
                      </div>

                      {/* Bookings */}
                      <div className="ml-[18px] border-l-2 border-zinc-800/40 pl-5 pb-2 space-y-1">
                        <AnimatePresence mode="popLayout">
                        {dayBookings.map((booking: any, bIdx: number) => (
                          <motion.div
                            key={booking.id}
                            initial={{ opacity: 0, x: -12 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{ duration: 0.35, delay: bIdx * 0.04, ease: gentleEase }}
                            whileHover={{ x: 4, backgroundColor: "rgba(63,63,70,0.2)" }}
                            onClick={() => setSelectedBooking(booking)}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer group/item"
                          >
                            <div
                              className="w-1 h-8 rounded-full flex-shrink-0 opacity-80 group-hover/item:opacity-100 transition-opacity"
                              style={{ backgroundColor: booking.service?.color || '#3B82F6' }}
                            />
                            <div className="flex items-center gap-2 text-zinc-500 w-14 flex-shrink-0">
                              <Clock className="h-3 w-3" />
                              <span className="text-xs font-mono font-medium">
                                {format(new Date(booking.starts_at), 'HH:mm')}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {booking.is_recurring && <UserCheck className="h-3 w-3 text-violet-400 flex-shrink-0" />}
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                  {booking.customer?.name}
                                </p>
                              </div>
                              <p className="text-[11px] text-zinc-600 truncate">
                                {booking.service?.name}
                                {booking.staff?.name ? ` · ${booking.staff.name}` : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {booking.is_recurring ? (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                                  Fixo
                                </span>
                              ) : (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                  booking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                                  booking.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                                  booking.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                  booking.status === 'no_show' ? 'bg-amber-500/10 text-amber-400' :
                                  'bg-zinc-800/60 text-zinc-500'
                                }`}>
                                  {booking.status === 'confirmed' ? 'Confirmado' :
                                   booking.status === 'completed' ? 'Concluído' :
                                   booking.status === 'cancelled' ? 'Cancelado' :
                                   booking.status === 'no_show' ? 'Faltou' :
                                   booking.status === 'pending' ? 'Pendente' : booking.status}
                                </span>
                              )}
                              <span className="text-xs font-semibold text-zinc-400 hidden sm:block tabular-nums">
                                R$ {((booking.service?.price_cents || 0) / 100).toFixed(0)}
                              </span>
                            </div>
                          </motion.div>
                        ))}
                        </AnimatePresence>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* Sidebar */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="space-y-4"
        >
          {/* Quick Actions */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800/40">
              <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <motion.div
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 5 }}
                >
                  <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                </motion.div>
                Ações Rápidas
              </h3>
            </div>
            <div className="p-3 space-y-1">
              {quickActions.map((action, i) => (
                <motion.button
                  key={action.label}
                  onClick={action.onClick}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={smoothSpring}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 transition-colors duration-300 group"
                >
                  <motion.div
                    className="w-8 h-8 rounded-lg bg-zinc-800/60 group-hover:bg-zinc-700/60 flex items-center justify-center transition-colors duration-300"
                    whileHover={{ rotate: 90 }}
                    transition={smoothSpring}
                  >
                    <action.icon className="h-4 w-4" />
                  </motion.div>
                  <span className="text-sm font-medium">{action.label}</span>
                  <motion.div
                    className="ml-auto"
                    initial={{ opacity: 0, x: -4 }}
                    whileHover={{ opacity: 1, x: 0 }}
                  >
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </motion.div>
                </motion.button>
              ))}
            </div>
          </motion.div>

          {/* Popular Services */}
          <motion.div
            variants={itemVariants}
            className="rounded-2xl bg-zinc-900/60 border border-zinc-800/40 backdrop-blur-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800/40">
              <h3 className="text-sm font-semibold text-zinc-100">Serviços Populares</h3>
              <p className="text-[11px] text-zinc-600 mt-0.5">Catálogo ativo</p>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-10 bg-zinc-800/30 rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : services.length === 0 ? (
                <p className="text-sm text-zinc-600 text-center py-6">Nenhum serviço</p>
              ) : (
                <div className="space-y-2.5">
                  {services.slice(0, 5).map((service, sIdx) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.35, delay: 0.35 + sIdx * 0.06, ease: gentleEase }}
                      whileHover={{ x: 3 }}
                      className="flex items-center gap-3 group cursor-default"
                    >
                      <motion.div
                        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${service.color}12` }}
                        whileHover={{ scale: 1.15 }}
                        transition={smoothSpring}
                      >
                        <Scissors className="h-3.5 w-3.5" style={{ color: service.color }} />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-300 truncate">{service.name}</p>
                        <p className="text-[11px] text-zinc-600">{service.duration_minutes} min</p>
                      </div>
                      <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                        R$ {(service.price_cents / 100).toFixed(0)}
                      </span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Modals */}
      <NewServiceModal open={showNewService} onOpenChange={setShowNewService} onSuccess={loadDashboardData} />
      <NewStaffModal open={showNewStaff} onOpenChange={setShowNewStaff} onSuccess={loadDashboardData} />
      <BlockTimeModal open={showBlockTime} onOpenChange={setShowBlockTime} onSuccess={loadDashboardData} />

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md bg-zinc-900/95 backdrop-blur-xl border-zinc-800/60 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-base">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              {/* Customer */}
              <div className="p-4 rounded-xl bg-zinc-800/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-zinc-700/50 flex items-center justify-center">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-zinc-100">{selectedBooking.customer?.name}</p>
                    {selectedBooking.is_recurring && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 mt-0.5 inline-block">
                        Cliente Fixo
                      </span>
                    )}
                  </div>
                </div>
                {selectedBooking.customer?.phone && (
                  <div className="flex items-center gap-2 text-sm text-zinc-500">
                    <Phone className="h-3.5 w-3.5" />
                    <span>{selectedBooking.customer.phone}</span>
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="space-y-3">
                {[
                  { icon: Scissors, label: "Serviço", value: selectedBooking.service?.name },
                  { icon: Clock, label: "Horário", value: `${format(new Date(selectedBooking.starts_at), "dd/MM 'às' HH:mm", { locale: ptBR })} — ${format(new Date(selectedBooking.ends_at), "HH:mm")}` },
                  ...(selectedBooking.staff?.name ? [{ icon: Users, label: "Profissional", value: selectedBooking.staff.name }] : []),
                  { icon: TrendingUp, label: "Valor", value: `R$ ${((selectedBooking.service?.price_cents || 0) / 100).toFixed(2)}`, highlight: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <span className={`text-sm font-medium ${(item as any).highlight ? 'text-emerald-400 font-bold' : 'text-zinc-200'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
                {!selectedBooking.is_recurring && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-500">Status</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      selectedBooking.status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-400' :
                      selectedBooking.status === 'completed' ? 'bg-blue-500/10 text-blue-400' :
                      selectedBooking.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                      'bg-zinc-800/60 text-zinc-500'
                    }`}>
                      {selectedBooking.status === 'confirmed' ? 'Confirmado' :
                       selectedBooking.status === 'completed' ? 'Concluído' :
                       selectedBooking.status === 'cancelled' ? 'Cancelado' :
                       selectedBooking.status === 'no_show' ? 'Faltou' : selectedBooking.status}
                    </span>
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="pt-3 border-t border-zinc-800/40">
                    <p className="text-[11px] text-zinc-600 mb-1">Observações</p>
                    <p className="text-sm text-zinc-300">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
