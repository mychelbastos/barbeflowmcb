import { useEffect, useRef, useState } from "react";
import { getDashboardUrl } from "@/lib/hostname";
import { Play } from "lucide-react";

export default function LandingHero() {
  return (
    <section
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{
        fontFamily: "'Satoshi', sans-serif",
        background: `
          radial-gradient(ellipse 80% 50% at 50% 0%, rgba(212,168,67,0.04) 0%, transparent 50%),
          #050505
        `,
      }}
    >
      {/* Grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "128px 128px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 pt-28 sm:pt-32 pb-8 w-full">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div className="animate-fade-up opacity-0 mb-8" style={{ animationDelay: "200ms" }}>
            <span className="inline-block border border-[#d4a843]/20 text-[#d4a843] text-xs font-medium px-4 py-1.5 rounded-full bg-[#d4a843]/5 tracking-wide">
              Para barbearias modernas
            </span>
          </div>

          {/* Heading */}
          <h1
            className="animate-fade-up opacity-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-[-0.02em] mb-6 max-w-3xl"
            style={{ animationDelay: "300ms" }}
          >
            <span className="text-white">Sua barbearia pode</span>
            <br />
            <span className="bg-gradient-to-r from-[#d4a843] to-[#e8c066] bg-clip-text text-transparent">
              faturar mais.
            </span>
          </h1>

          {/* Subtitle */}
          <p
            className="animate-fade-up opacity-0 text-lg md:text-xl text-zinc-400 mb-10 max-w-[480px] leading-relaxed font-normal"
            style={{ animationDelay: "400ms" }}
          >
            Agendamento online, pagamento antecipado e gestão completa. Sem complicação.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up opacity-0 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4 w-full sm:w-auto"
            style={{ animationDelay: "500ms" }}
          >
            <a href={getDashboardUrl("/app/login")} className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-7 py-3.5 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-xl text-base transition-all duration-200 hover:shadow-lg hover:shadow-[#d4a843]/20">
                Começar grátis — 14 dias
              </button>
            </a>
            <a href="#como-funciona" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto px-7 py-3.5 border border-white/10 text-zinc-300 rounded-xl text-base font-medium transition-all duration-200 hover:border-white/20 hover:text-white flex items-center justify-center gap-2">
                <Play className="h-4 w-4" />
                Ver como funciona
              </button>
            </a>
          </div>

          {/* Microcopy */}
          <p
            className="animate-fade-up opacity-0 text-xs text-zinc-600 mb-14"
            style={{ animationDelay: "550ms" }}
          >
            Teste grátis por 14 dias · Cancele quando quiser
          </p>

          {/* Video Frame with Stats */}
          <div
            className="animate-fade-up opacity-0 relative w-full max-w-[820px]"
            style={{ animationDelay: "600ms" }}
          >
            {/* Glow behind frame */}
            <div className="absolute -inset-4 bg-[#d4a843]/[0.03] rounded-[2rem] blur-3xl -z-10" />

            {/* Frame container */}
            <div className="relative rounded-3xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-6 md:p-8 backdrop-blur-sm">
              {/* Stats row TOP */}
              <div className="flex justify-between items-center mb-5 sm:mb-6 px-1 sm:px-2">
                <StatItem number={2600} suffix="+" label="clientes atendidos" />
                <StatItem number={27} prefix="R$ " suffix=" mil" label="processados" highlight />
                <StatItem number={940} suffix="+" label="agendamentos" />
              </div>

              {/* Video Player */}
              <div className="relative aspect-video rounded-2xl border border-white/10 shadow-2xl shadow-black/60 overflow-hidden bg-[#0a0a0a]">
                <iframe
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ"
                  title="modoGESTOR — sistema de gestão para barbearias"
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>

              {/* Stats row BOTTOM */}
              <div className="flex justify-between items-center mt-5 sm:mt-6 px-1 sm:px-2">
                <StatItem number={52} suffix="%" label="agendamentos online" />
                <StatItem number={40} prefix="R$ " label="ticket médio" highlight />
                <StatItem number={459} label="lembretes enviados" />
              </div>
            </div>
          </div>
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
    <div className="text-center min-w-0">
      <p
        className={`text-lg sm:text-xl md:text-2xl font-bold tracking-tight ${
          highlight ? "text-[#d4a843]" : "text-white"
        }`}
        style={{ fontFamily: "'Satoshi', sans-serif" }}
      >
        {prefix}
        <CountUp target={number} />
        {suffix}
      </p>
      <p className="text-[10px] sm:text-[11px] text-zinc-500 uppercase tracking-wider mt-0.5 font-medium">
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
          const duration = 1200;
          const start = performance.now();
          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{value.toLocaleString("pt-BR")}</span>;
}
