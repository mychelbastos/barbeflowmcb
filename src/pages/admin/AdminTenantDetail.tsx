import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface TenantDetail {
  id: string;
  name: string;
  owner_email: string;
  owner_phone: string;
  subscription_status: string;
  plan_name: string;
  billing_interval: string;
  commission_rate: number;
  trial_end: string | null;
  customer_count: number;
  booking_count: number;
  staff_count: number;
  service_count: number;
  payment_count: number;
  has_mp: boolean;
  has_whatsapp: boolean;
  attribution: any;
  questionnaire: any;
  created_at: string;
  settings: any;
}

export default function AdminTenantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tenant, setTenant] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

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
    // Use admin_list_tenants with search by ID to get single tenant
    const { data } = await supabase.rpc("admin_list_tenants", {
      p_search: id,
      p_limit: 1,
      p_offset: 0,
    });
    if (data && (data as any[]).length > 0) {
      const t = (data as any[])[0] as TenantDetail;
      setTenant(t);
      setCommissionRate(((t.commission_rate || 0.025) * 100).toString());
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

  const [invoices, setInvoices] = useState<any[] | null>(null);

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

  return (
    <div className="max-w-2xl">
      <button
        onClick={() => navigate("/admin/tenants")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>

      <h1 className="text-xl font-bold text-zinc-100 mb-1">{tenant.name}</h1>
      <p className="text-sm text-zinc-500 mb-6">
        {tenant.owner_email} · {tenant.owner_phone || "(sem telefone)"}
      </p>

      {/* Subscription Info */}
      <Section title="Assinatura">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <InfoRow label="Plano" value={tenant.plan_name || "Nenhum"} />
          <InfoRow label="Ciclo" value={tenant.billing_interval || "-"} />
          <InfoRow label="Status" value={tenant.subscription_status} />
          <InfoRow label="Taxa" value={`${((tenant.commission_rate || 0.025) * 100).toFixed(1)}%`} />
          {tenant.trial_end && (
            <InfoRow label="Trial até" value={new Date(tenant.trial_end).toLocaleDateString("pt-BR")} />
          )}
        </div>
      </Section>

      {/* Usage */}
      <Section title="Uso">
        <div className="grid grid-cols-3 gap-3 text-sm">
          <InfoRow label="Profissionais" value={tenant.staff_count} />
          <InfoRow label="Serviços" value={tenant.service_count} />
          <InfoRow label="Clientes" value={tenant.customer_count} />
          <InfoRow label="Agendamentos" value={tenant.booking_count} />
          <InfoRow label="Pagamentos" value={tenant.payment_count} />
          <InfoRow label="MP" value={tenant.has_mp ? "✅" : "❌"} />
        </div>
      </Section>

      {/* Attribution */}
      <Section title="Atribuição">
        {tenant.attribution ? (
          <pre className="text-xs text-zinc-400 bg-zinc-950 rounded p-3 overflow-auto">
            {JSON.stringify(tenant.attribution, null, 2)}
          </pre>
        ) : (
          <p className="text-xs text-zinc-600">Sem dados de atribuição</p>
        )}
      </Section>

      {/* Questionnaire */}
      <Section title="Questionário">
        {tenant.questionnaire ? (
          <div className="grid grid-cols-2 gap-2 text-sm">
            <InfoRow label="Clientes/semana" value={tenant.questionnaire.weekly_clients || "-"} />
            <InfoRow label="Faturamento" value={tenant.questionnaire.monthly_revenue || "-"} />
            <InfoRow label="Desafio" value={tenant.questionnaire.biggest_challenge || "-"} />
            <InfoRow label="Como conheceu" value={tenant.questionnaire.heard_from || "-"} />
          </div>
        ) : (
          <p className="text-xs text-zinc-600">Não respondeu</p>
        )}
      </Section>

      {/* Admin Actions */}
      <Section title="Ações da Assinatura">
        <div className="space-y-4">
          {/* Extend Trial */}
          <ActionRow label="⏰ Estender Trial">
            <Input
              type="number"
              value={trialDays}
              onChange={(e) => setTrialDays(e.target.value)}
              className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm"
            />
            <span className="text-xs text-zinc-500">dias</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("extend_trial")}
              onClick={() => adminStripeAction("extend_trial", { days: parseInt(trialDays) })}
              className="h-8 text-xs border-zinc-700"
            >
              Estender
            </Button>
          </ActionRow>

          {/* Apply Discount */}
          <ActionRow label="💰 Aplicar Desconto">
            <Input
              type="number"
              value={discountPercent}
              onChange={(e) => setDiscountPercent(e.target.value)}
              className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm"
            />
            <span className="text-xs text-zinc-500">%</span>
            <Input
              type="number"
              value={discountMonths}
              onChange={(e) => setDiscountMonths(e.target.value)}
              className="w-16 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm"
            />
            <span className="text-xs text-zinc-500">meses</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("apply_coupon")}
              onClick={() =>
                adminStripeAction("apply_coupon", {
                  percent_off: parseInt(discountPercent),
                  duration: "repeating",
                  duration_months: parseInt(discountMonths),
                })
              }
              className="h-8 text-xs border-zinc-700"
            >
              Aplicar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("remove_coupon")}
              onClick={() => adminStripeAction("remove_coupon")}
              className="h-8 text-xs border-zinc-700 text-red-400"
            >
              Remover
            </Button>
          </ActionRow>

          {/* Commission Rate */}
          <ActionRow label="📊 Taxa de Comissão">
            <Input
              type="number"
              step="0.1"
              value={commissionRate}
              onChange={(e) => setCommissionRate(e.target.value)}
              className="w-20 bg-zinc-950 border-zinc-800 text-zinc-200 h-8 text-sm"
            />
            <span className="text-xs text-zinc-500">%</span>
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("update_commission")}
              onClick={() =>
                adminStripeAction("update_commission", {
                  commission_rate: parseFloat(commissionRate) / 100,
                })
              }
              className="h-8 text-xs border-zinc-700"
            >
              Salvar
            </Button>
          </ActionRow>

          {/* Cancel */}
          <ActionRow label="❌ Cancelar Assinatura">
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("cancel_subscription")}
              onClick={() => adminStripeAction("cancel_subscription", { immediate: false })}
              className="h-8 text-xs border-zinc-700"
            >
              No fim do período
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("cancel_subscription")}
              onClick={() => {
                if (confirm("Cancelar IMEDIATAMENTE? O acesso será removido agora.")) {
                  adminStripeAction("cancel_subscription", { immediate: true });
                }
              }}
              className="h-8 text-xs border-red-800 text-red-400 hover:bg-red-950"
            >
              Cancelar agora
            </Button>
          </ActionRow>

          {/* Reactivate */}
          <ActionRow label="🔄 Reativar">
            <Button
              size="sm"
              variant="outline"
              disabled={isActionLoading("reactivate_subscription")}
              onClick={() => adminStripeAction("reactivate_subscription")}
              className="h-8 text-xs border-zinc-700"
            >
              Reativar assinatura
            </Button>
          </ActionRow>
        </div>
      </Section>

      {/* Invoices */}
      <Section title="Faturas">
        {invoices === null ? (
          <Button size="sm" variant="outline" onClick={loadInvoices} className="text-xs border-zinc-700">
            Carregar faturas
          </Button>
        ) : invoices.length === 0 ? (
          <p className="text-xs text-zinc-600">Nenhuma fatura encontrada.</p>
        ) : (
          <div className="space-y-2">
            {invoices.map((inv: any) => (
              <div key={inv.id} className="flex items-center justify-between bg-zinc-950 rounded-lg px-3 py-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="text-zinc-400 font-mono">{inv.id?.slice(0, 12)}</span>
                  <span className="text-zinc-200">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                      (inv.amount_due || 0) / 100
                    )}
                  </span>
                  <span className={inv.status === "paid" ? "text-emerald-400" : "text-zinc-500"}>{inv.status}</span>
                </div>
                {inv.hosted_invoice_url && (
                  <a href={inv.hosted_invoice_url} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-zinc-300">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <p className="text-[10px] text-zinc-700 mt-8">ID: {tenant.id} · Criado: {new Date(tenant.created_at).toLocaleDateString("pt-BR")}</p>
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

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <span className="text-zinc-500 text-xs">{label}</span>
      <p className="text-zinc-200 text-sm">{String(value)}</p>
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
