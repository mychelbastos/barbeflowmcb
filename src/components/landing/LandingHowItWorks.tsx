import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";
import { UserPlus, Settings, Share2 } from "lucide-react";

const passos = [
  { icon: UserPlus, num: "01", title: "Crie sua conta", desc: "Preencha seus dados e escolha seu plano. 14 dias grátis para testar." },
  { icon: Settings, num: "02", title: "Configure seus serviços", desc: "Adicione serviços, horários e conecte o Mercado Pago. A gente te guia." },
  { icon: Share2, num: "03", title: "Compartilhe seu link", desc: "Mande o link para seus clientes por WhatsApp, Instagram ou onde preferir." },
];

export default function LandingHowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref} id="como-funciona">
      <div className="max-w-[1100px] mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Como funciona
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Pronto em <span className="text-[#d4a843]">10 minutos.</span>
          </h2>
        </motion.div>

        {/* Steps */}
        <div className="grid sm:grid-cols-3 gap-4 sm:gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden sm:block absolute top-[3.5rem] left-[20%] right-[20%] h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent" />

          {passos.map((p, i) => {
            const Icon = p.icon;
            return (
              <motion.div
                key={p.num}
                initial={{ opacity: 0, y: 20 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.1 + i * 0.12 }}
                className="relative text-center group"
              >
                {/* Number circle */}
                <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-5 relative z-10 group-hover:border-[#d4a843]/20 transition-colors duration-500">
                  <span className="text-sm font-bold text-[#d4a843] tracking-wider">{p.num}</span>
                </div>
                <h3 className="text-[15px] font-semibold text-white mb-2">{p.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed max-w-[260px] mx-auto">{p.desc}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center mt-14"
        >
          <a href={getDashboardUrl("/app/login")}>
            <button className="px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]">
              Começar agora — é grátis
            </button>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
