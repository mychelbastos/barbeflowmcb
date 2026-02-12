import logoBranca from "@/assets/modoGESTOR_branca.png";
import { getDashboardUrl, getPublicUrl } from "@/lib/hostname";
import { ArrowLeft } from "lucide-react";

export default function Terms() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <a href={getPublicUrl('/')} className="flex items-center gap-2">
            <img src={logoBranca} alt="modoGESTOR" className="h-6" />
          </a>
          <a href={getPublicUrl('/')} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </a>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: 12 de fevereiro de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Descrição do Serviço</h2>
            <p>O modoGESTOR é uma plataforma SaaS de gestão para profissionais de serviços (barbearias, salões, estúdios de estética e similares). Oferecemos agendamento online, gestão financeira, pagamentos integrados, notificações automáticas e demais funcionalidades descritas no site.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Planos e Preços</h2>
            <p>O modoGESTOR oferece planos mensais e anuais com preços publicados no site. Reservamo-nos o direito de alterar os preços com aviso prévio de 30 dias. Alterações não afetam o período já contratado.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Trial Gratuito</h2>
            <p>Novos clientes recebem 14 dias de trial gratuito com acesso a todos os recursos do plano escolhido. É necessário cadastrar um método de pagamento. Se o trial não for cancelado antes do término, a cobrança é feita automaticamente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Cancelamento</h2>
            <p>O cancelamento pode ser feito a qualquer momento pelo painel do cliente. Após o cancelamento, o acesso é mantido até o fim do período já pago. Não há reembolso proporcional. Cancelamentos durante o trial não geram cobrança.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Taxa sobre Transações</h2>
            <p>O modoGESTOR cobra uma taxa percentual sobre transações processadas pela plataforma (pagamentos de clientes finais via Mercado Pago). A taxa varia conforme o plano: 2,5% no Essencial e 1,0% no Profissional. O valor integral é repassado ao estabelecimento; a taxa é cobrada na fatura mensal.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Responsabilidade sobre Dados</h2>
            <p>O titular da conta (tenant) é o controlador dos dados de seus clientes. O modoGESTOR atua como operador, processando dados exclusivamente para a prestação do serviço conforme a LGPD.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Propriedade dos Dados</h2>
            <p>Os dados inseridos pelo tenant pertencem ao tenant. Em caso de cancelamento, os dados ficam disponíveis por 90 dias para reativação ou exportação. Após esse período, são excluídos permanentemente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Disponibilidade</h2>
            <p>O modoGESTOR se compromete com o melhor esforço para manter o serviço disponível. Não oferecemos SLA formal de uptime neste momento. Manutenções programadas serão comunicadas com antecedência.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">9. Contato</h2>
            <p>Para dúvidas sobre estes termos, entre em contato pelo e-mail: <a href="mailto:contato@barberflow.store" className="text-primary hover:underline">contato@barberflow.store</a></p>
          </section>
        </div>
      </main>

      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-3xl mx-auto text-center text-xs text-muted-foreground">
          © 2026 modoGESTOR. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
