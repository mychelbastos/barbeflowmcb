import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useSubscriptionEvents } from "@/hooks/useSubscriptionInsights";
import { MonthNavigator } from "@/components/subscriptions/MonthNavigator";
import { ReportCard } from "@/components/reports/ReportCard";
import { UserPlus, RefreshCw, UserMinus, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SubscriptionCalendar() {
  const { currentTenant } = useTenant();
  const [month, setMonth] = useState(new Date());
  const { data, isLoading } = useSubscriptionEvents(currentTenant?.id, month);

  // Group events by day
  const grouped = (data?.events || []).reduce<Record<string, typeof data.events>>((acc, e) => {
    const key = format(new Date(e.date), "yyyy-MM-dd");
    if (!acc[key]) acc[key] = [];
    acc[key].push(e);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort();

  return (
    <div className="space-y-5 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Calendário de Assinaturas</h1>
        <p className="text-sm text-muted-foreground">Timeline de ativações, renovações e cancelamentos</p>
      </div>

      <MonthNavigator month={month} onChange={setMonth} />

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ReportCard icon={UserPlus} label="Novas" value={String(data?.newCount || 0)} />
            <ReportCard icon={RefreshCw} label="Renovações" value={String(data?.renewalCount || 0)} />
            <ReportCard icon={UserMinus} label="Cancelamentos" value={String(data?.cancelledCount || 0)} />
            <ReportCard icon={DollarSign} label="MRR atual" value={formatBRL(data?.mrr || 0)} />
          </div>

          {sortedDays.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Nenhum evento neste mês.</p>
          ) : (
            <div className="space-y-4">
              {sortedDays.map(day => (
                <div key={day}>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">
                    📅 {format(new Date(day + "T12:00:00"), "d 'de' MMMM", { locale: ptBR })}
                  </p>
                  <div className="space-y-1.5">
                    {grouped[day].map((e, i) => {
                      const desc = e.type === "new"
                        ? `${e.customerName} assinou "${e.planName}" – ${formatBRL(e.priceCents)}`
                        : e.type === "cancelled"
                        ? `${e.customerName} cancelou "${e.planName}"`
                        : e.type === "renewal"
                        ? `${e.customerName} renovou "${e.planName}"`
                        : `${e.customerName} pagou ${formatBRL(e.priceCents)} – "${e.planName}"`;

                      return (
                        <div key={`${day}-${i}`} className="flex items-start gap-3 px-3 py-2.5 bg-card border border-border rounded-xl">
                          <span className="text-base flex-shrink-0">{e.icon}</span>
                          <p className="text-sm text-foreground">{desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
