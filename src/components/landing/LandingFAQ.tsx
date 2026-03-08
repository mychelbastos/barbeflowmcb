import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { motion } from "framer-motion";
import { useRef } from "react";
import { useInView } from "framer-motion";

const faqs = [
  { q: "Preciso pagar para testar?", a: "Não. Os 14 dias de teste são 100% gratuitos. Você só começa a pagar se decidir continuar após o trial." },
  { q: "Meus clientes precisam baixar algum app?", a: "Não. Eles agendam pelo link no celular, sem instalar nada." },
  { q: "Funciona com Mercado Pago?", a: "Sim. Você conecta sua conta do Mercado Pago e recebe os pagamentos direto nela." },
  { q: "E se o cliente não aparecer?", a: "Com a Proteção Anti-Falta, você retém automaticamente uma parte do valor pago online. O resto é devolvido ao cliente." },
  { q: "Posso cancelar quando quiser?", a: "Sim, sem multa e sem burocracia. Direto pelo painel. Você mantém acesso até o fim do período pago." },
  { q: "Quantos barbeiros posso cadastrar?", a: "No Profissional, 1 incluso (extras por R$ 14,90/mês). No Ilimitado, sem limite." },
  { q: "Tem contrato de fidelidade?", a: "Não. Plano mensal ou anual, sem fidelidade obrigatória." },
  { q: "Como funciona o suporte?", a: "WhatsApp e e-mail, de segunda a sexta, 9h às 18h." },
];

export default function LandingFAQ() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <section className="py-24 sm:py-32 px-5 sm:px-8" ref={ref}>
      <div className="max-w-[640px] mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-[#d4a843] text-xs font-semibold tracking-[0.2em] uppercase mb-4 block">
            FAQ
          </span>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight">
            Ficou com dúvida?
          </h2>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 data-[state=open]:border-[#d4a843]/15 transition-colors duration-300"
              >
                <AccordionTrigger className="text-sm font-medium text-white hover:no-underline py-4 text-left">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-zinc-500 pb-4 leading-relaxed">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
}
