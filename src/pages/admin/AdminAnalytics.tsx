import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, Calendar, DollarSign, Bell, CheckCircle, AlertTriangle, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend } from "recharts";

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

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
  return <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-3">{children}</h3>;
}

const PIE_COLORS = ['#10b981', '#3b82f6', '#d4a843', '#22c55e'];
const sourceLabels: Record<string, string> = { public: 'Online', admin: 'Manual', recurring: 'Recorrente', whatsapp: 'WhatsApp' };

export default function AdminAnalytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: d } = await supabase.rpc("admin_get_platform_analytics" as any);
      if (d) setData(d);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
    </div>
  );
  if (!data) return <p className="text-zinc-500">Erro ao carregar analytics.</p>;

  const bookingSources = data.feature_usage?.booking_sources
    ? Object.entries(data.feature_usage.booking_sources).map(([key, val]) => ({
        name: sourceLabels[key] || key,
        value: val as number,
      }))
    : [];
  const totalBookingSources = bookingSources.reduce((a, b) => a + b.value, 0);

  const topServices = (data.top_services || []).slice(0, 10);
  const dailyActivity = data.daily_activity || [];
  const scorecards = data.tenant_scorecards || [];
  const retention = data.retention || {};
  const featureUsage = data.feature_usage || {};

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Analytics da Plataforma</h1>

      {/* Hero Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard icon={Calendar} label="Agendamentos" value={data.volume?.total_bookings?.toLocaleString('pt-BR') || 0} />
        <StatCard icon={DollarSign} label="GMV processado" value={formatBRL(data.financial?.estimated_gmv_cents || 0)} />
        <StatCard icon={Users} label="Clientes cadastrados" value={data.volume?.total_customers?.toLocaleString('pt-BR') || 0} />
        <StatCard icon={DollarSign} label="Ticket médio" value={formatBRL(data.financial?.avg_booking_value_cents || 0)} />
        <StatCard icon={Bell} label="Lembretes enviados" value={featureUsage.reminders_sent || 0} />
      </div>

      {/* Booking Sources Pie */}
      {bookingSources.length > 0 && (
        <>
          <SectionTitle>Como os agendamentos são criados</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie data={bookingSources} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {bookingSources.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <RTooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {bookingSources.map((s, i) => (
                <div key={s.name} className="flex items-center gap-2 text-sm">
                  <span className="w-3 h-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-zinc-300">{s.name}</span>
                  <span className="text-zinc-500">({totalBookingSources > 0 ? ((s.value / totalBookingSources) * 100).toFixed(0) : 0}%)</span>
                  <span className="text-zinc-400 font-semibold">{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Top Services */}
      {topServices.length > 0 && (
        <>
          <SectionTitle>Top 10 Serviços</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ResponsiveContainer width="100%" height={Math.max(300, topServices.length * 40)}>
              <BarChart data={topServices} layout="vertical" margin={{ left: 120, right: 20 }}>
                <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} width={110} />
                <RTooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }}
                  formatter={(v: any, name: string) => name === 'total_revenue_cents' ? formatBRL(v) : v} />
                <Bar dataKey="bookings" fill="#d4a843" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* Retention */}
      <SectionTitle>Retenção de Clientes</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 col-span-2">
          <p className="text-xs text-zinc-500 mb-2">Recorrentes vs Únicos</p>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-emerald-400 text-xl font-bold">{retention.repeat_rate_pct?.toFixed(1) || 0}%</span>
            <span className="text-xs text-zinc-500">recorrentes</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${retention.repeat_rate_pct || 0}%` }} />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
            <span>{retention.repeat_customers || 0} recorrentes</span>
            <span>{retention.one_time_customers || 0} únicos</span>
          </div>
        </div>
        <StatCard icon={BarChart3} label="Média bookings/cliente" value={retention.avg_bookings_per_customer?.toFixed(1) || 0} />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Taxa cancelamento</span>
          </div>
          <p className={`text-2xl font-bold ${(retention.cancellation_rate_pct || 0) > 30 ? 'text-red-400' : 'text-amber-400'}`}>
            {retention.cancellation_rate_pct?.toFixed(1) || 0}%
          </p>
        </div>
      </div>

      {/* Feature Usage */}
      <SectionTitle>Uso de Features</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { name: 'Agendamento Online', value: featureUsage.booking_sources?.public || 0, pct: featureUsage.online_booking_pct, status: 'active' },
          { name: 'Lembretes WhatsApp', value: featureUsage.reminders_sent || 0, pct: featureUsage.reminder_effectiveness_pct, status: 'active' },
          { name: 'Comandas fechadas', value: featureUsage.comandas_closed || 0, sub: `${featureUsage.comandas_opened || 0} abertas`, status: 'active' },
          { name: 'Pacotes vendidos', value: featureUsage.packages_sold || 0, status: (featureUsage.packages_sold || 0) > 0 ? 'active' : 'low' },
          { name: 'Assinaturas clientes', value: featureUsage.client_subscriptions_active || 0, sub: `${featureUsage.client_subscriptions_total || 0} total`, status: 'active' },
          { name: 'Cartão Fidelidade', value: featureUsage.loyalty_cards_created || 0, status: (featureUsage.loyalty_cards_created || 0) > 0 ? 'active' : 'new' },
          { name: 'MP conectado', value: `${featureUsage.mp_connected_tenants || 0} barbearias`, status: 'active' },
          { name: 'WA conectado', value: `${featureUsage.wa_connected_tenants || 0} barbearias`, status: 'active' },
        ].map((f) => (
          <div key={f.name} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-1">
              {f.status === 'active' ? <CheckCircle className="h-3.5 w-3.5 text-emerald-400" /> :
               f.status === 'low' ? <AlertTriangle className="h-3.5 w-3.5 text-amber-400" /> :
               <Sparkles className="h-3.5 w-3.5 text-zinc-500" />}
              <span className="text-xs text-zinc-400">{f.name}</span>
            </div>
            <p className="text-lg font-semibold text-zinc-200">{f.value}</p>
            {f.sub && <p className="text-[10px] text-zinc-600">{f.sub}</p>}
            {f.pct != null && <p className="text-[10px] text-zinc-500">{f.pct.toFixed(0)}%</p>}
          </div>
        ))}
      </div>

      {/* Scorecard */}
      {scorecards.length > 0 && (
        <>
          <SectionTitle>Scorecard por Barbearia</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left p-3">Nome</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-right p-3">Bookings</th>
                  <th className="text-right p-3">Online%</th>
                  <th className="text-right p-3">Clientes</th>
                  <th className="text-right p-3">Receita</th>
                  <th className="text-center p-3">MP</th>
                  <th className="text-center p-3">WA</th>
                  <th className="text-right p-3">7d</th>
                </tr>
              </thead>
              <tbody>
                {scorecards.map((t: any) => {
                  const onlinePct = t.bookings_total > 0 ? ((t.online_bookings || 0) / t.bookings_total * 100).toFixed(0) : '0';
                  const inactive = (t.bookings_7d || 0) === 0;
                  return (
                    <tr key={t.tenant_id} className={`border-b border-zinc-800/50 ${inactive ? 'bg-amber-500/5' : ''}`}>
                      <td className="p-3 text-zinc-200 font-medium">{t.name}</td>
                      <td className="p-3">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          t.subscription_status === 'active' ? 'bg-emerald-500/15 text-emerald-400' :
                          t.subscription_status === 'trialing' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-zinc-500/15 text-zinc-400'
                        }`}>{t.subscription_status}</span>
                      </td>
                      <td className="p-3 text-right text-zinc-300">{t.bookings_total}</td>
                      <td className="p-3 text-right text-zinc-400">{onlinePct}%</td>
                      <td className="p-3 text-right text-zinc-300">{t.customers}</td>
                      <td className="p-3 text-right text-emerald-400">{formatBRL(t.revenue_cents || 0)}</td>
                      <td className="p-3 text-center">{t.mp_connected ? '✅' : '❌'}</td>
                      <td className="p-3 text-center">{t.wa_connected ? '✅' : '❌'}</td>
                      <td className={`p-3 text-right ${inactive ? 'text-amber-400' : 'text-zinc-300'}`}>{t.bookings_7d || 0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Daily Activity */}
      {dailyActivity.length > 0 && (
        <>
          <SectionTitle>Atividade últimos 30 dias</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" tick={{ fill: '#71717a', fontSize: 10 }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} />
                <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
                <RTooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} />
                <Legend wrapperStyle={{ fontSize: 11, color: '#a1a1aa' }} />
                <Line type="monotone" dataKey="bookings" stroke="#3b82f6" name="Bookings" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="new_customers" stroke="#10b981" name="Novos clientes" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="payments" stroke="#d4a843" name="Pagamentos" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
