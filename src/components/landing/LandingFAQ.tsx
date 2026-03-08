import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

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
  return (
    <section className="py-20 px-4 sm:px-6 bg-[#0a0a0a]">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-10">
          Ficou com dúvida?
        </h2>

        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="bg-[#161616] border border-[#2a2a2a] rounded-xl px-5 data-[state=open]:border-[#d4a843]/20"
            >
              <AccordionTrigger className="text-sm font-medium text-white hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-zinc-400 pb-4 leading-relaxed">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
