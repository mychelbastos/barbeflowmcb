import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "-";
const formatDateTime = (d: string | null) => d ? new Date(d).toLocaleString("pt-BR") : "-";

interface TenantData {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  address: string | null;
  logo_url: string | null;
  subscription_status: string;
  created_at: string;
  settings: any;
  attribution: any;
  // Stripe subscription
  plan_name: string | null;
  billing_interval: string | null;
  commission_rate: number;
  stripe_status: string | null;
  trial_start: string | null;
  trial_end: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  discount_name: string | null;
  discount_percent_off: number | null;
  discount_amount_off: number | null;
  stripe_subscription_id: string | null;
  // Usage
  staff_count: number;
  services_count: number;
  customers_count: number;
  bookings_total: number;
  bookings_7d: number;
  bookings_30d: number;
  payments_count: number;
  payments_paid_count: number;
  revenue_cents: number;
  platform_fees_cents: number;
  platform_fees_count: number;
  mp_connected: boolean;
  wa_connected: boolean;
  // Onboarding
  questionnaire_completed: boolean;
  weekly_clients: string | null;
  monthly_revenue: string | null;
  biggest_challenge: string | null;
  heard_from: string | null;
  team_size: string | null;
  onboarding_completed: boolean;
  // Attribution shorthand
  first_touch_source: string | null;
  first_touch_medium: string | null;
  first_touch_campaign: string | null;
  first_touch_referrer: string | null;
  last_touch_source: string | null;
  last_touch_campaign: string | null;
  touch_count: string | null;
  days_to_signup: string | null;
}

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
  const [tenant, setTenant] = useState<TenantData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [liveStripe, setLiveStripe] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[] | null>(null);

  // Action form state
  const [trialDays, setTrialDays] = useState("7");
  const [discountPercent, setDiscountPercent] = useState("20");
  const [discountMonths, setDiscountMonths] = useState("3");
  const [commissionRate, setCommissionRate] = useState("");

  useEffect(() => {
    loadTenant();
  }, [id]);

  const loadTenant = async () => {
    if (!id) return;
    const { data } = await supabase.rpc("admin_list_tenants", {
      p_search: id,
      p_limit: 1,
      p_offset: 0,
    });
    if (data && (data as any[]).length > 0) {
      const t = (data as any[])[0] as TenantData;
      setTenant(t);
      setCommissionRate(((t.commission_rate || 0.025) * 100).toFixed(1));
    }
    setLoading(false);
  };

  const adminStripeAction = async (action: string, params?: Record<string, any>) => {
    if (!id) return;
    setActionLoading(action);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-stripe-actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ action, tenant_id: id, ...params }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Erro na ação");
      toast.success(`Ação "${action}" executada com sucesso`);
      loadTenant();
      return result;
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar ação");
    } finally {
      setActionLoading(null);
    }
  };

  const loadLiveStripe = async () => {
    const result = await adminStripeAction("get_subscription");
    if (result?.subscription) setLiveStripe(result.subscription);
  };

  const loadInvoices = async () => {
    const result = await adminStripeAction("get_invoices");
    if (result?.invoices) setInvoices(result.invoices);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
      </div>
    );
  }

  if (!tenant) return <p className="text-zinc-500">Barbearia não encontrada.</p>;

  const isActionLoading = (action: string) => actionLoading === action;
  const st = statusLabels[tenant.subscription_status] || statusLabels.none;

  return (
    <div className="max-w-3xl">
      <button
        onClick={() => navigate("/admin/tenants")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        {tenant.logo_url && (
          <img src={tenant.logo_url} alt="" className="w-12 h-12 rounded-xl object-cover border border-zinc-800" />
        )}
        <div>
          <h1 className="text-xl font-bold text-zinc-100">{tenant.name}</h1>
          <p className="text-sm text-zinc-500">
            {tenant.email || "(sem email)"} · {tenant.phone || "(sem telefone)"}
          </p>
          {tenant.address && <p className="text-xs text-zinc-600 mt-0.5">{tenant.address}</p>}
          <p className="text-xs text-zinc-700 mt-0.5">/{tenant.slug}</p>
        </div>
      </div>

      {/* Subscription Info from DB cache */}
      <Section title="Assinatura (cache local)">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Status" value={
            <span className={st.color}>{st.label}</span>
          } />
          <InfoRow label="Plano" value={
            <span className="capitalize">{tenant.plan_name || "Nenhum"}</span>
          } />
          <InfoRow label="Ciclo" value={tenant.billing_interval === "year" ? "Anual" : "Mensal"} />
          <InfoRow label="Taxa comissão" value={`${((tenant.commission_rate || 0.025) * 100).toFixed(1)}%`} />
          {tenant.trial_end && (
            <InfoRow label="Trial" value={`${formatDate(tenant.trial_start)} → ${formatDate(tenant.trial_end)}`} />
          )}
          {tenant.current_period_end && (
            <InfoRow label="Período atual" value={`${formatDate(tenant.current_period_start)} → ${formatDate(tenant.current_period_end)}`} />
          )}
          {tenant.cancel_at_period_end && (
            <InfoRow label="Cancelamento" value={
              <span className="text-red-400">Cancela no fim do período</span>
            } />
          )}
          {tenant.canceled_at && (
            <InfoRow label="Cancelado em" value={formatDate(tenant.canceled_at)} />
          )}
          {tenant.discount_name && (
            <InfoRow label="Desconto ativo" value={
              <span className="text-emerald-400">
                {tenant.discount_name}
                {tenant.discount_percent_off ? ` (${tenant.discount_percent_off}% off)` : ""}
                {tenant.discount_amount_off ? ` (${formatBRL(tenant.discount_amount_off)})` : ""}
              </span>
            } />
          )}
        </div>
      </Section>

      {/* Live Stripe Data */}
      <Section title="Stripe (dados ao vivo)">
        {liveStripe === null ? (
          <Button
            size="sm"
            variant="outline"
            onClick={loadLiveStripe}
            disabled={isActionLoading("get_subscription")}
            className="text-xs border-zinc-700"
          >
            {isActionLoading("get_subscription") ? (
              <Loader2 className="h-3 w-3 animate-spin mr-1.5" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-1.5" />
            )}
            Consultar Stripe ao vivo
          </Button>
        ) : liveStripe.error ? (
          <p className="text-xs text-zinc-600">{liveStripe.error}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <InfoRow label="Status Stripe" value={
                <span className={(statusLabels[liveStripe.status] || statusLabels.none).color}>
                  {(statusLabels[liveStripe.status] || statusLabels.none).label}
                </span>
              } />
              <InfoRow label="ID" value={
                <span className="font-mono text-[10px] text-zinc-500">{liveStripe.id}</span>
              } />
              {liveStripe.current_period_end && (
                <InfoRow label="Próx. cobrança" value={formatDate(new Date(liveStripe.current_period_end * 1000).toISOString())} />
              )}
              {liveStripe.trial_end && (
                <InfoRow label="Fim do trial" value={formatDate(new Date(liveStripe.trial_end * 1000).toISOString())} />
              )}
              {liveStripe.discount && (
                <InfoRow label="Cupom Stripe" value={
                  <span className="text-emerald-400">
                    {liveStripe.discount.coupon?.name || liveStripe.discount.coupon?.id}
                    {liveStripe.discount.coupon?.percent_off ? ` (${liveStripe.discount.coupon.percent_off}%)` : ""}
                  </span>
                } />
              )}
              {liveStripe.plan && (
                <InfoRow label="Preço" value={formatBRL(liveStripe.plan.amount)} />
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={loadLiveStripe} className="text-[10px] text-zinc-600 h-6">
              <RefreshCw className="h-2.5 w-2.5 mr-1" /> Atualizar
            </Button>
          </div>
        )}
      </Section>

      {/* Revenue & Usage */}
      <Section title="Uso & Receita">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
          <InfoRow label="Profissionais" value={tenant.staff_count} />
          <InfoRow label="Serviços" value={tenant.services_count} />
          <InfoRow label="Clientes" value={tenant.customers_count.toLocaleString("pt-BR")} />
          <InfoRow label="Agendamentos (total)" value={tenant.bookings_total.toLocaleString("pt-BR")} />
          <InfoRow label="Agendamentos (7d)" value={tenant.bookings_7d} />
          <InfoRow label="Agendamentos (30d)" value={tenant.bookings_30d} />
          <InfoRow label="Pagamentos (pagos)" value={`${tenant.payments_paid_count} de ${tenant.payments_count}`} />
          <InfoRow label="Receita total" value={
            <span className="text-emerald-400 font-semibold">{formatBRL(tenant.revenue_cents)}</span>
          } />
          <InfoRow label="Comissão plataforma" value={
            <span className="text-[hsl(44,65%,54%)]">{formatBRL(tenant.platform_fees_cents)}</span>
          } />
          <InfoRow label="MP" value={tenant.mp_connected ? "✅ Conectado" : "❌ Não conectado"} />
          <InfoRow label="WhatsApp" value={tenant.wa_connected ? "✅ Conectado" : "❌ Não conectado"} />
        </div>
      </Section>

      {/* Attribution */}
      <Section title="Atribuição & Rastreamento">
        {tenant.first_touch_source || tenant.attribution ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <InfoRow label="First touch" value={
                tenant.first_touch_source ? (
                  <span className="text-[hsl(44,65%,54%)]">
                    {tenant.first_touch_source}
                    {tenant.first_touch_medium ? ` / ${tenant.first_touch_medium}` : ""}
                  </span>
                ) : "-"
              } />
              <InfoRow label="Campanha (first)" value={tenant.first_touch_campaign || "-"} />
              <InfoRow label="Referrer" value={tenant.first_touch_referrer || "(direto)"} />
              <InfoRow label="Last touch" value={
                tenant.last_touch_source ? (
                  <span>{tenant.last_touch_source}{tenant.last_touch_campaign ? ` / ${tenant.last_touch_campaign}` : ""}</span>
                ) : "-"
              } />
              <InfoRow label="Touchpoints" value={tenant.touch_count || "0"} />
              <InfoRow label="Dias até signup" value={tenant.days_to_signup ? `${tenant.days_to_signup} dias` : "0"} />
            </div>
            {tenant.attribution?.all_touches && (tenant.attribution.all_touches as any[]).length > 0 && (
              <div>
                <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-1.5">Histórico de toques</p>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {(tenant.attribution.all_touches as any[]).map((t: any, i: number) => (
                    <div key={i} className="text-[11px] bg-zinc-950 rounded px-2.5 py-1.5 flex items-center gap-2">
                      <span className="text-zinc-600">{i + 1}.</span>
                      <span className="text-zinc-400">
                        {t.utm_source || "direto"}
                        {t.utm_campaign ? ` / ${t.utm_campaign}` : ""}
                      </span>
                      {t.referrer && <span className="text-zinc-600 truncate max-w-[200px]">← {t.referrer}</span>}
                      <span className="ml-auto text-zinc-700 text-[10px]">{formatDateTime(t.at)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Sem dados de atribuição — cadastro anterior ao tracking</p>
        )}
      </Section>

      {/* Questionnaire */}
      <Section title="Questionário de Onboarding">
        {tenant.questionnaire_completed ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <InfoRow label="Clientes/semana" value={tenant.weekly_clients || "-"} />
            <InfoRow label="Faturamento" value={tenant.monthly_revenue || "-"} />
            <InfoRow label="Tamanho equipe" value={tenant.team_size || "-"} />
            <InfoRow label="Maior desafio" value={tenant.biggest_challenge || "-"} />
            <InfoRow label="Como conheceu" value={tenant.heard_from || "-"} />
            <InfoRow label="Onboarding" value={tenant.onboarding_completed ? "✅ Completo" : "⏳ Pendente"} />
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Não respondeu o questionário</p>
        )}
      </Section>

      {/* Admin Actions */}
      <Section title="Ações da Assinatura">
        <div className="space-y-4">
          {/* Extend Trial */}
          <ActionRow label="⏰ Estender Trial">
            <Input type="number" value={trialDays} onChange={(e) => setTrialDays(e.target.value)}
              className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
            <span className="text-xs text-zinc-500">dias</span>
            <Button size="sm" variant="outline" disabled={isActionLoading("extend_trial")}
              onClick={() => adminStripeAction("extend_trial", { days: parseInt(trialDays) })}
              className="h-8 text-xs border-zinc-700">
              {isActionLoading("extend_trial") && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
              Estender
            </Button>
          </ActionRow>

          {/* Apply Discount */}
          <ActionRow label="💰 Aplicar Desconto">
            <Input type="number" value={discountPercent} onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
            <span className="text-xs text-zinc-500">%</span>
            <Input type="number" value={discountMonths} onChange={(e) => setDiscountMonths(e.target.value)}
              className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
            <span className="text-xs text-zinc-500">meses</span>
            <Button size="sm" variant="outline" disabled={isActionLoading("apply_coupon")}
              onClick={() => adminStripeAction("apply_coupon", {
                percent_off: parseInt(discountPercent),
                duration: "repeating",
                duration_months: parseInt(discountMonths),
              })}
              className="h-8 text-xs border-zinc-700">
              Aplicar
            </Button>
            <Button size="sm" variant="outline" disabled={isActionLoading("remove_coupon")}
              onClick={() => adminStripeAction("remove_coupon")}
              className="h-8 text-xs border-zinc-700 text-red-400">
              Remover
            </Button>
          </ActionRow>

          {/* Commission Rate */}
          <ActionRow label="📊 Taxa de Comissão">
            <Input type="number" step="0.1" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)}
              className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm" />
            <span className="text-xs text-zinc-500">%</span>
            <Button size="sm" variant="outline" disabled={isActionLoading("update_commission")}
              onClick={() => adminStripeAction("update_commission", { commission_rate: parseFloat(commissionRate) / 100 })}
              className="h-8 text-xs border-zinc-700">
              Salvar
            </Button>
          </ActionRow>

          {/* Cancel */}
          <ActionRow label="❌ Cancelar Assinatura">
            <Button size="sm" variant="outline" disabled={isActionLoading("cancel_subscription")}
              onClick={() => adminStripeAction("cancel_subscription", { immediate: false })}
              className="h-8 text-xs border-zinc-700">
              No fim do período
            </Button>
            <Button size="sm" variant="outline" disabled={isActionLoading("cancel_subscription")}
              onClick={() => {
                if (confirm("Cancelar IMEDIATAMENTE? O acesso será removido agora.")) {
                  adminStripeAction("cancel_subscription", { immediate: true });
                }
              }}
              className="h-8 text-xs border-red-800 text-red-400 hover:bg-red-950">
              Cancelar agora
            </Button>
          </ActionRow>

          {/* Reactivate */}
          <ActionRow label="🔄 Reativar">
            <Button size="sm" variant="outline" disabled={isActionLoading("reactivate_subscription")}
              onClick={() => adminStripeAction("reactivate_subscription")}
              className="h-8 text-xs border-zinc-700">
              Reativar assinatura
            </Button>
          </ActionRow>
        </div>
      </Section>

      {/* Invoices */}
      <Section title="Faturas Stripe">
        {invoices === null ? (
          <Button size="sm" variant="outline" onClick={loadInvoices}
            disabled={isActionLoading("get_invoices")}
            className="text-xs border-zinc-700">
            {isActionLoading("get_invoices") && <Loader2 className="h-3 w-3 animate-spin mr-1.5" />}
            Carregar faturas
          </Button>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2.5 text-xs">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-zinc-400 font-mono">{inv.number || inv.id?.slice(0, 16)}</span>
                  <span className="text-zinc-200 font-medium">{formatBRL((inv.amount_due || 0))}</span>
                  <span className={
                    inv.status === "paid" ? "text-emerald-400" :
                    inv.status === "open" ? "text-amber-400" :
                    "text-zinc-500"
                  }>
                    {inv.status === "paid" ? "✅ Pago" :
                     inv.status === "open" ? "⏳ Aberto" :
                     inv.status === "draft" ? "📝 Rascunho" :
                     inv.status}
                  </span>
                  {inv.created && (
                    <span className="text-zinc-600">{formatDate(new Date(inv.created * 1000).toISOString())}</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {inv.invoice_pdf && (
                    <a href={inv.invoice_pdf} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-600 hover:text-zinc-400 text-[10px]">
                      PDF
                    </a>
                  )}
                  {inv.hosted_invoice_url && (
                    <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="text-[10px] text-zinc-700 mt-8 mb-4">
        ID: {tenant.id} · Slug: {tenant.slug} · Criado: {formatDateTime(tenant.created_at)}
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
