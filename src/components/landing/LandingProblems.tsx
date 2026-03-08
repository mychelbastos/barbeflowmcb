import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { MessageSquare, UserX, BarChart3, RefreshCw } from "lucide-react";

const dores = [
  {
    icon: MessageSquare,
    title: "Passa o dia no WhatsApp",
    desc: '"Tem horário?" "Que horas?" "Qual preço?" — enquanto poderia estar atendendo.',
    accent: "from-blue-500/10 to-blue-600/5",
    iconColor: "text-blue-400",
  },
  {
    icon: UserX,
    title: "Cliente marca e não aparece",
    desc: "Cadeira vazia = dinheiro perdido. E você nem pode cobrar.",
    accent: "from-red-500/10 to-red-600/5",
    iconColor: "text-red-400",
  },
  {
    icon: BarChart3,
    title: "Não sabe quanto fatura",
    desc: "Comissão no chute, controle no papel. No fim do mês a conta não fecha.",
    accent: "from-amber-500/10 to-amber-600/5",
    iconColor: "text-amber-400",
  },
  {
    icon: RefreshCw,
    title: "Perde cliente sem perceber",
    desc: "Aquele que vinha todo mês sumiu. E você nem notou.",
    accent: "from-violet-500/10 to-violet-600/5",
    iconColor: "text-violet-400",
  },
];

export default function LandingProblems() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref}>
      <div className="max-w-[1100px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            O problema
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-xl mx-auto">
            Se isso é sua rotina, você precisa do modoGESTOR.
          </h2>
        </motion.div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
          {dores.map((d, i) => {
            const Icon = d.icon;
            return (
              <motion.div
                key={d.title}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.08 }}
                className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 sm:p-7 hover:border-white/[0.1] transition-all duration-500 hover:bg-white/[0.03] overflow-hidden"
              >
                {/* Accent gradient */}
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${d.accent} rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700`} />

                <div className="relative">
                  <div className={`w-10 h-10 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4 ${d.iconColor}`}>
                    <Icon className="h-5 w-5" />
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
