import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Wallet } from "lucide-react";

interface Props {
  customerId: string;
  tenantId: string;
}

export function CustomerBalanceAlert({ customerId, tenantId }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!customerId || !tenantId) return;
    
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("customer_balance_entries")
          .select("type, amount_cents")
          .eq("customer_id", customerId)
          .eq("tenant_id", tenantId);

        if (error) throw error;

        const total = (data || []).reduce((sum, e) => {
          return sum + (e.type === "credit" ? e.amount_cents : -e.amount_cents);
        }, 0);

        setBalance(total);
      } catch {
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [customerId, tenantId]);

  if (loading || balance === null || balance === 0) return null;

  const isNegative = balance < 0;
  const absValue = (Math.abs(balance) / 100).toFixed(2);

  return (
    <div
      className={`flex items-start gap-2.5 p-3 rounded-lg border ${
        isNegative
          ? "bg-red-500/10 border-red-500/30"
          : "bg-emerald-500/10 border-emerald-500/30"
      }`}
    >
      <AlertCircle
        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
          isNegative ? "text-red-500" : "text-emerald-500"
        }`}
      />
      <div className="min-w-0">
        <p
          className={`text-sm font-semibold ${
            isNegative ? "text-red-500" : "text-emerald-500"
          }`}
        >
          {isNegative
            ? `⚠️ Cliente com saldo pendente: -R$ ${absValue}`
            : `⚠️ Cliente com crédito: +R$ ${absValue}`}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {isNegative
            ? "Cliente deve este valor à barbearia"
            : "Barbearia deve troco/crédito ao cliente"}
        </p>
      </div>
    </div>
  );
}
