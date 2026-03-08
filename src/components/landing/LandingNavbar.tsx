import { useState, useEffect } from "react";
import { getDashboardUrl } from "@/lib/hostname";
import { useAuth } from "@/hooks/useAuth";
import logoBranca from "@/assets/modoGESTOR_branca.png";

export default function LandingNavbar() {
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-[#050505]/80 backdrop-blur-2xl border-b border-white/[0.04]"
          : "bg-transparent"
      }`}
      style={{ fontFamily: "'Satoshi', sans-serif" }}
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 flex items-center justify-between h-16">
        <a href="/" className="shrink-0">
          <img src={logoBranca} alt="modoGESTOR" className="h-[20px] opacity-90" />
        </a>

        <div className="flex items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <a href={getDashboardUrl("/app/dashboard")}>
              <button className="px-5 py-2 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-lg text-sm transition-all duration-300 hover:shadow-[0_4px_16px_-4px_rgba(212,168,67,0.3)]">
                Meu Painel
              </button>
            </a>
          ) : (
            <>
              <a href={getDashboardUrl("/app/login")} className="hidden sm:block">
                <button className="px-4 py-2 text-zinc-500 hover:text-white text-sm font-medium transition-colors duration-300">
                  Entrar
                </button>
              </a>
              <a href={getDashboardUrl("/app/login")}>
                <button className="px-5 py-2 bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] font-semibold rounded-lg text-sm transition-all duration-300 hover:shadow-[0_4px_16px_-4px_rgba(212,168,67,0.3)]">
                  Começar grátis
                </button>
              </a>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
