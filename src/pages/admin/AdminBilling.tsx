import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CreditCard, DollarSign, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const formatBRL = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const formatDate = (d: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "-";

export default function AdminBilling() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [invFilter, setInvFilter] = useState("");

  useEffect(() => {
    (async () => {
      const [invRes, feeRes] = await Promise.all([
        supabase.rpc("admin_list_invoices" as any, { p_limit: 100 }),
        supabase.rpc("admin_list_platform_fees" as any, { p_limit: 100 }),
      ]);
      if (invRes.data) setInvoices(invRes.data as any[]);
      if (feeRes.data) setFees(feeRes.data as any[]);
      setLoading(false);
    })();
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-6 h-6 border-2 border-zinc-700 border-t-[hsl(44,65%,54%)] rounded-full animate-spin" />
    </div>
  );

  const filteredInvoices = invFilter
    ? invoices.filter((inv) => inv.status === invFilter)
    : invoices;

  const feeSummary = {
    collected: fees.filter(f => f.status === 'collected').reduce((a, b) => a + (b.fee_amount_cents || 0), 0),
    pending: fees.filter(f => f.status === 'pending').reduce((a, b) => a + (b.fee_amount_cents || 0), 0),
    total: fees.length,
  };

  const invStatuses = ["", "paid", "open", "draft", "void"];
  const invStatusLabels: Record<string, string> = { "": "Todas", paid: "Pagas", open: "Pendentes", draft: "Draft", void: "Void" };

  return (
    <div>
      <h1 className="text-xl font-bold text-zinc-100 mb-6">Billing</h1>

      {/* Invoices */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Faturas Stripe</h3>
      <div className="flex gap-1.5 mb-4 flex-wrap">
        {invStatuses.map((s) => (
          <Button key={s || "all"} variant="outline" size="sm"
            onClick={() => setInvFilter(s)}
            className={`text-xs border-zinc-800 ${invFilter === s
              ? "bg-[hsl(44,65%,54%)]/10 text-[hsl(44,65%,54%)] border-[hsl(44,65%,54%)]/30"
              : "text-zinc-400 hover:text-zinc-200"}`}>
            {invStatusLabels[s] || s}
          </Button>
        ))}
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto mb-8">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left p-3">Invoice</th>
              <th className="text-left p-3">Barbearia</th>
              <th className="text-right p-3">Valor</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Data</th>
              <th className="text-center p-3">Link</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-zinc-600">Nenhuma fatura encontrada.</td></tr>
            ) : filteredInvoices.map((inv: any) => (
              <tr key={inv.id} className="border-b border-zinc-800/50">
                <td className="p-3 text-zinc-400 font-mono">{inv.number || inv.stripe_invoice_id?.slice(0, 16) || '-'}</td>
                <td className="p-3 text-zinc-200">{inv.tenant_name || '-'}</td>
                <td className="p-3 text-right text-zinc-200 font-medium">{formatBRL(inv.amount_due || 0)}</td>
                <td className="p-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    inv.status === 'paid' ? 'bg-emerald-500/15 text-emerald-400' :
                    inv.status === 'open' ? 'bg-amber-500/15 text-amber-400' :
                    inv.status === 'draft' ? 'bg-zinc-500/15 text-zinc-400' :
                    'bg-red-500/15 text-red-400'
                  }`}>
                    {inv.status === 'paid' ? '✅ Pago' :
                     inv.status === 'open' ? '⏳ Aberto' :
                     inv.status === 'draft' ? '📝 Draft' :
                     inv.status}
                  </span>
                </td>
                <td className="p-3 text-zinc-500">{formatDate(inv.created_at)}</td>
                <td className="p-3 text-center">
                  {inv.invoice_url && (
                    <a href={inv.invoice_url} target="_blank" rel="noopener noreferrer"
                      className="text-zinc-500 hover:text-zinc-300 inline-flex">
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Platform Fees */}
      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Comissões da Plataforma</h3>
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Total coletado</p>
          <p className="text-xl font-bold text-emerald-400">{formatBRL(feeSummary.collected)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Pendente</p>
          <p className="text-xl font-bold text-amber-400">{formatBRL(feeSummary.pending)}</p>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <p className="text-xs text-zinc-500">Total transações</p>
          <p className="text-xl font-bold text-zinc-200">{feeSummary.total}</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-500">
              <th className="text-left p-3">Barbearia</th>
              <th className="text-right p-3">Transação</th>
              <th className="text-right p-3">Taxa</th>
              <th className="text-right p-3">Comissão</th>
              <th className="text-left p-3">Status</th>
              <th className="text-left p-3">Data</th>
            </tr>
          </thead>
          <tbody>
            {fees.length === 0 ? (
              <tr><td colSpan={6} className="p-6 text-center text-zinc-600">Nenhuma comissão registrada.</td></tr>
            ) : fees.map((f: any) => (
              <tr key={f.id} className="border-b border-zinc-800/50">
                <td className="p-3 text-zinc-200">{f.tenant_name || '-'}</td>
                <td className="p-3 text-right text-zinc-300">{formatBRL(f.transaction_amount_cents || 0)}</td>
                <td className="p-3 text-right text-zinc-400">{((f.commission_rate || 0) * 100).toFixed(1)}%</td>
                <td className="p-3 text-right text-[hsl(44,65%,54%)] font-medium">{formatBRL(f.fee_amount_cents || 0)}</td>
                <td className="p-3">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    f.status === 'collected' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'
                  }`}>{f.status === 'collected' ? '✅ Coletado' : '⏳ Pendente'}</span>
                </td>
                <td className="p-3 text-zinc-500">{formatDate(f.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
