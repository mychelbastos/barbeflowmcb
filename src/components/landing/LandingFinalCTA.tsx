import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

export default function LandingFinalCTA() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const handleClick = () => {
    trackViewContent("cta_clicked");
    window.location.href = getDashboardUrl("/app/login");
  };

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref}>
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[500px] h-[300px] bg-[#d4a843]/[0.04] rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="max-w-[600px] mx-auto text-center relative"
      >
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
          Sua barbearia merece uma
          <br />
          <span className="bg-gradient-to-r from-[#d4a843] to-[#e8c066] bg-clip-text text-transparent">
            gestão profissional.
          </span>
        </h2>

        <p className="text-zinc-400 mb-8 text-base">
          Comece agora — é grátis por 14 dias.
        </p>

        <button
          onClick={handleClick}
          className="group inline-flex items-center gap-2 px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]"
        >
          Criar minha conta grátis
          <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
        </button>

        <p className="text-xs text-zinc-600 mt-5 tracking-wide">
          Sem compromisso · Cancele quando quiser
        </p>
      </motion.div>
    </section>
  );
}
