import { useState, forwardRef } from "react";
import { Check, Sparkles } from "lucide-react";
import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Profissional",
    monthly: 59.9,
    annual_monthly: 47.9,
    annual_total: 574.8,
    tax: "2,5%",
    professionals: "1 profissional incluso",
    extra: "+ R$ 14,90/extra",
    features: [
      "Agendamento online 24h",
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
    professionals: "Profissionais ilimitados",
    extra: null,
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
    <section ref={ref} id="precos" className="py-24 sm:py-32 px-5 sm:px-8">
      <div className="max-w-[900px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Preços
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
            Menos que <span className="text-[#d4a843]">2 cortes</span> por mês.
          </h2>
          <p className="text-zinc-500 text-sm">
            14 dias grátis · Cancele quando quiser
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="inline-flex rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                cycle === "monthly"
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-300 relative ${
                cycle === "annual"
                  ? "bg-white/[0.08] text-white"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Anual
              <span className="absolute -top-2.5 -right-3 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
          {plans.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.annual_monthly;
            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-6 sm:p-7 transition-all duration-500 ${
                  plan.highlight
                    ? "border-[#d4a843]/20 bg-gradient-to-b from-[#d4a843]/[0.04] to-transparent"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.15em] uppercase px-3 py-1 rounded-lg bg-[#d4a843] text-[#0a0a0a] flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </span>
                )}

                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                  <p className="text-xs text-zinc-500">{plan.professionals}</p>
                  {plan.extra && <p className="text-xs text-zinc-600">{plan.extra}</p>}
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-white">
                      R$ {price.toFixed(2).replace(".", ",")}
                    </span>
                    <span className="text-sm text-zinc-500">/mês</span>
                  </div>
                  {cycle === "annual" && (
                    <p className="text-xs text-zinc-600 mt-1">
                      R$ {plan.annual_total.toFixed(2).replace(".", ",")} /ano
                    </p>
                  )}
                  <p className="text-xs text-zinc-600 mt-0.5">
                    Taxa de transação: {plan.tax}
                  </p>
                </div>

                <button
                  onClick={handleCTAClick}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mb-6 ${
                    plan.highlight
                      ? "bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.3)]"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06]"
                  }`}
                >
                  {plan.highlight ? "Começar grátis" : "Escolher plano"}
                </button>

                <ul className="space-y-2.5">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13px] text-zinc-400">
                      <Check className="h-3.5 w-3.5 text-[#d4a843]/70 mt-0.5 shrink-0" />
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
