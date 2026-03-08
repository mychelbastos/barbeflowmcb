import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface TrackingReport {
  by_source: Array<{ source: string; sessions: number; unique_visitors: number; converted: number }>;
  by_campaign: Array<{ campaign: string; source: string; sessions: number; unique_visitors: number; converted: number }>;
  meta_events: Array<{ event_name: string; total: number; success: number }>;
  sessions_last_7d: Array<{ day: string; sessions: number; with_utm: number; from_meta: number }>;
  questionnaire_insights: {
    by_challenge: Array<{ value: string; count: number }>;
    by_revenue: Array<{ value: string; count: number }>;
    by_heard_from: Array<{ value: string; count: number }>;
    by_team_size: Array<{ value: string; count: number }>;
  };
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-0.5">{sub}</p>}
    </div>
  );
}

function DataTable({ headers, rows }: { headers: string[]; rows: Array<(string | number)[]> }) {
  if (rows.length === 0) return <p className="text-xs text-zinc-600 py-2">Sem dados</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="text-left px-3 py-2 text-zinc-500 font-medium uppercase tracking-wider border-b border-zinc-800">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-2 text-zinc-300">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightCard({ title, data }: { title: string; data: Array<{ value: string; count: number }> }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <h4 className="text-xs font-semibold text-zinc-400 mb-3">{title}</h4>
      <div className="space-y-1.5">
        {data.map((item) => (
          <div key={item.value} className="flex justify-between text-xs">
            <span className="text-zinc-300">{item.value || "(vazio)"}</span>
            <span className="text-zinc-500 font-mono">{item.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminTracking() {
  const [report, setReport] = useState<TrackingReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.rpc("admin_get_attribution_report");
      if (data) setReport(data as unknown as TrackingReport);
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

  if (!report) return <p className="text-zinc-500">Erro ao carregar relatório.</p>;

  const totalEvents = report.meta_events.reduce((s, e) => s + e.total, 0);
  const successEvents = report.meta_events.reduce((s, e) => s + e.success, 0);
  const failedEvents = totalEvents - successEvents;
  const successRate = totalEvents > 0 ? Math.round((successEvents / totalEvents) * 100) : 0;

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Tracking & Attribution</h1>

      {/* Meta CAPI Stats */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Meta CAPI</h3>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Eventos enviados" value={totalEvents} />
        <StatCard label="Sucesso" value={successEvents} />
        <StatCard label="Taxa sucesso" value={`${successRate}%`} />
        <StatCard label="Falhas" value={failedEvents} />
      </div>

      {/* Events by type */}
      {report.meta_events.length > 0 && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
          <h4 className="text-xs font-semibold text-zinc-400 mb-3">Eventos por tipo</h4>
          <DataTable
            headers={["Evento", "Total", "Sucesso"]}
            rows={report.meta_events.map((e) => [e.event_name, e.total, e.success])}
          />
        </div>
      )}

      {/* Sessions by Source */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 mt-8">Sessões por Fonte</h3>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <DataTable
          headers={["Fonte", "Sessões", "Únicos", "Convertidos"]}
          rows={report.by_source.map((s) => [s.source || "(direto)", s.sessions, s.unique_visitors, s.converted])}
        />
      </div>

      {/* Sessions by Campaign */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Sessões por Campanha</h3>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
        <DataTable
          headers={["Campanha", "Fonte", "Sessões", "Únicos", "Convertidos"]}
          rows={report.by_campaign.map((c) => [c.campaign || "-", c.source || "-", c.sessions, c.unique_visitors, c.converted])}
        />
      </div>

      {/* Last 7 days */}
      {report.sessions_last_7d.length > 0 && (
        <>
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Últimos 7 Dias</h3>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6">
            <DataTable
              headers={["Dia", "Sessões", "Com UTM", "Do Meta"]}
              rows={report.sessions_last_7d.map((d) => [
                new Date(d.day).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" }),
                d.sessions,
                d.with_utm,
                d.from_meta,
              ])}
            />
          </div>
        </>
      )}

      {/* Questionnaire Insights */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 mt-8">Insights do Questionário</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <InsightCard title="Maior Desafio" data={report.questionnaire_insights?.by_challenge} />
        <InsightCard title="Faturamento" data={report.questionnaire_insights?.by_revenue} />
        <InsightCard title="Como Conheceu" data={report.questionnaire_insights?.by_heard_from} />
      </div>
    </div>
  );
}
