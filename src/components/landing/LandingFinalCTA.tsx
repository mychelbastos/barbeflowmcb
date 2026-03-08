import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";

export default function LandingFinalCTA() {
  const handleClick = () => {
    trackViewContent("cta_clicked");
    window.location.href = getDashboardUrl("/app/login");
  };

  return (
    <section className="py-24 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 leading-tight">
          Sua barbearia merece uma
          <br />
          <span className="text-[#d4a843]">gestão profissional.</span>
        </h2>

        <p className="text-zinc-400 mb-8 text-base">
          Comece agora — é grátis por 14 dias.
        </p>

        <button
          onClick={handleClick}
          className="px-10 py-4 bg-[#d4a843] hover:bg-[#c49a3a] text-black font-bold rounded-xl text-base transition-transform duration-200 hover:scale-105 shadow-lg shadow-[#d4a843]/20"
        >
          Criar minha conta grátis
        </button>

        <p className="text-xs text-zinc-500 mt-4">
          Sem compromisso · Cancele quando quiser
        </p>
      </div>
    </section>
  );
}
