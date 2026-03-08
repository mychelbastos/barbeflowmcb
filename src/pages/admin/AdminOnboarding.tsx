import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ListChecks, Users } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const PIE_COLORS = ['#d4a843', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

const challengeLabels: Record<string, string> = {
  no_shows: 'Faltas', scheduling: 'Agenda bagunçada', payments: 'Pagamentos',
  clients: 'Captar clientes', growth: 'Crescer', team: 'Gestão da equipe',
};
const revenueLabels: Record<string, string> = {
  under_3k: 'Até R$ 3k', '3k_8k': 'R$ 3k-8k', '8k_15k': 'R$ 8k-15k', 'above_15k': 'Acima de R$ 15k',
};
const heardLabels: Record<string, string> = {
  google: 'Google', youtube: 'YouTube', instagram: 'Instagram', facebook: 'Facebook',
  friend: 'Indicação', tiktok: 'TikTok', other: 'Outro',
};
const teamLabels: Record<string, string> = {
  solo: 'Sozinho', '2-3': '2-3 pessoas', '4-6': '4-6 pessoas', '7+': '7+ pessoas',
};

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-8 mb-3">{children}</h3>;
}

function MiniPie({ title, data, labelMap }: { title: string; data: Record<string, number>; labelMap: Record<string, string> }) {
  const items = Object.entries(data || {}).map(([key, val]) => ({
    name: labelMap[key] || key, value: val,
  })).sort((a, b) => b.value - a.value);
  if (items.length === 0) return <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"><p className="text-xs text-zinc-600">{title}: sem dados</p></div>;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">{title}</p>
      <ResponsiveContainer width="100%" height={160}>
        <PieChart>
          <Pie data={items} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={60} innerRadius={30}>
            {items.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
          </Pie>
          <RTooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7', fontSize: 11 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1 mt-2">
        {items.map((it, i) => (
          <div key={it.name} className="flex items-center gap-1.5 text-[11px]">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
            <span className="text-zinc-400">{it.name}</span>
            <span className="text-zinc-500 ml-auto">{it.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminOnboarding() {
  const [funnel, setFunnel] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc("admin_get_onboarding_funnel" as any);
      if (data) setFunnel(data);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
    </div>
  );
  if (!funnel) return <p className="text-zinc-500">Erro ao carregar funil.</p>;

  const steps = funnel.steps || {};
  const funnelData = [
    { step: 'Signups', value: steps.total_signups || 0 },
    { step: 'Questionário', value: steps.questionnaire_completed || 0 },
    { step: 'Perfil', value: steps.step_profile || 0 },
    { step: 'Serviços', value: steps.step_services || 0 },
    { step: 'Horários', value: steps.step_schedule || 0 },
    { step: 'Pagamento', value: steps.step_payment || 0 },
    { step: 'WhatsApp', value: steps.step_whatsapp || 0 },
    { step: 'Completo', value: steps.onboarding_completed || 0 },
    { step: 'Pularam', value: steps.onboarding_skipped || 0 },
  ];

  const answers = funnel.answers || {};
  const responses = funnel.responses || [];

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Funil de Onboarding</h1>

      {/* Funnel Chart */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
        <ResponsiveContainer width="100%" height={Math.max(300, funnelData.length * 38)}>
          <BarChart data={funnelData} layout="vertical" margin={{ left: 100 }}>
            <XAxis type="number" tick={{ fill: '#71717a', fontSize: 11 }} />
            <YAxis type="category" dataKey="step" tick={{ fill: '#a1a1aa', fontSize: 12 }} width={90} />
            <RTooltip contentStyle={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 8, color: '#e4e4e7' }} />
            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
              {funnelData.map((_, i) => (
                <Cell key={i} fill={`hsl(44, 65%, ${54 - i * 4}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Questionnaire Answers */}
      <SectionTitle>Respostas do Questionário</SectionTitle>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniPie title="Desafios" data={answers.biggest_challenge || {}} labelMap={challengeLabels} />
        <MiniPie title="Faturamento" data={answers.monthly_revenue || {}} labelMap={revenueLabels} />
        <MiniPie title="Como conheceu" data={answers.heard_from || {}} labelMap={heardLabels} />
        <MiniPie title="Tamanho equipe" data={answers.team_size || {}} labelMap={teamLabels} />
      </div>

      {/* Individual Responses */}
      {responses.length > 0 && (
        <>
          <SectionTitle>Respostas Individuais</SectionTitle>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="text-left p-3">Barbearia</th>
                  <th className="text-left p-3">Clientes/sem</th>
                  <th className="text-left p-3">Faturamento</th>
                  <th className="text-left p-3">Desafio</th>
                  <th className="text-left p-3">Como conheceu</th>
                  <th className="text-left p-3">Equipe</th>
                </tr>
              </thead>
              <tbody>
                {responses.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 cursor-pointer"
                    onClick={() => r.tenant_id && navigate(`/admin/tenants/${r.tenant_id}`)}>
                    <td className="p-3 text-zinc-200 font-medium">{r.tenant_name || '-'}</td>
                    <td className="p-3 text-zinc-400">{r.weekly_clients || '-'}</td>
                    <td className="p-3 text-zinc-400">{revenueLabels[r.monthly_revenue] || r.monthly_revenue || '-'}</td>
                    <td className="p-3 text-zinc-400">{challengeLabels[r.biggest_challenge] || r.biggest_challenge || '-'}</td>
                    <td className="p-3 text-zinc-400">{heardLabels[r.heard_from] || r.heard_from || '-'}</td>
                    <td className="p-3 text-zinc-400">{teamLabels[r.team_size] || r.team_size || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
