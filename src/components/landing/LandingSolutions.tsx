import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import mobileMockup from "@/assets/mobile-mockup.png";
import dashboardMockup from "@/assets/dashboard-mockup.png";
import appMockup from "@/assets/app-mockup.jpg";
import { Calendar, CreditCard, Shield, Smartphone, TrendingUp, Trophy } from "lucide-react";

const features = [
  {
    icon: Calendar,
    tag: "Agendamento",
    title: "Seus clientes agendam sozinhos, 24h por dia.",
    desc: "Link de agendamento público. Sem WhatsApp, sem ligação, sem confusão. Funciona no celular, sem instalar nada.",
    image: mobileMockup,
    imageAlt: "Tela de agendamento online do modoGESTOR",
  },
  {
    icon: TrendingUp,
    tag: "Financeiro",
    title: "Saiba exatamente quanto cada barbeiro fatura.",
    desc: "Caixa diário, comissões automáticas, relatórios por profissional. No fim do mês, a conta fecha sozinha.",
    image: dashboardMockup,
    imageAlt: "Dashboard financeiro do modoGESTOR",
  },
  {
    icon: Shield,
    tag: "Proteção",
    title: "Cliente faltou? Você não perde mais dinheiro.",
    desc: "Proteção anti-falta retém uma parte automaticamente. Desconto inteligente incentiva o pagamento antecipado.",
    image: appMockup,
    imageAlt: "Sistema de proteção anti-falta do modoGESTOR",
  },
];

const miniFeatures = [
  { icon: CreditCard, title: "Pagamento antecipado", desc: "Via Mercado Pago, direto na sua conta." },
  { icon: Smartphone, title: "WhatsApp automático", desc: "Confirmação, lembrete e cancelamento." },
  { icon: Trophy, title: "Fidelidade digital", desc: "Cartão de selos que faz o cliente voltar." },
];

export default function LandingSolutions() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8 relative" ref={ref} id="solucoes">
      {/* Background accent */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#d4a843]/[0.01] to-transparent pointer-events-none" />

      <div className="max-w-[1100px] mx-auto relative">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            A solução
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight max-w-xl mx-auto">
            Tudo que sua barbearia precisa. Num único lugar.
          </h2>
        </motion.div>

        {/* Feature Showcases - alternating layout */}
        <div className="space-y-20 sm:space-y-32">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            const isReversed = i % 2 === 1;
            return (
              <FeatureShowcase
                key={feature.tag}
                index={i}
                icon={<Icon className="h-4 w-4" />}
                tag={feature.tag}
                title={feature.title}
                desc={feature.desc}
                image={feature.image}
                imageAlt={feature.imageAlt}
                reversed={isReversed}
                inView={inView}
              />
            );
          })}
        </div>

        {/* Mini features grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid sm:grid-cols-3 gap-3 sm:gap-4 mt-20 sm:mt-28"
        >
          {miniFeatures.map((f, i) => {
            const Icon = f.icon;
            return (
              <div
                key={f.title}
                className="group rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 hover:border-[#d4a843]/20 transition-all duration-500 hover:bg-white/[0.03]"
              >
                <div className="w-9 h-9 rounded-lg bg-[#d4a843]/[0.08] border border-[#d4a843]/[0.12] flex items-center justify-center mb-4 text-[#d4a843]">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1.5">{f.title}</h3>
                <p className="text-[13px] text-zinc-500 leading-relaxed">{f.desc}</p>
              </div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}

function FeatureShowcase({
  index,
  icon,
  tag,
  title,
  desc,
  image,
  imageAlt,
  reversed,
  inView,
}: {
  index: number;
  icon: React.ReactNode;
  tag: string;
  title: string;
  desc: string;
  image: string;
  imageAlt: string;
  reversed: boolean;
  inView: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: 0.15 + index * 0.12 }}
      className={`flex flex-col ${reversed ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-10 lg:gap-16`}
    >
      {/* Text */}
      <div className="flex-1 max-w-md lg:max-w-none">
        <div className="inline-flex items-center gap-2 text-[#d4a843] text-xs font-semibold tracking-[0.15em] uppercase mb-4 px-3 py-1.5 rounded-full bg-[#d4a843]/[0.06] border border-[#d4a843]/[0.1]">
          {icon}
          {tag}
        </div>
        <h3 className="text-xl sm:text-2xl lg:text-[1.75rem] font-bold text-white leading-tight mb-4">
          {title}
        </h3>
        <p className="text-sm sm:text-base text-zinc-400 leading-relaxed max-w-md">
          {desc}
        </p>
      </div>

      {/* Image */}
      <div className="flex-1 w-full max-w-md lg:max-w-none">
        <div className="relative group">
          {/* Glow */}
          <div className="absolute -inset-4 bg-[#d4a843]/[0.03] rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative rounded-2xl border border-white/[0.06] shadow-[0_16px_48px_-12px_rgba(0,0,0,0.6)] overflow-hidden bg-[#0c0c0c]">
            <img
              src={image}
              alt={imageAlt}
              className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.02]"
              loading="lazy"
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
