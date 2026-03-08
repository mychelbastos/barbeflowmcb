import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Check, X, Minus } from "lucide-react";

const comparacao = [
  { feature: "Agendamento online", modogestor: true, concorrentes: true },
  { feature: "WhatsApp automático", modogestor: true, concorrentes: "partial" },
  { feature: "Pagamento online (Mercado Pago)", modogestor: true, concorrentes: false },
  { feature: "Proteção anti-falta", modogestor: true, concorrentes: false },
  { feature: "Desconto inteligente", modogestor: true, concorrentes: false },
  { feature: "Cartão fidelidade digital", modogestor: true, concorrentes: "partial" },
  { feature: "Comanda digital", modogestor: true, concorrentes: "partial" },
  { feature: "Comissão automática", modogestor: true, concorrentes: true },
  { feature: "Relatórios por barbeiro", modogestor: true, concorrentes: true },
  { feature: "App no celular (PWA)", modogestor: true, concorrentes: "partial" },
  { feature: "A partir de", modogestor: "R$ 59,90", concorrentes: "R$ 65-150+" },
];

function StatusIcon({ value }: { value: boolean | string }) {
  if (value === true) return <div className="w-5 h-5 rounded-full bg-emerald-500/10 flex items-center justify-center"><Check className="h-3 w-3 text-emerald-400" /></div>;
  if (value === false) return <div className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center"><X className="h-3 w-3 text-red-400/80" /></div>;
  if (value === "partial") return <div className="w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center"><Minus className="h-3 w-3 text-amber-400/80" /></div>;
  return <span className="text-sm font-semibold text-white">{value}</span>;
}

export default function LandingComparison() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8" ref={ref}>
      <div className="max-w-[700px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Comparação
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Compare e <span className="text-[#d4a843]">escolha.</span>
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="rounded-2xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left py-4 px-5 text-zinc-500 font-medium text-xs tracking-wide">Funcionalidade</th>
                <th className="text-center py-4 px-4">
                  <span className="text-[#d4a843] font-bold text-xs tracking-wide">modoGESTOR</span>
                </th>
                <th className="text-center py-4 px-4 text-zinc-600 font-medium text-xs tracking-wide">Outros</th>
              </tr>
            </thead>
            <tbody>
              {comparacao.map((row, i) => (
                <tr key={row.feature} className={`border-b border-white/[0.03] ${i === comparacao.length - 1 ? "border-b-0" : ""}`}>
                  <td className="py-3.5 px-5 text-zinc-300 text-[13px]">{row.feature}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex justify-center">
                      <StatusIcon value={row.modogestor} />
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex justify-center">
                      <StatusIcon value={row.concorrentes} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      </div>
    </section>
  );
}
