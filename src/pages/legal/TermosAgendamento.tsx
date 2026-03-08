import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalP, LegalStrong, LegalWarn, LegalCompanyBox } from "@/components/legal/LegalComponents";

export default function TermosAgendamento() {
  return (
    <LegalPageLayout title="Termos do Agendamento Online" subtitle="Para clientes que utilizam a plataforma para agendar serviços" lastUpdated="08 de março de 2026">
      <LegalSection>1. Sobre a Plataforma</LegalSection>
      <LegalP>O agendamento online é disponibilizado pelo estabelecimento por meio da plataforma modoGESTOR, operada pela MODOPAG FINTECH LTDA (CNPJ 58.172.447/0001-28). O modoGESTOR atua como prestadora de serviços tecnológicos, não sendo parte na relação de consumo entre você e o estabelecimento.</LegalP>
      <LegalP>Ao realizar um agendamento, você declara que leu e concorda com estes Termos.</LegalP>

      <LegalSection>2. Dados Pessoais</LegalSection>
      <LegalP>Para realizar o agendamento, coletamos em nome do estabelecimento: nome completo, telefone (WhatsApp), e-mail (quando informado), CPF e endereço de cobrança (apenas para pagamento com cartão). O estabelecimento é o Controlador dos seus dados. Para mais informações, consulte nossa Política de Privacidade.</LegalP>

      <LegalSection>3. Comunicação via WhatsApp</LegalSection>
      <LegalP>Ao informar seu número e confirmar o agendamento, você autoriza o recebimento de mensagens via WhatsApp relacionadas ao seu atendimento: confirmação, lembrete e notificação de cancelamento. Essas mensagens são transacionais e não constituem marketing.</LegalP>

      <LegalSection>4. Pagamento Online</LegalSection>
      <LegalP>Quando disponível, o estabelecimento pode oferecer pagamento antecipado online com desconto. Os pagamentos são processados pelo Mercado Pago (PCI DSS). O modoGESTOR não armazena dados do seu cartão de crédito.</LegalP>

      <LegalSection>5. Cancelamento e Não Comparecimento</LegalSection>
      <LegalWarn>
        As políticas de cancelamento e reembolso são definidas por cada estabelecimento e exibidas antes da confirmação do pagamento.
      </LegalWarn>
      <LegalP><LegalStrong>Cancelamento pelo cliente:</LegalStrong> Dentro do prazo definido pelo estabelecimento, o reembolso é integral.</LegalP>
      <LegalP><LegalStrong>Cancelamento tardio ou não comparecimento:</LegalStrong> Um percentual do valor pode ser retido pelo estabelecimento. O restante é reembolsado automaticamente (PIX: imediato; cartão: próxima fatura).</LegalP>

      <LegalSection>6. Programa de Fidelidade</LegalSection>
      <LegalP>Se ativo, cada agendamento pode gerar um selo de fidelidade. Ao completar o cartão, você tem direito a uma recompensa definida pelo estabelecimento.</LegalP>

      <LegalSection>7. Seus Direitos (LGPD)</LegalSection>
      <LegalP>Você tem direito a acessar, corrigir, excluir e portar seus dados pessoais. Entre em contato com o estabelecimento ou envie e-mail para contato@modogestor.com.br.</LegalP>

      <LegalSection>8. Contato</LegalSection>
      <LegalCompanyBox>
        <strong className="block text-[#f5f5f5] text-[13.5px] mb-0.5">MODOPAG FINTECH LTDA</strong>
        E-mail: contato@modogestor.com.br<br />
        Av. Maria Quitéria, 645, Sala 02, Feira de Santana – BA
      </LegalCompanyBox>
    </LegalPageLayout>
  );
}
