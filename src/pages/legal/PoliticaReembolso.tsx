import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalP, LegalStrong, LegalWarn, LegalGreen, LegalHighlight, LegalCompanyBox, LegalTable } from "@/components/legal/LegalComponents";

export default function PoliticaReembolso() {
  return (
    <LegalPageLayout title="Política de Reembolso e Cancelamento" subtitle="Assinaturas e Pagamentos de Agendamentos" lastUpdated="08 de março de 2026">
      <LegalP>Esta política aborda dois cenários: cancelamento da assinatura do modoGESTOR (para barbeiros) e reembolso de pagamentos de agendamentos (para clientes das barbearias).</LegalP>

      <LegalSection>Parte 1 — Assinatura do modoGESTOR</LegalSection>

      <LegalSubSection>1.1. Período de Teste Gratuito</LegalSubSection>
      <LegalGreen>
        O modoGESTOR oferece <LegalStrong>14 dias de teste gratuito</LegalStrong> com acesso completo a todas as funcionalidades do plano escolhido. Durante o trial, nenhuma cobrança é realizada. Esse é o período de garantia para avaliação.
      </LegalGreen>

      <LegalSubSection>1.2. Após o Período de Teste</LegalSubSection>
      <LegalWarn>
        Após o término do trial e a efetivação da primeira cobrança, os valores pagos <LegalStrong>não são reembolsáveis</LegalStrong>. O Contratante reconhece que os 14 dias foram suficientes para avaliação completa do serviço.
      </LegalWarn>

      <LegalSubSection>1.3. Cancelamento da Assinatura</LegalSubSection>
      <LegalTable
        headers={["Situação", "O que acontece"]}
        rows={[
          ["Durante o trial", "Nenhuma cobrança. Conta encerrada imediatamente."],
          ["Após cobrança (mensal)", "Acesso até o fim do mês pago. Sem reembolso proporcional."],
          ["Após cobrança (anual)", "Acesso até o fim do ano pago. Sem reembolso proporcional."],
        ]}
      />

      <LegalSubSection>1.4. Dados Após Cancelamento</LegalSubSection>
      <LegalP>Mantidos por 90 dias para exportação. Após, dados pessoais deletados permanentemente. Dados financeiros anonimizados e mantidos por 5 anos (obrigação fiscal).</LegalP>

      <LegalSubSection>1.5. Reativação</LegalSubSection>
      <LegalP>Se o Contratante reativar dentro dos 90 dias, dados restaurados integralmente. Após, nova conta necessária.</LegalP>

      <LegalSection>Parte 2 — Pagamentos de Agendamentos</LegalSection>

      <LegalSubSection>2.1. Definido pelo Estabelecimento</LegalSubSection>
      <LegalP>Cada estabelecimento define suas regras de cancelamento e reembolso. As regras são exibidas ao cliente antes da confirmação do pagamento. O modoGESTOR não interfere nas políticas comerciais do estabelecimento.</LegalP>

      <LegalSubSection>2.2. Cenários de Reembolso</LegalSubSection>
      <LegalTable
        headers={["Cenário", "Reembolso"]}
        rows={[
          ["Cancelamento dentro do prazo mínimo", "100% do valor pago"],
          ["Cancelamento tardio", "Parcial — % definido pelo estabelecimento"],
          ["Não comparecimento (no-show)", "Parcial — % de retenção definido pelo estabelecimento"],
          ["Cancelamento pelo estabelecimento", "100% do valor pago"],
        ]}
      />

      <LegalSubSection>2.3. Prazos de Reembolso</LegalSubSection>
      <LegalP><LegalStrong>PIX:</LegalStrong> devolução imediata para a conta de origem.</LegalP>
      <LegalP><LegalStrong>Cartão de crédito:</LegalStrong> estornado na próxima fatura (1 a 2 ciclos de faturamento).</LegalP>

      <LegalSubSection>2.4. Exemplo Prático</LegalSubSection>
      <LegalHighlight>
        <LegalStrong>Exemplo:</LegalStrong> Cliente pagou R$ 100,00 online. Retenção configurada: 30%.<br /><br />
        <LegalStrong>Cancelamento com antecedência:</LegalStrong> recebe R$ 100,00 (100%).<br />
        <LegalStrong>Não comparecimento:</LegalStrong> recebe R$ 70,00 (70%). Estabelecimento retém R$ 30,00 (30%).
      </LegalHighlight>

      <LegalSubSection>2.5. Contestações</LegalSubSection>
      <LegalP>Em caso de contestação, o cliente deve contatar o estabelecimento primeiro. Se não houver resolução, pode contatar contato@modogestor.com.br. O modoGESTOR atuará como mediador, mas a decisão final cabe ao estabelecimento.</LegalP>

      <LegalSection>Contato</LegalSection>
      <LegalCompanyBox>
        <strong className="block text-[#f5f5f5] text-[13.5px] mb-0.5">MODOPAG FINTECH LTDA</strong>
        E-mail: contato@modogestor.com.br<br />
        Horário: segunda a sexta, 9h às 18h
      </LegalCompanyBox>
    </LegalPageLayout>
  );
}
