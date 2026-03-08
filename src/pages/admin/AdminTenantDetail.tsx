import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ArrowLeft, ExternalLink, RefreshCw, Loader2, Calendar, CreditCard, DollarSign, Wifi, Users, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "-";
const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "-";
const relativeTime = (d: string) => {
  try { return formatDistanceToNow(new Date(d), { addSuffix: true, locale: ptBR }); }
  catch { return d; }
};

const statusLabels: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "text-emerald-400" },
  trialing: { label: "Trial", color: "text-amber-400" },
  canceled: { label: "Cancelado", color: "text-red-400" },
  past_due: { label: "Inadimplente", color: "text-orange-400" },
  unpaid: { label: "Não pago", color: "text-orange-400" },
  none: { label: "Sem plano", color: "text-zinc-400" },
};

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form state
  const [trialDays, setTrialDays] = useState("7");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [discountMonths, setDiscountMonths] = useState("3");
  const [commissionRate, setCommissionRate] = useState("");

  useEffect(() => { loadDetail(); }, [id]);

  const loadDetail = async () => {
    if (!id) return;
    const [detailRes, timelineRes] = await Promise.all([
      supabase.rpc("admin_get_tenant_detail" as any, { p_tenant_id: id }),
      supabase.rpc("admin_get_tenant_timeline" as any, { p_tenant_id: id, p_limit: 30 }),
    ]);
    if (detailRes.data) {
      setDetail(detailRes.data);
      const cr = detailRes.data?.subscription?.commission_rate;
      setCommissionRate(cr ? (cr * 100).toFixed(1) : "2.5");
    }
    if (timelineRes.data) setTimeline(timelineRes.data as any[]);
    setLoading(false);
  };

  const adminAction = async (action: string, params?: Record<string, any>) => {
    if (!id) return;
    setActionLoading(action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stripe-actions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
        body: JSON.stringify({ action, tenant_id: id, ...params }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro");
      toast.success(`"${action}" executado`);
      loadDetail();
      return result;
    } catch (e: any) { toast.error(e.message); } finally { setActionLoading(null); }
  };

  const isLoading = (a: string) => actionLoading === a;

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
    </div>
  );
  if (!detail?.tenant) return <p className="text-zinc-500">Barbearia não encontrada.</p>;

  const t = detail.tenant;
  const sub = detail.subscription;
  const conn = detail.connections || {};
  const usage = detail.usage || {};
  const onb = detail.onboarding || {};
  const invoices = detail.invoices || [];
  const platformFees = detail.platform_fees || [];
  const visitors = detail.visitor_sessions || [];
  const st = statusLabels[t.subscription_status] || statusLabels.none;

  return (
    <div className="max-w-4xl">
      <button onClick={() => navigate("/admin/tenants")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {t.logo_url && <img src={t.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-800" />}
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{t.name}</h1>
          <p className="text-sm text-zinc-500">{t.email || "(sem email)"} · {t.phone || "(sem telefone)"}</p>
          {t.address && <p className="text-xs text-zinc-600 mt-0.5">{t.address}</p>}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-zinc-700">/{t.slug}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
              st.color === 'text-emerald-400' ? 'bg-emerald-500/15' :
              st.color === 'text-amber-400' ? 'bg-amber-500/15' :
              st.color === 'text-red-400' ? 'bg-red-500/15' : 'bg-zinc-500/15'
            } ${st.color}`}>{st.label}</span>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-zinc-900 border border-zinc-800 mb-6">
          <TabsTrigger value="overview" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">Visão Geral</TabsTrigger>
          <TabsTrigger value="stripe" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">Ações Stripe</TabsTrigger>
          <TabsTrigger value="billing" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">Billing</TabsTrigger>
          <TabsTrigger value="attribution" className="text-xs data-[state=active]:bg-zinc-800 data-[state=active]:text-zinc-100">Atribuição</TabsTrigger>
        </TabsList>

        {/* ===== TAB: OVERVIEW ===== */}
        <TabsContent value="overview">
          {/* Subscription */}
          <Section title="Assinatura">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <InfoRow label="Plano" value={<span className="capitalize">{sub?.plan_name || "Nenhum"}</span>} />
              <InfoRow label="Ciclo" value={sub?.billing_interval === 'year' ? 'Anual' : 'Mensal'} />
              <InfoRow label="Taxa" value={`${((sub?.commission_rate || 0.025) * 100).toFixed(1)}%`} />
              {sub?.trial_end && <InfoRow label="Trial" value={`até ${formatDate(sub.trial_end)}`} />}
              {sub?.current_period_end && <InfoRow label="Período" value={`${formatDate(sub.current_period_start)} → ${formatDate(sub.current_period_end)}`} />}
              {sub?.discount_name && <InfoRow label="Desconto" value={<span className="text-emerald-400">{sub.discount_name} {sub.discount_percent_off ? `(${sub.discount_percent_off}%)` : ''}</span>} />}
            </div>
          </Section>

          {/* Connections */}
          <Section title="Conexões">
            <div className="flex gap-4 text-sm">
              <InfoRow label="Mercado Pago" value={conn.mercadopago?.connected ? '✅ Conectado' : '❌ Não'} />
              <InfoRow label="WhatsApp" value={conn.whatsapp?.connected ? `✅ ${conn.whatsapp.phone_number || ''}` : '❌ Não'} />
            </div>
          </Section>

          {/* Usage */}
          <Section title="Uso">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <InfoRow label="Profissionais" value={usage.staff_count || 0} />
              <InfoRow label="Serviços" value={usage.services_count || 0} />
              <InfoRow label="Clientes" value={(usage.customers_count || 0).toLocaleString('pt-BR')} />
              <InfoRow label="Bookings (total)" value={(usage.bookings_total || 0).toLocaleString('pt-BR')} />
              <InfoRow label="Bookings (7d)" value={usage.bookings_7d || 0} />
              <InfoRow label="Bookings (30d)" value={usage.bookings_30d || 0} />
              <InfoRow label="Receita" value={<span className="text-emerald-400 font-semibold">{formatBRL(usage.revenue_cents || 0)}</span>} />
              <InfoRow label="Último booking" value={usage.last_booking ? relativeTime(usage.last_booking) : '-'} />
              <InfoRow label="Último pagamento" value={usage.last_payment ? relativeTime(usage.last_payment) : '-'} />
            </div>
          </Section>

          {/* Staff */}
          {usage.staff && (
            <Section title="Equipe">
              <div className="space-y-1">
                {(usage.staff as any[]).map((s: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className={`w-2 h-2 rounded-full ${s.active ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span className="text-zinc-200">{s.name}</span>
                    {s.is_owner && <span className="text-[10px] text-[hsl(44,65%,54%)] bg-[hsl(44,65%,54%)]/10 px-1.5 py-0.5 rounded-full">Dono</span>}
                  </div>
                ))}
              </div>
            </Section>
          )}
        </TabsContent>

        {/* ===== TAB: STRIPE ACTIONS ===== */}
        <TabsContent value="stripe">
          <Section title="Ações da Assinatura">
            <div className="space-y-4">
              <ActionRow label="⏰ Estender Trial">
                <Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)}
                  className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
                <span className="text-xs text-zinc-500">dias</span>
                <Button size="sm" variant="outline" disabled={isLoading("extend_trial")}
                  onClick={() => adminAction("extend_trial", { days: parseInt(trialDays) })}
                  className="h-8 text-xs border-zinc-700">
                  {isLoading("extend_trial") && <Loader2 className="h-3 w-3 animate-spin mr-1" />} Estender
                </Button>
              </ActionRow>

              <ActionRow label="💰 Aplicar Desconto">
                <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)}
                  className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
                <span className="text-xs text-zinc-500">%</span>
                <Input type="number" value={discountMonths} onChange={(e) => setDiscountMonths(e.target.value)}
                  className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
                <span className="text-xs text-zinc-500">meses</span>
                <Button size="sm" variant="outline" disabled={isLoading("apply_coupon")}
                  onClick={() => adminAction("apply_coupon", { percent_off: parseInt(discountPercent), duration: "repeating", duration_months: parseInt(discountMonths) })}
                  className="h-8 text-xs border-zinc-700">Aplicar</Button>
                <Button size="sm" variant="outline" disabled={isLoading("remove_coupon")}
                  onClick={() => adminAction("remove_coupon")}
                  className="h-8 text-xs border-zinc-700 text-red-400">Remover</Button>
              </ActionRow>

              <ActionRow label="📊 Taxa de Comissão">
                <Input type="number" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
                  className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
                <span className="text-xs text-zinc-500">%</span>
                <Button size="sm" variant="outline" disabled={isLoading("update_commission")}
                  onClick={() => adminAction("update_commission", { commission_rate: parseFloat(commissionRate) / 100 })}
                  className="h-8 text-xs border-zinc-700">Salvar</Button>
              </ActionRow>

              <ActionRow label="❌ Cancelar Assinatura">
                <Button size="sm" variant="outline" disabled={isLoading("cancel_subscription")}
                  onClick={() => adminAction("cancel_subscription", { immediate: false })}
                  className="h-8 text-xs border-zinc-700">No fim do período</Button>
                <Button size="sm" variant="outline" disabled={isLoading("cancel_subscription")}
                  onClick={() => { if (confirm("Cancelar IMEDIATAMENTE?")) adminAction("cancel_subscription", { immediate: true }); }}
                  className="h-8 text-xs border-red-800 text-red-400 hover:bg-red-950">Cancelar agora</Button>
              </ActionRow>

              <ActionRow label="🔄 Reativar">
                <Button size="sm" variant="outline" disabled={isLoading("reactivate_subscription")}
                  onClick={() => adminAction("reactivate_subscription")}
                  className="h-8 text-xs border-zinc-700">Reativar assinatura</Button>
              </ActionRow>

              <ActionRow label="🏆 Toggle Fidelidade">
                <Button size="sm" variant="outline" disabled={isLoading("toggle_addon")}
                  onClick={() => adminAction("toggle_addon", { addon: "loyalty_addon_active", enabled: true })}
                  className="h-8 text-xs border-zinc-700">Ativar</Button>
                <Button size="sm" variant="outline" disabled={isLoading("toggle_addon")}
                  onClick={() => adminAction("toggle_addon", { addon: "loyalty_addon_active", enabled: false })}
                  className="h-8 text-xs border-zinc-700 text-red-400">Desativar</Button>
              </ActionRow>
            </div>
          </Section>
        </TabsContent>

        {/* ===== TAB: BILLING ===== */}
        <TabsContent value="billing">
          <Section title="Faturas">
            {invoices.length === 0 ? (
              <p className="text-xs text-zinc-600">Nenhuma fatura.</p>
            ) : (
              <div className="space-y-2">
                {invoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-zinc-400 font-mono">{inv.number || inv.stripe_invoice_id?.slice(0, 16) || '-'}</span>
                      <span className="text-zinc-200 font-medium">{formatBRL(inv.amount_due || 0)}</span>
                      <span className={inv.status === 'paid' ? 'text-emerald-400' : inv.status === 'open' ? 'text-amber-400' : 'text-zinc-500'}>
                        {inv.status === 'paid' ? '✅ Pago' : inv.status === 'open' ? '⏳ Aberto' : inv.status === 'draft' ? '📝 Draft' : inv.status}
                      </span>
                      {inv.created_at && <span className="text-zinc-600">{formatDate(inv.created_at)}</span>}
                    </div>
                    {inv.invoice_url && (
                      <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Comissões da Plataforma">
            {platformFees.length === 0 ? (
              <p className="text-xs text-zinc-600">Nenhuma comissão.</p>
            ) : (
              <div className="space-y-2">
                {platformFees.map((f: any) => (
                  <div key={f.id} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2.5 text-xs">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-zinc-300">{formatBRL(f.transaction_amount_cents || 0)}</span>
                      <span className="text-zinc-500">{((f.commission_rate || 0) * 100).toFixed(1)}%</span>
                      <span className="text-[hsl(44,65%,54%)] font-medium">{formatBRL(f.fee_amount_cents || 0)}</span>
                      <span className={f.status === 'collected' ? 'text-emerald-400' : 'text-amber-400'}>
                        {f.status === 'collected' ? '✅' : '⏳'} {f.status}
                      </span>
                    </div>
                    <span className="text-zinc-600 text-[10px]">{formatDate(f.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </TabsContent>

        {/* ===== TAB: ATTRIBUTION ===== */}
        <TabsContent value="attribution">
          {/* Attribution */}
          <Section title="Atribuição">
            {t.attribution_full ? (
              <div className="space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                  <InfoRow label="First touch" value={
                    t.attribution_full.first_touch?.utm_source ? (
                      <span className="text-[hsl(44,65%,54%)]">
                        {t.attribution_full.first_touch.utm_source}
                        {t.attribution_full.first_touch.utm_medium ? ` / ${t.attribution_full.first_touch.utm_medium}` : ''}
                      </span>
                    ) : '-'
                  } />
                  <InfoRow label="Campanha" value={t.attribution_full.first_touch?.utm_campaign || '-'} />
                  <InfoRow label="Referrer" value={t.attribution_full.first_touch?.referrer || '(direto)'} />
                  <InfoRow label="Touchpoints" value={t.attribution_full.touch_count || 0} />
                  <InfoRow label="Dias até signup" value={`${t.attribution_full.days_to_signup || 0} dias`} />
                </div>
                {t.attribution_full.all_touches?.length > 0 && (
                  <div>
                    <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Histórico de toques</p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {t.attribution_full.all_touches.map((touch: any, i: number) => (
                        <div key={i} className="text-[11px] bg-zinc-950 rounded px-2.5 py-1.5 flex items-center gap-2">
                          <span className="text-zinc-600">{i + 1}.</span>
                          <span className="text-zinc-400">{touch.utm_source || 'direto'}{touch.utm_campaign ? ` / ${touch.utm_campaign}` : ''}</span>
                          <span className="ml-auto text-zinc-700 text-[10px]">{formatDateTime(touch.at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Sem dados de atribuição</p>
            )}
          </Section>

          {/* Onboarding */}
          <Section title="Onboarding">
            {onb.id ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Perfil', done: onb.step_profile },
                    { label: 'Serviços', done: onb.step_services },
                    { label: 'Horários', done: onb.step_schedule },
                    { label: 'Pagamento', done: onb.step_payment },
                    { label: 'WhatsApp', done: onb.step_whatsapp },
                  ].map((s) => (
                    <span key={s.label} className={`text-[10px] px-2 py-1 rounded-full flex items-center gap-1 ${
                      s.done ? 'bg-emerald-500/15 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
                    }`}>
                      {s.done ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {s.label}
                    </span>
                  ))}
                </div>
                {onb.questionnaire_completed && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mt-2">
                    <InfoRow label="Clientes/semana" value={onb.weekly_clients || '-'} />
                    <InfoRow label="Faturamento" value={onb.monthly_revenue || '-'} />
                    <InfoRow label="Desafio" value={onb.biggest_challenge || '-'} />
                    <InfoRow label="Como conheceu" value={onb.heard_from || '-'} />
                    <InfoRow label="Equipe" value={onb.team_size || '-'} />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-zinc-600">Sem dados de onboarding</p>
            )}
          </Section>

          {/* Visitor Sessions */}
          {visitors.length > 0 && (
            <Section title={`Sessões de visitante (${visitors.length})`}>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {visitors.map((v: any, i: number) => (
                  <div key={i} className="text-[11px] bg-zinc-950 rounded px-2.5 py-1.5 flex items-center gap-2 flex-wrap">
                    {v.utm_source && <span className="text-[hsl(44,65%,54%)]">{v.utm_source}</span>}
                    {v.utm_campaign && <span className="text-zinc-400">/ {v.utm_campaign}</span>}
                    {v.referrer && <span className="text-zinc-600 truncate max-w-[200px]">← {v.referrer}</span>}
                    <span className="ml-auto text-zinc-700 text-[10px]">{relativeTime(v.created_at)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}
        </TabsContent>
      </Tabs>

      {/* Timeline */}
      {timeline && timeline.length > 0 && (
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Timeline recente</h3>
          <div className="space-y-2">
            {timeline.map((ev: any, i: number) => (
              <div key={i} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-3">
                <span className="text-lg mt-0.5">
                  {ev.type === 'booking' ? '📅' : ev.type === 'payment' ? '💳' : '📄'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-zinc-200">
                    {ev.type === 'booking' && `Agendamento: ${ev.detail?.customer || 'Cliente'} — ${ev.detail?.status || ''}`}
                    {ev.type === 'payment' && `Pagamento: ${formatBRL(ev.detail?.amount_cents || 0)} via ${ev.detail?.method || '?'} — ${ev.detail?.status || ''}`}
                    {ev.type === 'invoice' && `Fatura: ${formatBRL(ev.detail?.amount || 0)} — ${ev.detail?.status || ''}`}
                  </p>
                  <p className="text-[10px] text-zinc-600">{relativeTime(ev.at)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-[10px] text-zinc-700 mt-8 mb-4">
        ID: {t.id} · Slug: {t.slug} · Criado: {formatDateTime(t.created_at)}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6">
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">{title}</h3>
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">{children}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <span className="text-zinc-500 text-xs">{label}</span>
      <p className="text-zinc-200 text-sm">{typeof value === "string" || typeof value === "number" ? String(value) : value}</p>
    </div>
  );
}

function ActionRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 bg-zinc-950 rounded-lg px-3 py-2.5">
      <span className="text-xs text-zinc-300 w-full sm:w-auto sm:min-w-[160px]">{label}</span>
      {children}
    </div>
  );
}
