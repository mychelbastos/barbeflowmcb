import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { dashPath } from "@/lib/hostname";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { motion } from "framer-motion";
import { 
  Calendar, Plus, Clock, Users, TrendingUp, Scissors, Phone,
  ArrowUpRight, Sparkles, UserCheck, User,
} from "lucide-react";
import { useCashRevenue } from "@/hooks/useCashRevenue";
import { WeeklyScheduleGrid } from "@/components/dashboard/WeeklyScheduleGrid";
import { WeeklyBarChart } from "@/components/dashboard/WeeklyBarChart";
import { RevenueLineChart } from "@/components/dashboard/RevenueLineChart";
import { ClientRevenuePanel } from "@/components/dashboard/ClientRevenuePanel";
import { BookingDetailsModal } from "@/components/modals/BookingDetailsModal";

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
  const [loading, setLoading] = useState(true);


  const { user, signOut, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { dateRange } = useDateRange();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: cashData } = useCashRevenue({ tenantId: currentTenant?.id, dateRange });

  const updateBookingStatus = useCallback(async (bookingId: string, newStatus: string, booking?: any) => {
    if (!currentTenant) return;
    try {
      if (newStatus === "cancelled") {
        const cancellationMinHours = currentTenant.settings?.cancellation_min_hours ?? 4;
        const { data: result, error: rpcError } = await supabase.rpc("cancel_booking_with_refund", {
          p_booking_id: bookingId,
          p_tenant_id: currentTenant.id,
          p_cancellation_min_hours: cancellationMinHours,
        });
        if (rpcError) throw rpcError;
        const res = result as any;
        if (!res?.success) throw new Error(res?.error || "Erro ao cancelar");
      } else if (newStatus === "no_show") {
        const { data: result, error: rpcError } = await supabase.rpc("mark_booking_no_show", {
          p_booking_id: bookingId,
          p_tenant_id: currentTenant.id,
        });
        if (rpcError) throw rpcError;
        const res = result as any;
        if (!res?.success) throw new Error(res?.error || "Erro ao marcar falta");
      } else {
        const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
        if (error) throw error;
      }

      if (newStatus === "completed") {
        await supabase.from("bookings").update({ session_outcome: "consumed" }).eq("id", bookingId).not("customer_package_id", "is", null).or("customer_subscription_id.not.is.null");
      }

      const notificationTypeMap: Record<string, string | null> = {
        cancelled: "booking_cancelled", confirmed: "booking_confirmed", completed: null, no_show: "booking_no_show",
      };
      const notificationType = notificationTypeMap[newStatus];
      if (notificationType) {
        try { await supabase.functions.invoke("send-whatsapp-notification", { body: { type: notificationType, booking_id: bookingId, tenant_id: currentTenant.id } }); } catch {}
      }

      toast({ title: "Status atualizado" });

      if (newStatus === "completed") {
        const { data: updated } = await supabase
          .from("bookings")
          .select("*, service:services(name, color, duration_minutes, price_cents), staff:staff(name, color, is_owner, default_commission_percent, product_commission_percent), customer:customers(name, phone, notes)")
          .eq("id", bookingId)
          .single();
        if (updated) setSelectedBooking(updated);
      } else {
        setSelectedBooking(null);
      }
      loadDashboardData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao atualizar status", variant: "destructive" });
    }
  }, [currentTenant]);

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
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };



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
      iconColor: "text-blue-500",
      glowColor: "group-hover:shadow-blue-500/10",
      href: dashPath('/app/bookings'),
    },
    {
      label: "Serviços ativos",
      value: loading ? "—" : String(services.length),
      sub: "catálogo",
      icon: Scissors,
      gradient: "from-primary/20 to-primary/5",
      iconColor: "text-primary",
      glowColor: "group-hover:shadow-primary/10",
      href: dashPath('/app/services'),
    },
    {
      label: "Profissionais",
      value: loading ? "—" : String(staff.length),
      sub: "na equipe",
      icon: Users,
      gradient: "from-violet-500/20 to-violet-600/5",
      iconColor: "text-violet-500",
      glowColor: "group-hover:shadow-violet-500/10",
      href: dashPath('/app/staff'),
    },
    {
      label: "Faturamento",
      value: loading ? "—" : `R$ ${((cashData?.totalIncome || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`,
      sub: "no período",
      icon: TrendingUp,
      gradient: "from-amber-500/20 to-amber-600/5",
      iconColor: "text-amber-500",
      glowColor: "group-hover:shadow-amber-500/10",
      href: dashPath('/app/finance'),
    },
  ];

  const statusConfig: Record<string, { label: string; className: string }> = {
    confirmed: { label: 'Confirmado', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' },
    completed: { label: 'Concluído', className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' },
    cancelled: { label: 'Cancelado', className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20' },
    no_show: { label: 'Faltou', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' },
    pending: { label: 'Pendente', className: 'bg-muted text-muted-foreground border border-border' },
  };

  return (
    <div className="space-y-5 px-3 md:px-0 overflow-x-hidden">
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
                  className="w-10 h-10 rounded-xl bg-muted/60 flex items-center justify-center backdrop-blur-sm"
                  whileHover={{ scale: 1.15, rotate: 8 }}
                  transition={gentleSpring}
                >
                  <card.icon className={`h-[18px] w-[18px] ${card.iconColor}`} />
                </motion.div>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors duration-500" />
              </div>
              <p className="text-2xl md:text-[28px] font-bold text-foreground tracking-tight leading-none mb-1">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground font-medium">{card.label}</p>
              {card.sub && <p className="text-[10px] text-muted-foreground/70 mt-0.5 font-medium">{card.sub}</p>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Main Grid: Schedule + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4 md:gap-5">
        {/* Left Column: Schedule */}
        <div className="space-y-4">
          {!loading && (
            <WeeklyScheduleGrid
              bookings={allBookings}
              dateRange={dateRange}
              onSelectBooking={(booking: any) => {
                setSelectedBooking(booking);
              }}
            />
          )}
          {loading && (
            <div className="rounded-2xl glass-panel h-80 animate-pulse" />
          )}
        </div>

        {/* Right Column: Revenue Panel + Bar Chart */}
        <div className="space-y-4">
          {!loading && (
            <ClientRevenuePanel bookings={allBookings} totalRevenue={cashData?.totalIncome || 0} />
          )}

          {!loading && (
            <WeeklyBarChart bookings={allBookings} dateRange={dateRange} />
          )}
        </div>
      </div>

      {/* Revenue Line Chart — full width */}
      {!loading && cashData && (
        <RevenueLineChart dailyData={cashData.dailyIncome} />
      )}

      {/* Booking Detail Modal */}
      {currentTenant && (
        <BookingDetailsModal
          booking={selectedBooking}
          tenantId={currentTenant.id}
          open={!!selectedBooking}
          onOpenChange={(open) => { if (!open) { setSelectedBooking(null); } }}
          showActions
          onEdit={() => {
            setSelectedBooking(null);
            navigate(dashPath("/app/bookings"));
          }}
          onStatusChange={updateBookingStatus}
        />
      )}
    </div>
  );
};

export default Dashboard;
