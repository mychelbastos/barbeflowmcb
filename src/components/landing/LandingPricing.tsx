import { useState, forwardRef } from "react";
import { Check } from "lucide-react";
import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";

const plans = [
  {
    name: "Profissional",
    monthly: 59.9,
    annual_monthly: 47.9,
    annual_total: 574.8,
    tax: "2,5%",
    professionals: "1 incluso + R$ 14,90/extra",
    features: [
      "Agendamento online",
      "Gestão de clientes",
      "Financeiro completo",
      "Notificações via WhatsApp",
      "Página pública de agendamento",
      "Pacotes e assinaturas",
      "Pagamentos online",
      "Relatórios",
      "Proteção contra cancelamentos",
      "Caixa e controle financeiro",
      "Comissões automáticas",
      "App no celular (PWA)",
      "Desconto Inteligente",
      "Resumo Semanal WhatsApp",
      "Proteção Anti-Falta",
    ],
    highlight: false,
  },
  {
    name: "Ilimitado",
    monthly: 109.9,
    annual_monthly: 87.9,
    annual_total: 1054.8,
    tax: "1,5%",
    professionals: "Ilimitados inclusos",
    features: [
      "Tudo do Profissional",
      "Foto Profissional (IA de imagem)",
      "Texto que Vende (IA de texto)",
      "Vitrine Inteligente (order bump)",
      "Cartão Fidelidade Digital",
      "Profissionais ilimitados",
      "Taxa de transação reduzida (1,5%)",
    ],
    highlight: true,
  },
];

const LandingPricing = forwardRef<HTMLElement>((_, ref) => {
  const [cycle, setCycle] = useState<"monthly" | "annual">("annual");

  const handleCTAClick = () => {
    trackViewContent("cta_clicked");
    window.location.href = getDashboardUrl("/app/login");
  };

  return (
    <section ref={ref} id="precos" className="py-20 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-3">
          Invista menos do que o preço de <span className="text-[#d4a843]">2 cortes</span> por mês.
        </h2>
        <p className="text-zinc-500 text-center mb-8 text-sm">
          14 dias grátis · Cancele quando quiser
        </p>

        {/* Toggle */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setCycle("monthly")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              cycle === "monthly" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setCycle("annual")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors relative ${
              cycle === "annual" ? "bg-white/10 text-white" : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              2 meses grátis
            </span>
          </button>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-6">
          {plans.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.annual_monthly;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl p-6 border transition-colors ${
                  plan.highlight
                    ? "bg-[#161616] border-[#d4a843]/30 shadow-lg shadow-[#d4a843]/5"
                    : "bg-[#161616] border-[#2a2a2a]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-widest uppercase px-3 py-1 rounded-full bg-[#d4a843] text-black">
                    Recomendado
                  </span>
                )}

                <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-xs text-zinc-500 mb-4">{plan.professionals}</p>

                <div className="mb-1">
                  <span className="text-3xl font-bold text-white">
                    R$ {price.toFixed(2).replace(".", ",")}
                  </span>
                  <span className="text-sm text-zinc-500">/mês</span>
                </div>
                {cycle === "annual" && (
                  <p className="text-xs text-zinc-600 mb-1">
                    R$ {plan.annual_total.toFixed(2).replace(".", ",")} cobrados anualmente
                  </p>
                )}
                <p className="text-xs text-zinc-500 mb-6">
                  Taxa de transação: {plan.tax}
                </p>

                <button
                  onClick={handleCTAClick}
                  className={`w-full py-3 rounded-xl font-bold text-sm transition-transform duration-200 hover:scale-105 ${
                    plan.highlight
                      ? "bg-[#d4a843] hover:bg-[#c49a3a] text-black"
                      : "bg-white/10 hover:bg-white/15 text-white"
                  }`}
                >
                  {plan.highlight ? "Começar grátis" : "Escolher"}
                </button>

                <ul className="mt-6 space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-zinc-400">
                      <Check className="h-4 w-4 text-[#d4a843] mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-zinc-600 text-center mt-6">
          +R$ 14,90/mês por profissional adicional (plano Profissional)
        </p>
      </div>
    </section>
  );
});

LandingPricing.displayName = "LandingPricing";
export default LandingPricing;
