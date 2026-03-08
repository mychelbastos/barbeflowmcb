import { useState, forwardRef } from "react";
import { Check, Sparkles, Star } from "lucide-react";
import { getDashboardUrl } from "@/lib/hostname";
import { trackViewContent } from "@/lib/tracking";
import { motion, AnimatePresence } from "framer-motion";

interface Feature {
  text: string;
  note?: string;
  exclusive?: boolean;
}

const essencialFeatures: Feature[] = [
  { text: "1 profissional incluso", note: "+R$ 14,90/extra" },
  { text: "Agendamento online 24h" },
  { text: "Gestão de clientes" },
  { text: "Financeiro completo" },
  { text: "Notificações automáticas (WhatsApp e e-mail)" },
  { text: "Página pública de agendamento" },
  { text: "Pacotes e assinaturas" },
  { text: "Pagamentos online (Mercado Pago)" },
  { text: "Relatórios" },
  { text: "Vitrine de produtos (venda durante o atendimento)" },
  { text: "Proteção contra cancelamentos" },
  { text: "Desconto inteligente" },
  { text: "Agendamento via WhatsApp (chatbot)" },
];

const profissionalBaseFeatures: Feature[] = [
  { text: "Agendamento online 24h" },
  { text: "Gestão de clientes" },
  { text: "Financeiro completo" },
  { text: "Notificações automáticas (WhatsApp e e-mail)" },
  { text: "Página pública de agendamento" },
  { text: "Pacotes e assinaturas" },
  { text: "Pagamentos online (Mercado Pago)" },
  { text: "Relatórios" },
  { text: "Vitrine de produtos (venda durante o atendimento)" },
  { text: "Proteção contra cancelamentos" },
  { text: "Desconto inteligente" },
  { text: "Agendamento via WhatsApp (chatbot)" },
];

const profissionalExclusiveFeatures: Feature[] = [
  { text: "Profissionais ilimitados", exclusive: true },
  { text: "IA de imagem (Foto Profissional)", exclusive: true },
  { text: "IA de texto (Texto que Vende)", exclusive: true },
  { text: "Sugestão de produtos no agendamento (order bump)", exclusive: true },
  { text: "Cartão Fidelidade Digital incluso", exclusive: true },
  { text: "Taxa de transação reduzida: 1,5% (vs 2,5%)", exclusive: true },
];

const plans = [
  {
    name: "Profissional",
    monthly: 59.9,
    annual_monthly: 47.9,
    annual_total: 574.8,
    tax: "2,5%",
    features: essencialFeatures,
    exclusiveFeatures: [] as Feature[],
    highlight: false,
  },
  {
    name: "Ilimitado",
    monthly: 109.9,
    annual_monthly: 87.9,
    annual_total: 1054.8,
    tax: "1,5%",
    features: profissionalBaseFeatures,
    exclusiveFeatures: profissionalExclusiveFeatures,
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
      <div className="max-w-[960px] mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            Preços
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight mb-3">
            Invista menos do que o preço de{" "}
            <span className="text-[#d4a843]">2 cortes</span> por mês.
          </h2>
          <p className="text-zinc-500 text-sm">
            14 dias grátis · Cancele quando quiser
          </p>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-center mb-12">
          <div className="inline-flex rounded-full border border-white/[0.08] bg-white/[0.03] p-1">
            <button
              onClick={() => setCycle("monthly")}
              className={`px-6 py-2.5 rounded-full text-sm font-medium transition-all duration-300 ${
                cycle === "monthly"
                  ? "bg-white/[0.1] text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Mensal
            </button>
            <button
              onClick={() => setCycle("annual")}
              className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 relative ${
                cycle === "annual"
                  ? "bg-[#d4a843] text-[#0a0a0a] shadow-[0_2px_12px_-2px_rgba(212,168,67,0.4)]"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Anual
              <span className="absolute -top-3 -right-3 text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                −17%
              </span>
            </button>
          </div>
        </div>

        {/* Cards */}
        <div className="grid sm:grid-cols-2 gap-5 items-start">
          {plans.map((plan) => {
            const price = cycle === "monthly" ? plan.monthly : plan.annual_monthly;
            const oldPrice = cycle === "annual" ? plan.monthly : null;

            return (
              <div
                key={plan.name}
                className={`relative rounded-2xl border p-7 sm:p-8 transition-all duration-500 ${
                  plan.highlight
                    ? "border-[#d4a843]/20 bg-gradient-to-b from-[#d4a843]/[0.04] to-transparent"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold tracking-[0.15em] uppercase px-4 py-1 rounded-full bg-[#d4a843] text-[#0a0a0a] flex items-center gap-1 whitespace-nowrap">
                    <Sparkles className="h-3 w-3" />
                    Recomendado
                  </span>
                )}

                {/* Plan name */}
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-white mb-1">{plan.name}</h3>
                </div>

                {/* Price */}
                <div className="mb-6">
                  <div className="flex items-baseline gap-2">
                    {oldPrice && (
                      <span className="text-lg text-zinc-600 line-through">
                        R$ {oldPrice.toFixed(2).replace(".", ",")}
                      </span>
                    )}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={cycle}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.25 }}
                      className="flex items-baseline gap-1"
                    >
                      <span className="text-4xl font-extrabold text-white">
                        R$ {price.toFixed(2).replace(".", ",")}
                      </span>
                      <span className="text-sm text-zinc-500 font-normal">/mês</span>
                    </motion.div>
                  </AnimatePresence>
                  {cycle === "annual" && (
                    <p className="text-xs text-zinc-600 mt-1">
                      R$ {plan.annual_total.toFixed(2).replace(".", ",")} /ano
                    </p>
                  )}
                </div>

                {/* CTA */}
                <button
                  onClick={handleCTAClick}
                  className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 mb-6 ${
                    plan.highlight
                      ? "bg-[#d4a843] hover:bg-[#c49a3a] text-[#0a0a0a] hover:shadow-[0_8px_30px_-4px_rgba(212,168,67,0.3)]"
                      : "bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.06]"
                  }`}
                >
                  {plan.highlight ? "Começar grátis" : "Escolher"}
                </button>

                {/* Base features */}
                <ul className="space-y-1">
                  {plan.features.map((f) => (
                    <li key={f.text}>
                      <div className="flex items-start gap-3 py-1.5">
                        <Check className="w-4 h-4 text-[#d4a843] mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-zinc-300">{f.text}</span>
                      </div>
                      {f.note && (
                        <p className="text-xs text-zinc-600 ml-7">{f.note}</p>
                      )}
                    </li>
                  ))}
                </ul>

                {/* Exclusive separator + features */}
                {plan.exclusiveFeatures.length > 0 && (
                  <>
                    <div className="flex items-center gap-3 my-5">
                      <div className="h-px flex-1 bg-[#d4a843]/20" />
                      <span className="text-[10px] text-[#d4a843] font-bold tracking-widest uppercase whitespace-nowrap">
                        Exclusivo do Profissional
                      </span>
                      <div className="h-px flex-1 bg-[#d4a843]/20" />
                    </div>
                    <ul className="space-y-1">
                      {plan.exclusiveFeatures.map((f) => (
                        <li key={f.text} className="flex items-start gap-3 py-1.5">
                          <Star className="w-4 h-4 text-[#d4a843] mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-white font-medium">{f.text}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}

                {/* Tax note */}
                <p className="text-[10px] text-zinc-700 mt-5">
                  Taxa de {plan.tax} sobre pagamentos online
                </p>
              </div>
            );
          })}
        </div>

        {/* Footer notes */}
        <div className="text-center mt-8 space-y-2">
          <p className="text-sm text-zinc-500">
            +R$ 14,90/mês por profissional adicional no plano Essencial
          </p>
          <p className="text-xs text-zinc-600">
            Após 14 dias, a cobrança é automática. Cancele quando quiser pelo painel.
          </p>

          <div className="mt-6 max-w-xl mx-auto text-left bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
            <p className="text-xs text-zinc-400 leading-relaxed">
              <span className="text-zinc-300 font-medium">Sobre as taxas de transação:</span>{" "}
              A taxa do modoGESTOR (2,5% ou 1,5%) é cobrada apenas sobre pagamentos online
              processados pela plataforma e serve para manter o sistema funcionando. As taxas do
              gateway de pagamento (Mercado Pago) são cobradas separadamente, de acordo com os
              termos do seu contrato com o Mercado Pago. O modoGESTOR não interfere nas taxas do
              seu banco ou gateway.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
});

LandingPricing.displayName = "LandingPricing";
export default LandingPricing;
