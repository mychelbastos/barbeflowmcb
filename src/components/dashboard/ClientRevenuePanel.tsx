import { useMemo } from "react";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

interface ClientRevenuePanelProps {
  bookings: {
    customer?: { name: string; phone: string };
    service?: { price_cents: number };
    status: string;
  }[];
  totalRevenue: number;
}

export function ClientRevenuePanel({ bookings, totalRevenue }: ClientRevenuePanelProps) {
  const clientData = useMemo(() => {
    const map = new Map<string, { name: string; revenue: number; count: number }>();
    bookings
      .filter(b => b.status === "confirmed" || b.status === "completed")
      .forEach(b => {
        const name = b.customer?.name || "Desconhecido";
        const existing = map.get(name) || { name, revenue: 0, count: 0 };
        existing.revenue += b.service?.price_cents || 0;
        existing.count += 1;
        map.set(name, existing);
      });
    return Array.from(map.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 8);
  }, [bookings]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 20, filter: "blur(4px)" }}
      animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="rounded-2xl glass-panel overflow-hidden"
    >
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Receita por Cliente</span>
          </div>
        </div>

        <div className="space-y-1">
          {clientData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado no período</p>
          ) : (
            clientData.map((client, idx) => (
              <motion.div
                key={client.name}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.3 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors duration-300 group"
              >
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground flex-shrink-0">
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                  <p className="text-[10px] text-muted-foreground">{client.count} agend.</p>
                </div>
                <span className="text-sm font-bold text-primary tabular-nums flex-shrink-0">
                  R$ {(client.revenue / 100).toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
                </span>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </motion.div>
  );
}
