import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Sparkles, Shield, Trophy, BarChart3 } from "lucide-react";

const diferenciais = [
  {
    icon: Sparkles,
    tag: "EXCLUSIVO",
    title: "Desconto Inteligente",
    desc: "Ofereça desconto para quem paga online. Mais pré-pagamentos = menos faltas = mais dinheiro certo.",
    gradient: "from-amber-500/10 via-transparent to-transparent",
  },
  {
    icon: Shield,
    tag: "EXCLUSIVO",
    title: "Proteção Anti-Falta",
    desc: "Cliente não apareceu? Retenha 30% automaticamente e devolva o resto. Sem constrangimento.",
    gradient: "from-emerald-500/10 via-transparent to-transparent",
  },
  {
    icon: Trophy,
    tag: "ILIMITADO",
    title: "Cartão Fidelidade Digital",
    desc: "Clientes acumulam selos a cada corte. Completou? Ganha um serviço grátis. Volta garantida.",
    gradient: "from-violet-500/10 via-transparent to-transparent",
  },
  {
    icon: BarChart3,
    tag: "NOVO",
    title: "Resumo Semanal no WhatsApp",
    desc: "Todo sábado às 20h: atendimentos, faturamento e performance da equipe. Direto no seu WhatsApp.",
    gradient: "from-blue-500/10 via-transparent to-transparent",
  },
];

export default function LandingDifferentials() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref}>
      <div className="max-w-[1100px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Diferenciais
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-lg mx-auto">
            Funcionalidades que só o modoGESTOR tem.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {diferenciais.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 hover:border-[#d4a843]/15 transition-all duration-500 overflow-hidden"
              >
                {/* Subtle gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${d.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-[#d4a843]/[0.08] border border-[#d4a843]/[0.12] flex items-center justify-center text-[#d4a843]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-[9px] font-bold tracking-[0.15em] uppercase px-2.5 py-1 rounded-md bg-[#d4a843]/[0.06] text-[#d4a843]/80 border border-[#d4a843]/[0.1]">
                      {d.tag}
                    </span>
                  </div>
                  <h3 className="text-[15px] font-semibold text-white mb-2">{d.title}</h3>
                  <p className="text-sm text-zinc-500 leading-relaxed">{d.desc}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
