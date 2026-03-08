import { useEffect, useRef, useState } from "react";
import { getDashboardUrl } from "@/lib/hostname";
import { Play } from "lucide-react";
import { motion } from "framer-motion";

export default function LandingHero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,168,67,0.05) 0%, transparent 50%),
          radial-gradient(ellipse 60% 40% at 80% 100%, rgba(212,168,67,0.02) 0%, transparent 50%),
          #050505
        `,
      }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.025]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Subtle grid pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "64px 64px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 pt-28 sm:pt-36 pb-12 w-full">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-8"
          >
            <span className="inline-flex items-center gap-2 border border-[#d4a843]/15 text-[#d4a843] text-xs font-medium px-4 py-1.5 rounded-full bg-[#d4a843]/[0.04] tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d4a843] animate-pulse" />
              Sistema de gestão para barbearias
            </span>
          </motion.div>

          {/* Heading */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-[2.5rem] sm:text-5xl md:text-6xl lg:text-[4.5rem] font-extrabold leading-[1.06] tracking-[-0.03em] mb-6 max-w-[680px]"
          >
            <span className="text-white">Sua barbearia pode</span>
            <br />
            <span className="bg-gradient-to-r from-[#d4a843] via-[#e8c066] to-[#d4a843] bg-clip-text text-transparent">
              faturar mais.
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            className="text-base sm:text-lg md:text-xl text-zinc-400 mb-10 max-w-[460px] leading-relaxed font-normal"
          >
            Agendamento online, pagamento antecipado e gestão completa. Sem complicação.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.55 }}
            className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4 w-full sm:w-auto"
          >
            <a href={getDashboardUrl("/app/login")} className="w-full sm:w-auto">
              <button className="group w-full sm:w-auto px-8 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-300 hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.35)] hover:translate-y-[-1px]">
                Começar grátis — 14 dias
              </button>
            </a>
            <a href="#como-funciona" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-7 py-4 border border-white/[0.08] text-zinc-300 rounded-xl text-base font-medium transition-all duration-300 hover:border-white/20 hover:text-white hover:bg-white/[0.03] flex items-center justify-center gap-2.5">
                <Play className="h-4 w-4 text-[#d4a843]" />
                Ver como funciona
              </button>
            </a>
          </motion.div>

          {/* Microcopy */}
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="text-xs text-zinc-600 mb-16 tracking-wide"
          >
            Teste grátis por 14 dias · Cancele quando quiser
          </motion.p>

          {/* Video Frame with Stats */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="relative w-full max-w-[860px]"
          >
            {/* Glow behind frame */}
            <div className="absolute -inset-8 bg-gradient-to-b from-[#d4a843]/[0.04] to-transparent rounded-[3rem] blur-3xl -z-10" />

            {/* Frame container */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-3 sm:p-5 md:p-7 backdrop-blur-sm">
              {/* Stats row TOP */}
              <div className="flex justify-between items-center mb-4 sm:mb-5 px-1 sm:px-3">
                <StatItem number={2600} suffix="+" label="clientes atendidos" />
                <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />
                <StatItem number={27} prefix="R$" suffix="mil" label="processados" highlight />
                <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />
                <StatItem number={940} suffix="+" label="agendamentos" />
              </div>

              {/* Video Player */}
              <div className="relative aspect-video rounded-xl sm:rounded-2xl border border-white/[0.06] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.7)] overflow-hidden bg-[#0a0a0a]">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?modestbranding=1&rel=0"
                  title="modoGESTOR — sistema de gestão para barbearias"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>

              {/* Stats row BOTTOM */}
              <div className="flex justify-between items-center mt-4 sm:mt-5 px-1 sm:px-3">
                <StatItem number={52} suffix="%" label="agendamentos online" />
                <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />
                <StatItem number={40} prefix="R$" label="ticket médio" highlight />
                <div className="w-px h-6 bg-white/[0.06] hidden sm:block" />
                <StatItem number={459} label="lembretes enviados" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

/* ── Stat item with counter ── */
function StatItem({
  number,
  prefix = "",
  suffix = "",
  label,
  highlight = false,
}: {
  number: number;
  prefix?: string;
  suffix?: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div className="text-center min-w-0 flex-1">
      <p
        className={`text-base sm:text-lg md:text-xl font-bold tracking-tight ${
          highlight ? "text-[#d4a843]" : "text-white"
        }`}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        {prefix && <span className="text-[0.8em] mr-0.5">{prefix}</span>}
        <CountUp target={number} />
        {suffix && <span className="text-[0.8em] ml-0.5">{suffix}</span>}
      </p>
      <p className="text-[9px] sm:text-[10px] text-zinc-500 uppercase tracking-[0.12em] mt-0.5 font-medium">
        {label}
      </p>
    </div>
  );
}

/* ── Counter animation ── */
function CountUp({ target }: { target: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const animated = useRef(false);
  const [value, setValue] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !animated.current) {
          animated.current = true;
          const duration = 1400;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 4);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{value.toLocaleString("pt-BR")}</span>;
}
