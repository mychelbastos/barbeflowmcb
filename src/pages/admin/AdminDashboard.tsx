import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Store, DollarSign, Users, TrendingUp, AlertCircle, Info, CreditCard, Percent, BarChart3, UserPlus } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";

interface SaaSKPIs {
  mrr_cents: number;
  arr_cents: number;
  arpu_cents: number;
  ltv_cents: number;
  churn_rate_pct: number;
  trial_to_paid_pct: number;
  signup_to_trial_pct: number;
  total_signups: number;
  paying_count: number;
  trialing_count: number;
  no_plan_count: number;
  canceled_count: number;
  signups_7d: number;
  plans_breakdown: { plan: string; interval: string; count: number }[];
  commission_total_cents: number;
}

const metricExplanations: Record<string, string> = {
  mrr: 'Receita Mensal Recorrente — soma do valor mensal de todas as assinaturas ativas. É a métrica #1 de um SaaS.',
  arr: 'Receita Anual Recorrente — MRR × 12. Projeta quanto o SaaS faturaria em 1 ano mantendo os assinantes atuais.',
  arpu: 'Receita Média Por Usuário — MRR ÷ assinantes. Quanto cada barbeiro paga em média.',
  ltv: 'Valor do Tempo de Vida — ARPU × 18 meses (estimativa). Quanto vale investir para adquirir cada cliente.',
  churn: 'Taxa de Cancelamento — % que cancelou nos últimos 30 dias. SaaS saudável: < 5%/mês.',
  trial_to_paid: 'Conversão Trial → Pagante — benchmark SaaS: 15-25%. Acima de 30% é excelente.',
  signup_to_trial: 'Conversão Signup → Trial — mostra qualidade da landing page e onboarding.',
};

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

function InfoTooltip({ metricKey }: { metricKey: string }) {
  const text = metricExplanations[metricKey];
  if (!text) return null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="h-3 w-3 text-zinc-600 hover:text-zinc-400 cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs bg-zinc-900 border-zinc-700 text-zinc-300">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

function KPICard({ icon: Icon, label, value, sub, metricKey, accent }: {
  icon: any; label: string; value: string | number; sub?: string; metricKey?: string; accent?: boolean;
}) {
  return (
    <div className={`rounded-xl p-5 border ${accent ? 'bg-[hsl(44,65%,54%)]/5 border-[hsl(44,65%,54%)]/20' : 'bg-zinc-900 border-zinc-800'}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`h-4 w-4 ${accent ? 'text-[hsl(44,65%,54%)]' : 'text-zinc-500'}`} />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
        {metricKey && <InfoTooltip metricKey={metricKey} />}
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-[hsl(44,65%,54%)]' : 'text-zinc-100'}`}>{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}

function ConversionCard({ label, pct, benchmark, metricKey }: {
  label: string; pct: number; benchmark: number; metricKey: string;
}) {
  const good = pct >= benchmark;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Percent className="h-4 w-4 text-zinc-500" />
        <span className="text-xs text-zinc-500 uppercase tracking-wide">{label}</span>
        <InfoTooltip metricKey={metricKey} />
      </div>
      <p className={`text-3xl font-bold mb-2 ${good ? 'text-emerald-400' : 'text-amber-400'}`}>
        {pct.toFixed(1)}%
      </p>
      <Progress value={Math.min(pct, 100)} className={`h-2 ${good ? '[&>div]:bg-emerald-500' : '[&>div]:bg-amber-500'}`} />
      <p className="text-[10px] text-zinc-600 mt-2">
        Benchmark: &gt;{benchmark}% {good ? '✅ Acima' : '⚠️ Abaixo'}
      </p>
    </div>
  );
}

export default function AdminDashboard() {
  const [kpis, setKpis] = useState<SaaSKPIs | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_saas_kpis" as any);
      if (data) setKpis(data as unknown as SaaSKPIs);
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

  if (!kpis) return <p className="text-zinc-500">Erro ao carregar KPIs.</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Dashboard Admin</h1>

      {/* Block 1: Revenue */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Receita</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={DollarSign} label="MRR" value={formatBRL(kpis.mrr_cents)} metricKey="mrr" accent />
        <KPICard icon={TrendingUp} label="ARR" value={formatBRL(kpis.arr_cents)} metricKey="arr" accent />
        <KPICard icon={Users} label="ARPU" value={`${formatBRL(kpis.arpu_cents)}/mês`} metricKey="arpu" accent />
        <KPICard icon={BarChart3} label="LTV estimado" value={formatBRL(kpis.ltv_cents)} metricKey="ltv" accent />
      </div>

      {/* Block 2: Subscribers */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Assinantes</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KPICard icon={Store} label="Total signups" value={kpis.total_signups} />
        <KPICard icon={CreditCard} label="Pagantes" value={kpis.paying_count} sub={`${kpis.canceled_count} cancelados`} />
        <KPICard icon={AlertCircle} label="Trial" value={kpis.trialing_count} />
        <KPICard icon={Users} label="Sem plano" value={kpis.no_plan_count} />
      </div>

      {/* Block 3: Conversion */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Conversão</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <ConversionCard label="Signup → Trial" pct={kpis.signup_to_trial_pct} benchmark={20} metricKey="signup_to_trial" />
        <ConversionCard label="Trial → Pagante" pct={kpis.trial_to_paid_pct} benchmark={25} metricKey="trial_to_paid" />
      </div>

      {/* Block 4: Plans & Churn */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Planos & Churn</h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Store className="h-4 w-4 text-zinc-500" />
            <span className="text-xs text-zinc-500 uppercase tracking-wide">Planos ativos</span>
          </div>
          {kpis.plans_breakdown && kpis.plans_breakdown.length > 0 ? (
            <div className="space-y-1">
              {kpis.plans_breakdown.map((p, i) => (
                <div key={i} className="flex justify-between text-sm">
                  <span className="text-zinc-400 capitalize">{p.plan} {p.interval === 'year' ? 'Anual' : 'Mensal'}</span>
                  <span className="text-zinc-200 font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-600">Nenhum plano ativo</p>
          )}
        </div>
        <KPICard icon={AlertCircle} label="Churn 30d" value={`${kpis.churn_rate_pct.toFixed(1)}%`} metricKey="churn"
          sub={kpis.churn_rate_pct < 5 ? '✅ Saudável' : '⚠️ Atenção'} />
        <KPICard icon={UserPlus} label="Signups 7d" value={kpis.signups_7d} />
        <KPICard icon={DollarSign} label="Comissões" value={formatBRL(kpis.commission_total_cents)} sub="Total coletado" />
      </div>
    </div>
  );
}
