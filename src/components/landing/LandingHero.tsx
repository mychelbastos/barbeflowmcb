import { useEffect, useRef, useState } from "react";
import { getDashboardUrl } from "@/lib/hostname";
import mobileMockup from "@/assets/mobile-mockup.png";
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
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '128px 128px',
        }}
      />

      {/* Content */}
      <div className="relative z-10 max-w-[1200px] mx-auto px-5 sm:px-8 pt-28 sm:pt-32 pb-8 w-full">
        <div className="flex flex-col items-center text-center">
          {/* Badge */}
          <div
            className="animate-fade-up opacity-0 mb-8"
            style={{ animationDelay: '200ms' }}
          >
            <span className="inline-block border border-[#d4a843]/20 text-[#d4a843] text-xs font-medium px-4 py-1.5 rounded-full bg-[#d4a843]/5 tracking-wide">
              Para barbearias modernas
            </span>
          </div>

          {/* Heading */}
          <h1
            className="animate-fade-up opacity-0 text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-[-0.02em] mb-6 max-w-3xl"
            style={{ animationDelay: '300ms' }}
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
            style={{ animationDelay: '400ms' }}
          >
            Agendamento online, pagamento antecipado e gestão completa. Sem complicação.
          </p>

          {/* CTAs */}
          <div
            className="animate-fade-up opacity-0 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-4 w-full sm:w-auto"
            style={{ animationDelay: '500ms' }}
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
            style={{ animationDelay: '550ms' }}
          >
            Teste grátis por 14 dias · Cancele quando quiser
          </p>

          {/* Mockup */}
          <div
            className="animate-fade-up opacity-0 relative w-full max-w-[720px]"
            style={{ animationDelay: '600ms' }}
          >
            {/* Glow behind mockup */}
            <div
              className="absolute -inset-x-20 -inset-y-10 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse at center, rgba(212,168,67,0.08) 0%, transparent 70%)',
              }}
            />
            <div className="relative rounded-2xl border border-white/10 shadow-2xl shadow-black/50 overflow-hidden bg-[#0a0a0a]">
              <img
                src={mobileMockup}
                alt="modoGESTOR — sistema de gestão para barbearias"
                className="w-full h-auto"
                loading="eager"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Credibility Bar */}
      <div className="relative z-10 w-full border-t border-white/5 mt-16">
        <div
          className="animate-fade-up opacity-0 max-w-[1200px] mx-auto px-5 sm:px-8 py-10 flex flex-wrap justify-center gap-8 sm:gap-16"
          style={{ animationDelay: '800ms' }}
        >
          <CredStat number={2600} suffix="+" label="clientes atendidos" />
          <CredStat number={940} suffix="+" label="agendamentos realizados" />
          <CredStat number={100} suffix="%" label="brasileiro" />
        </div>
      </div>
    </section>
  );
}

function CredStat({ number, suffix, label }: { number: number; suffix: string; label: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl sm:text-3xl font-bold text-white tracking-tight" style={{ fontFamily: "'Satoshi', sans-serif" }}>
        <CountUp target={number} />{suffix}
      </p>
      <p className="text-[11px] text-zinc-500 uppercase tracking-wider mt-1 font-medium">
        {label}
      </p>
    </div>
  );
}

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
