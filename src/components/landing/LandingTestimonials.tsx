import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Quote } from "lucide-react";

const depoimentos = [
  {
    text: "Antes eu ficava o dia todo no WhatsApp tentando organizar a agenda. Agora meus clientes agendam sozinhos e eu recebo antes do atendimento. Mudou meu negócio.",
    name: "Adriano Alves",
    role: "Barbearia Adriano Alves",
    city: "Feira de Santana/BA",
  },
  {
    text: "O sistema é simples de usar. Meus barbeiros se adaptaram rápido e o controle financeiro ficou muito mais claro. Agora sei exatamente quanto cada um fatura.",
    name: "Wendson",
    role: "WS Barbearia",
    city: "Feira de Santana/BA",
  },
];

export default function LandingTestimonials() {
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
            Depoimentos
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Quem usa, <span className="text-[#d4a843]">recomenda.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
          {depoimentos.map((d, i) => (
            <motion.div
              key={d.name}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
              className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-7 sm:p-8 hover:border-white/[0.1] transition-all duration-500"
            >
              {/* Quote icon */}
              <div className="w-8 h-8 rounded-lg bg-[#d4a843]/[0.06] flex items-center justify-center mb-5">
                <Quote className="h-3.5 w-3.5 text-[#d4a843]/60" />
              </div>

              <p className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed mb-6">
                "{d.text}"
              </p>

              <div className="flex items-center gap-3 pt-5 border-t border-white/[0.04]">
                {/* Avatar placeholder */}
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#d4a843]/20 to-[#d4a843]/5 flex items-center justify-center text-[#d4a843] text-xs font-bold">
                  {d.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{d.name}</p>
                  <p className="text-xs text-zinc-500">{d.role} · {d.city}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
