import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { getDashboardUrl } from "@/lib/hostname";

const passos = [
  { num: "1", title: "Crie sua conta", desc: "Preencha seus dados e escolha seu plano. 14 dias grátis para testar." },
  { num: "2", title: "Configure seus serviços", desc: "Adicione serviços, horários e conecte o Mercado Pago. A gente te guia." },
  { num: "3", title: "Compartilhe seu link", desc: "Mande o link para seus clientes por WhatsApp, Instagram ou onde preferir." },
];

export default function LandingHowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="py-20 px-4 sm:px-6" ref={ref}>
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-12">
          Pronto para receber clientes em <span className="text-[#d4a843]">10 minutos.</span>
        </h2>

        <div className="grid sm:grid-cols-3 gap-6 relative">
          {/* Connecting line (desktop) */}
          <div className="hidden sm:block absolute top-12 left-[16.6%] right-[16.6%] h-px border-t-2 border-dashed border-[#2a2a2a]" />

          {passos.map((p, i) => (
            <motion.div
              key={p.num}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center relative"
            >
              <div className="w-14 h-14 rounded-full bg-[#d4a843]/10 border-2 border-[#d4a843]/30 flex items-center justify-center mx-auto mb-4 relative z-10">
                <span className="text-xl font-bold text-[#d4a843]">{p.num}</span>
              </div>
              <h3 className="text-base font-semibold text-white mb-2">{p.title}</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-12">
          <a href={getDashboardUrl("/app/login")}>
            <button className="px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-black font-bold rounded-xl text-base transition-transform duration-200 hover:scale-105">
              Começar agora — é grátis
            </button>
          </a>
        </div>
      </div>
    </section>
  );
}
