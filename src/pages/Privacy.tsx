import logoBranca from "@/assets/modoGESTOR_branca.png";
import { getDashboardUrl, getPublicUrl } from "@/lib/hostname";
import { ArrowLeft } from "lucide-react";

export default function Privacy() {
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
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-muted-foreground text-sm mb-10">Última atualização: 12 de fevereiro de 2026</p>

        <div className="prose prose-invert prose-sm max-w-none space-y-6 text-zinc-300 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground">1. Dados Coletados</h2>
            <p>Coletamos os seguintes dados pessoais: nome completo, endereço de e-mail, número de telefone e dados de pagamento (processados pelo Stripe, não armazenamos dados de cartão).</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">2. Finalidade</h2>
            <p>Os dados são utilizados exclusivamente para: prestação do serviço contratado, processamento de cobranças, envio de comunicações transacionais (confirmações, lembretes, notificações) e melhoria do serviço.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">3. Base Legal (LGPD)</h2>
            <p>O tratamento dos dados é baseado na execução de contrato (Art. 7°, V da LGPD) e no consentimento do titular quando aplicável.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">4. Compartilhamento</h2>
            <p>Compartilhamos dados apenas com os seguintes parceiros, estritamente para prestação do serviço:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li><strong>Stripe</strong> — processamento de pagamentos de assinaturas</li>
              <li><strong>Mercado Pago</strong> — processamento de pagamentos de clientes finais</li>
              <li><strong>Supabase</strong> — infraestrutura e armazenamento de dados</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">5. Retenção</h2>
            <p>Os dados são mantidos enquanto a conta estiver ativa. Após o cancelamento, os dados são mantidos por 90 dias para possível reativação. Após esse período, são excluídos permanentemente.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">6. Direitos do Titular</h2>
            <p>Conforme a LGPD, você tem direito a:</p>
            <ul className="list-disc pl-5 space-y-1 mt-2">
              <li>Acesso aos seus dados pessoais</li>
              <li>Correção de dados incompletos ou desatualizados</li>
              <li>Exclusão dos dados (anonimização)</li>
              <li>Portabilidade dos dados</li>
              <li>Revogação do consentimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">7. Segurança</h2>
            <p>Utilizamos criptografia em trânsito (TLS/SSL), armazenamento seguro com Row Level Security, autenticação robusta e backups automáticos para proteger seus dados.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground">8. Contato do Responsável</h2>
            <p>Para exercer seus direitos ou esclarecer dúvidas sobre esta política, entre em contato: <a href="mailto:privacidade@barberflow.store" className="text-primary hover:underline">privacidade@barberflow.store</a></p>
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
