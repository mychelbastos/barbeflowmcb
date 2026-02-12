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
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  Calendar, Plus, Clock, Users, TrendingUp, Scissors, Phone,
  ArrowUpRight, Sparkles, UserCheck, User, ChevronRight, Zap,
} from "lucide-react";
import { NewServiceModal, NewStaffModal, BlockTimeModal } from "@/components/modals/QuickActions";
import { WeeklyScheduleGrid } from "@/components/dashboard/WeeklyScheduleGrid";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { RevenueLineChart } from "@/components/dashboard/RevenueLineChart";
import { ClientRevenuePanel } from "@/components/dashboard/ClientRevenuePanel";

const spring = { type: "spring" as const, stiffness: 200, damping: 26, mass: 0.6 };
const gentleSpring = { type: "spring" as const, stiffness: 120, damping: 20, mass: 0.8 };
const ease = [0.16, 1, 0.3, 1] as const;

const stagger = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20, scale: 0.96, filter: "blur(4px)" },
  show: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)", transition: { duration: 0.6, ease } },
};

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

  // Build all bookings including recurring virtual ones
  const allBookings = useMemo(() => {
    const virtualRecurring = recurringClients.flatMap(r => {
      const { from, to } = dateRange;
      const result: any[] = [];
      const current = new Date(from);
      while (current <= to) {
        if (current.getDay() === r.weekday && new Date(r.start_date) <= current) {
          const [h, m] = r.start_time.split(':').map(Number);
          const startsAt = new Date(current.getFullYear(), current.getMonth(), current.getDate(), h, m);
          const duration = r.service?.duration_minutes || r.duration_minutes;
          const endsAt = new Date(startsAt.getTime() + duration * 60 * 1000);
          result.push({
            id: `recurring-${r.id}-${current.toISOString()}`,
            starts_at: startsAt.toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'recurring',
            customer: r.customer || { name: 'Cliente Fixo', phone: '' },
            service: r.service || { name: 'Horário Fixo', color: '#8B5CF6', price_cents: 0 },
            staff: r.staff,
            is_recurring: true,
            notes: r.notes,
          });
        }
        current.setDate(current.getDate() + 1);
      }
      return result;
    });
    return [...periodBookings, ...virtualRecurring];
  }, [periodBookings, recurringClients, dateRange]);

  if (tenantLoading) {
    return (
      <div className="space-y-4 p-4 md:p-0">
        {[...Array(4)].map((_, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: i * 0.1 }}
            className="h-24 rounded-2xl animate-pulse glass-panel" 
          />
        ))}
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  const confirmedToday = todayBookings.filter(b => b.status === 'confirmed' || b.status === 'completed').length;

  const statCards = [
    {
      label: "Agendamentos hoje",
      value: loading ? "—" : String(todayBookings.length),
      sub: loading ? "" : `${confirmedToday} confirmados`,
      icon: Calendar,
      gradient: "from-blue-500/20 to-blue-600/5",
      iconColor: "text-blue-400",
      glowColor: "group-hover:shadow-blue-500/10",
      href: dashPath('/app/bookings'),
    },
    {
      label: "Serviços ativos",
      value: loading ? "—" : String(services.length),
      sub: "catálogo",
      icon: Scissors,
      gradient: "from-emerald-500/20 to-emerald-600/5",
      iconColor: "text-emerald-400",
      glowColor: "group-hover:shadow-emerald-500/10",
      href: dashPath('/app/services'),
    },
    {
      label: "Profissionais",
      value: loading ? "—" : String(staff.length),
      sub: "na equipe",
      icon: Users,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-400",
      glowColor: "group-hover:shadow-violet-500/10",
      href: dashPath('/app/staff'),
    },
    {
      label: "Faturamento",
      value: loading ? "—" : `R$ ${(revenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      sub: "no período",
      icon: TrendingUp,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-400",
      glowColor: "group-hover:shadow-amber-500/10",
      href: dashPath('/app/finance'),
    },
  ];

  const quickActions = [
    { label: "Novo Serviço", desc: "Adicionar ao catálogo", icon: Scissors, onClick: () => setShowNewService(true) },
    { label: "Profissional", desc: "Adicionar à equipe", icon: Users, onClick: () => setShowNewStaff(true) },
    { label: "Bloquear Horário", desc: "Reservar intervalo", icon: Calendar, onClick: () => setShowBlockTime(true) },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' },
    completed: { label: 'Concluído', className: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500/10 text-red-400 border border-red-500/20' },
    no_show: { label: 'Faltou', className: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' },
    pending: { label: 'Pendente', className: 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/30' },
  };

  return (
    <div className="space-y-5 px-4 md:px-0">
      {/* Date Range */}
      <DateRangeSelector className="overflow-x-auto" />

      {/* Stat Cards */}
      <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {statCards.map((card) => (
          <motion.div
            key={card.label}
            variants={fadeUp}
            whileHover={{ y: -8, scale: 1.02, transition: gentleSpring }}
            whileTap={{ scale: 0.96, transition: { duration: 0.1 } }}
            onClick={() => navigate(card.href)}
            className={`group relative cursor-pointer rounded-2xl glass-panel glass-panel-hover transition-shadow duration-700 shadow-lg shadow-transparent ${card.glowColor} overflow-hidden`}
          >
            <motion.div 
              className={`absolute inset-0 bg-gradient-to-br ${card.gradient} rounded-2xl`}
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
            <div className="relative p-4 md:p-5">
              <div className="flex items-start justify-between mb-3">
                <motion.div
                  className="w-10 h-10 rounded-xl bg-zinc-800/40 flex items-center justify-center backdrop-blur-sm"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={gentleSpring}
                >
                  <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
                </motion.div>
                <ArrowUpRight className="h-3.5 w-3.5 text-zinc-700 group-hover:text-zinc-400 transition-colors duration-500" />
              </div>
              <p className="text-2xl md:text-[28px] font-bold text-zinc-100 tracking-tight leading-none mb-1">
                {card.value}
              </p>
              <p className="text-xs text-zinc-500 font-medium">{card.label}</p>
              {card.sub && <p className="text-[10px] text-zinc-600 mt-0.5 font-medium">{card.sub}</p>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid: Schedule + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-5">
        {/* Left Column: Schedule + Charts */}
        <div className="space-y-4">
          {/* Weekly Schedule Grid */}
          {!loading && (
            <WeeklyScheduleGrid
              bookings={allBookings}
              dateRange={dateRange}
              onSelectBooking={setSelectedBooking}
            />
          )}
          {loading && (
            <div className="rounded-2xl glass-panel h-80 animate-pulse" />
          )}

          {/* Revenue Line Chart */}
          {!loading && (
            <RevenueLineChart bookings={allBookings} dateRange={dateRange} />
          )}
        </div>

        {/* Right Column: Revenue Panel + Bar Chart + Quick Actions */}
        <div className="space-y-4">
          {!loading && (
            <ClientRevenuePanel bookings={allBookings} totalRevenue={revenue} />
          )}

          {!loading && (
            <WeeklyBarChart bookings={allBookings} dateRange={dateRange} />
          )}

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.6, delay: 0.35, ease }}
            className="rounded-2xl glass-panel overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-zinc-800/30 flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500/20 to-teal-500/10 flex items-center justify-center">
                <Zap className="h-3.5 w-3.5 text-emerald-400" />
              </div>
              <h3 className="text-sm font-bold text-zinc-100 tracking-tight">Ações Rápidas</h3>
            </div>
            <div className="p-3 space-y-1">
              {quickActions.map((action) => (
                <motion.button
                  key={action.label}
                  onClick={action.onClick}
                  whileHover={{ x: 6, transition: gentleSpring }}
                  whileTap={{ scale: 0.95, transition: { duration: 0.1 } }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/30 transition-all duration-300 group"
                >
                  <div className="w-9 h-9 rounded-xl bg-zinc-800/40 group-hover:bg-zinc-700/40 flex items-center justify-center transition-all duration-300">
                    <action.icon className="h-4 w-4" />
                  </div>
                  <div className="text-left flex-1">
                    <span className="text-sm font-semibold block">{action.label}</span>
                    <span className="text-[11px] text-zinc-600 block">{action.desc}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-zinc-500" />
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Modals */}
      <NewServiceModal open={showNewService} onOpenChange={setShowNewService} onSuccess={loadDashboardData} />
      <NewStaffModal open={showNewStaff} onOpenChange={setShowNewStaff} onSuccess={loadDashboardData} />
      <BlockTimeModal open={showBlockTime} onOpenChange={setShowBlockTime} onSuccess={loadDashboardData} />

      {/* Booking Detail Modal */}
      <Dialog open={!!selectedBooking} onOpenChange={(open) => !open && setSelectedBooking(null)}>
        <DialogContent className="sm:max-w-md glass-panel border-zinc-800/30 shadow-2xl shadow-black/40">
          <DialogHeader>
            <DialogTitle className="text-zinc-100 text-base font-bold tracking-tight">Detalhes do Agendamento</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <motion.div 
              initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              transition={{ duration: 0.5, ease }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-zinc-800/20 border border-zinc-800/30 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                    <User className="h-5 w-5 text-zinc-400" />
                  </div>
                  <div>
                    <p className="font-bold text-zinc-100">{selectedBooking.customer?.name}</p>
                    {selectedBooking.is_recurring && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 mt-0.5 inline-block">
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

              <div className="space-y-3">
                {[
                  { icon: Scissors, label: "Serviço", value: selectedBooking.service?.name },
                  { icon: Clock, label: "Horário", value: `${format(new Date(selectedBooking.starts_at), "dd/MM 'às' HH:mm", { locale: ptBR })} — ${format(new Date(selectedBooking.ends_at), "HH:mm")}` },
                  ...(selectedBooking.staff?.name ? [{ icon: Users, label: "Profissional", value: selectedBooking.staff.name }] : []),
                  { icon: TrendingUp, label: "Valor", value: `R$ ${((selectedBooking.service?.price_cents || 0) / 100).toFixed(2)}`, highlight: true },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </div>
                    <span className={`text-sm font-semibold ${(item as any).highlight ? 'text-emerald-400 font-bold' : 'text-zinc-200'}`}>
                      {item.value}
                    </span>
                  </div>
                ))}
                {!selectedBooking.is_recurring && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-zinc-500">Status</span>
                    {(() => {
                      const st = statusConfig[selectedBooking.status] || statusConfig.pending;
                      return (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.className}`}>
                          {st.label}
                        </span>
                      );
                    })()}
                  </div>
                )}
                {selectedBooking.notes && (
                  <div className="pt-3 border-t border-zinc-800/30">
                    <p className="text-[11px] text-zinc-600 mb-1 font-medium">Observações</p>
                    <p className="text-sm text-zinc-300">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
