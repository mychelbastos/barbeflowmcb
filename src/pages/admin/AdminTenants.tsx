import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronRight, Wifi, CreditCard, DollarSign, Calendar } from "lucide-react";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  email: string;
  phone: string;
  subscription_status: string;
  plan_name: string;
  billing_interval: string;
  commission_rate: number;
  stripe_status: string;
  trial_end: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  discount_name: string | null;
  discount_percent_off: number | null;
  customers_count: number;
  bookings_total: number;
  bookings_7d: number;
  bookings_30d: number;
  payments_count: number;
  payments_paid_count: number;
  revenue_cents: number;
  platform_fees_cents: number;
  staff_count: number;
  services_count: number;
  mp_connected: boolean;
  wa_connected: boolean;
  created_at: string;
  attribution: any;
  first_touch_source: string | null;
  first_touch_campaign: string | null;
  touch_count: string | null;
}

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Ativo" },
  trialing: { bg: "bg-amber-500/15", text: "text-amber-400", label: "Trial" },
  canceled: { bg: "bg-red-500/15", text: "text-red-400", label: "Cancelado" },
  past_due: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Inadimplente" },
  unpaid: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Não pago" },
  none: { bg: "bg-zinc-500/15", text: "text-zinc-400", label: "Sem plano" },
};

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export default function AdminTenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.rpc("admin_list_tenants", {
      p_status: statusFilter || undefined,
      p_search: search || undefined,
      p_limit: 100,
      p_offset: 0,
    });
    if (data) setTenants(data as unknown as Tenant[]);
    setLoading(false);
  }, [search, statusFilter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const statuses = ["", "active", "trialing", "canceled", "past_due", "none"];

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Barbearias</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Buscar por nome, email, telefone ou slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-zinc-200 placeholder:text-zinc-600"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {statuses.map((s) => {
            const cfg = s ? statusConfig[s] : null;
            return (
              <Button
                key={s || "all"}
                variant="outline"
                size="sm"
                onClick={() => setStatusFilter(s)}
                className={`text-xs border-zinc-800 ${
                  statusFilter === s
                    ? "bg-[hsl(44,65%,54%)]/10 text-[hsl(44,65%,54%)] border-[hsl(44,65%,54%)]/30"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {cfg ? cfg.label : "Todos"}
              </Button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3">
          {tenants.map((t) => {
            const status = statusConfig[t.subscription_status] || statusConfig.none;
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/admin/tenants/${t.id}`)}
                className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${
                        t.subscription_status === "active" || t.subscription_status === "trialing" 
                          ? "bg-emerald-400" 
                          : t.subscription_status === "past_due" ? "bg-orange-400" : "bg-zinc-600"
                      }`} />
                      <span className="font-semibold text-zinc-100 truncate">{t.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
                        {status.label}
                      </span>
                      {t.plan_name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 capitalize">
                          {t.plan_name} · {t.billing_interval === "year" ? "Anual" : "Mensal"}
                        </span>
                      )}
                      {t.discount_name && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                          🏷️ {t.discount_percent_off ? `${t.discount_percent_off}% off` : t.discount_name}
                        </span>
                      )}
                      {t.cancel_at_period_end && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400">
                          Cancela no fim
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 flex items-center gap-3 flex-wrap">
                      <span>{t.email || "(sem email)"}</span>
                      <span>{t.phone || "(sem telefone)"}</span>
                      {t.slug && <span className="text-zinc-600">/{t.slug}</span>}
                    </div>
                    <div className="text-xs text-zinc-600 mt-1.5 flex items-center gap-3 flex-wrap">
                      <span>{t.customers_count} clientes</span>
                      <span>{t.bookings_total} bookings</span>
                      {t.revenue_cents > 0 && (
                        <span className="flex items-center gap-1 text-emerald-500/70">
                          <DollarSign className="h-3 w-3" />
                          {formatBRL(t.revenue_cents)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {t.mp_connected ? "✅" : "❌"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        {t.wa_connected ? "✅" : "❌"}
                      </span>
                      {t.first_touch_source && (
                        <span className="text-[hsl(44,65%,54%)]/60">
                          📍 {t.first_touch_source}{t.first_touch_campaign ? ` / ${t.first_touch_campaign}` : ""}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(t.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-zinc-600 group-hover:text-zinc-400 transition-colors mt-1 shrink-0" />
                </div>
              </button>
            );
          })}
          {tenants.length === 0 && (
            <p className="text-zinc-500 text-center py-8">Nenhuma barbearia encontrada.</p>
          )}
        </div>
      )}
    </div>
  );
}
