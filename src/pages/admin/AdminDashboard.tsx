import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store, CreditCard, DollarSign, Users, Calendar, Wallet, Eye, BarChart3, UserPlus } from "lucide-react";

interface DashboardStats {
  tenants: { total: number; active: number; trialing: number; canceled: number; none: number };
  revenue: { mrr_cents: number; commission_total_cents: number; commission_count: number };
  engagement: { total_customers: number; total_bookings: number; total_payments: number; bookings_7d: number; bookings_30d: number };
  tracking: { visitor_sessions: number; sessions_with_utm: number; sessions_with_fbclid: number; meta_events_sent: number; meta_events_success: number };
  onboarding: { total: number; completed: number; skipped: number; questionnaire_done: number };
}

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="h-4 w-4 text-[hsl(44,65%,54%)]" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mt-8 mb-3">{children}</h3>;
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-4 py-3">
      <p className="text-lg font-semibold text-zinc-200">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_dashboard_stats");
      if (data) setStats(data as unknown as DashboardStats);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return <p className="text-zinc-500">Erro ao carregar dados.</p>;

  const formatBRL = (cents: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Dashboard Admin</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Store} label="Barbearias" value={stats.tenants.total} sub={`${stats.tenants.active} ativas · ${stats.tenants.trialing} trial`} />
        <StatCard icon={CreditCard} label="Assinantes ativos" value={stats.tenants.active} sub={`${stats.tenants.canceled} cancelados`} />
        <StatCard icon={DollarSign} label="MRR estimado" value={formatBRL(stats.revenue.mrr_cents)} />
        <StatCard icon={Wallet} label="Comissões coletadas" value={formatBRL(stats.revenue.commission_total_cents)} sub={`${stats.revenue.commission_count} transações`} />
      </div>

      <SectionTitle>Engajamento</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MiniStat label="Clientes" value={stats.engagement.total_customers.toLocaleString("pt-BR")} />
        <MiniStat label="Agendamentos" value={stats.engagement.total_bookings.toLocaleString("pt-BR")} />
        <MiniStat label="Pagamentos" value={stats.engagement.total_payments} />
        <MiniStat label="Bookings 7d" value={stats.engagement.bookings_7d} />
        <MiniStat label="Bookings 30d" value={stats.engagement.bookings_30d} />
      </div>

      <SectionTitle>Tracking</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Sessões visitante" value={stats.tracking.visitor_sessions} />
        <MiniStat label="Eventos Meta" value={stats.tracking.meta_events_sent} />
        <MiniStat label="Com UTM" value={stats.tracking.sessions_with_utm} />
        <MiniStat label="Com fbclid" value={stats.tracking.sessions_with_fbclid} />
      </div>

      <SectionTitle>Onboarding</SectionTitle>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Total" value={stats.onboarding.total} />
        <MiniStat label="Completos" value={stats.onboarding.completed} />
        <MiniStat label="Questionários" value={stats.onboarding.questionnaire_done} />
        <MiniStat label="Pulados" value={stats.onboarding.skipped} />
      </div>
    </div>
  );
}
