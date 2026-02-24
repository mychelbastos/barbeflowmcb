import { useMemo } from "react";
import { motion } from "framer-motion";
import { Cake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Props {
  tenantId: string;
}

export function BirthdayPanel({ tenantId }: Props) {
  const currentMonth = new Date().getMonth() + 1;

  const { data: birthdays } = useQuery({
    queryKey: ["dashboard-birthdays", tenantId, currentMonth],
    queryFn: async () => {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, birthday")
        .eq("tenant_id", tenantId)
        .not("birthday", "is", null);

      if (!customers) return [];

      return customers
        .filter((c) => {
          if (!c.birthday) return false;
          const m = parseInt(c.birthday.split("-")[1], 10);
          return m === currentMonth;
        })
        .sort((a, b) => {
          const da = parseInt(a.birthday!.split("-")[2], 10);
          const db = parseInt(b.birthday!.split("-")[2], 10);
          return da - db;
        })
        .slice(0, 8);
    },
    enabled: !!tenantId,
  });

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
            <Cake className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
              Aniversariantes do Mês
            </span>
          </div>
        </div>

        <div className="space-y-1">
          {!birthdays?.length ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum aniversariante este mês</p>
          ) : (
            birthdays.map((client, idx) => {
              const day = client.birthday ? parseInt(client.birthday.split("-")[2], 10) : 0;
              const today = new Date().getDate();
              const isToday = day === today;

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, delay: 0.3 + idx * 0.04, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors duration-300 group"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
                    isToday ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                  }`}>
                    {day}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{client.name}</p>
                    <p className="text-[10px] text-muted-foreground">{client.phone}</p>
                  </div>
                  {isToday && (
                    <span className="text-xs font-semibold text-primary flex-shrink-0">🎂 Hoje!</span>
                  )}
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </motion.div>
  );
}
