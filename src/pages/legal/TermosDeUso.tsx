import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalP, LegalStrong, LegalWarn, LegalCompanyBox, LegalTable } from "@/components/legal/LegalComponents";

export default function TermosDeUso() {
  return (
    <LegalPageLayout title="Termos de Uso" subtitle="Plataforma de Gestão para Barbearias e Salões" lastUpdated="08 de março de 2026">
      <LegalCompanyBox>
        <strong className="block text-[#f5f5f5] text-[13.5px] mb-0.5">MODOPAG FINTECH LTDA</strong>
        CNPJ: 58.172.447/0001-28<br />
        Endereço: Avenida Maria Quitéria, 645, Sala 02, Bairro Brasília, CEP 44088-000, Feira de Santana – BA<br />
        E-mail: contato@modogestor.com.br
      </LegalCompanyBox>

      <LegalSection>1. Definições</LegalSection>
      <LegalP><LegalStrong>"modoGESTOR"</LegalStrong> refere-se à plataforma de gestão SaaS (Software como Serviço) desenvolvida e operada pela MODOPAG FINTECH LTDA, acessível por meio do endereço modogestor.com.br e aplicativos relacionados.</LegalP>
      <LegalP><LegalStrong>"Contratante"</LegalStrong> refere-se à pessoa física ou jurídica que contrata os serviços do modoGESTOR para gerenciar seu estabelecimento.</LegalP>
      <LegalP><LegalStrong>"Cliente Final"</LegalStrong> refere-se ao consumidor que utiliza a plataforma para realizar agendamentos nos estabelecimentos cadastrados.</LegalP>

      <LegalSection>2. Objeto</LegalSection>
      <LegalP>O modoGESTOR é uma plataforma de gestão para barbearias, salões e estabelecimentos de serviços de beleza que oferece funcionalidades de agendamento online, gestão financeira, comanda digital, comunicação com clientes via WhatsApp, processamento de pagamentos online, programas de fidelidade e relatórios de desempenho.</LegalP>
      <LegalP>Estes Termos regulam a relação entre a MODOPAG FINTECH LTDA e o Contratante. Ao criar uma conta no modoGESTOR, o Contratante declara que leu, compreendeu e concorda integralmente com estes Termos.</LegalP>

      <LegalSection>3. Planos e Preços</LegalSection>
      <LegalTable
        headers={["Plano", "Mensal", "Anual (2 meses grátis)", "Taxa", "Profissionais"]}
        rows={[
          ["Profissional", "R$ 59,90/mês", "R$ 47,90/mês (R$ 574,80/ano)", "2,5%", "1 incluso + R$ 14,90/extra"],
          ["Ilimitado", "R$ 109,90/mês", "R$ 87,90/mês (R$ 1.054,80/ano)", "1,5%", "Ilimitados"],
        ]}
      />
      <LegalP><LegalStrong>Add-ons disponíveis:</LegalStrong></LegalP>
      <LegalTable
        headers={["Add-on", "Valor", "Disponibilidade"]}
        rows={[
          ["Profissional adicional", "R$ 14,90/mês", "Plano Profissional"],
          ["Cartão Fidelidade Digital", "R$ 19,90/mês", "Plano Profissional (incluso no Ilimitado)"],
        ]}
      />
      <LegalP>Os valores podem ser alterados mediante aviso prévio de 30 (trinta) dias ao Contratante. A taxa de transação incide sobre o valor integral de cada pagamento online realizado por Clientes Finais e é cobrada automaticamente pelo Mercado Pago no modelo marketplace.</LegalP>

      <LegalSection>4. Período de Teste Gratuito</LegalSection>
      <LegalP>O modoGESTOR oferece um período de teste gratuito de <LegalStrong>14 (quatorze) dias</LegalStrong> corridos a partir da criação da conta. Durante o período de teste, o Contratante terá acesso a todas as funcionalidades do plano selecionado sem cobrança.</LegalP>
      <LegalP>Para iniciar o período de teste, o Contratante deverá cadastrar um meio de pagamento válido (cartão de crédito). Ao término dos 14 dias, a cobrança será realizada automaticamente caso o Contratante não cancele antes do vencimento.</LegalP>
      <LegalWarn>
        O período de teste gratuito de 14 dias é a garantia oferecida pelo modoGESTOR para que o Contratante avalie a plataforma sem custos. Após o término do trial e a efetivação da primeira cobrança, o valor pago não será reembolsável. O Contratante reconhece que teve tempo suficiente para avaliar o serviço durante o período de teste.
      </LegalWarn>

      <LegalSection>5. Pagamento e Cobrança</LegalSection>
      <LegalP>A cobrança da assinatura é realizada automaticamente na data de aniversário da contratação, via cartão de crédito cadastrado, por meio da plataforma Stripe. O Contratante é responsável por manter seus dados de pagamento atualizados.</LegalP>
      <LegalP>Em caso de falha no pagamento, o modoGESTOR poderá restringir o acesso à plataforma após 3 (três) tentativas sem sucesso, respeitando o período de carência de 7 (sete) dias após o vencimento.</LegalP>

      <LegalSection>6. Cancelamento</LegalSection>
      <LegalP>O Contratante pode cancelar sua assinatura a qualquer momento pelo painel administrativo, sem multa ou penalidade.</LegalP>
      <LegalP><LegalStrong>a)</LegalStrong> O acesso será mantido até o final do período já pago.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> Os dados serão mantidos por 90 (noventa) dias após o término do acesso para exportação.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> Após os 90 dias, dados pessoais serão permanentemente deletados. Dados financeiros serão anonimizados e mantidos por 5 anos para fins fiscais.</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Valores já cobrados não são reembolsáveis após a efetivação do pagamento.</LegalP>

      <LegalSection>7. Obrigações do modoGESTOR</LegalSection>
      <LegalP><LegalStrong>a)</LegalStrong> Disponibilizar a plataforma com disponibilidade alvo de 99,5% ao mês, excluindo manutenções programadas e eventos de força maior.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> Realizar atualizações e melhorias contínuas sem custo adicional.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> Fornecer suporte técnico em horário comercial (segunda a sexta, 9h às 18h) via e-mail e WhatsApp.</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Proteger os dados armazenados com medidas técnicas e organizacionais adequadas conforme a LGPD.</LegalP>
      <LegalP><LegalStrong>e)</LegalStrong> Permitir a exportação dos dados durante a vigência e por 90 dias após o cancelamento.</LegalP>

      <LegalSection>8. Obrigações do Contratante</LegalSection>
      <LegalP><LegalStrong>a)</LegalStrong> Fornecer informações verdadeiras e atualizadas no cadastro.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> Manter a confidencialidade de suas credenciais de acesso.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> Utilizar a plataforma de forma lícita e conforme estes Termos.</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Obter o consentimento necessário de seus Clientes Finais para coleta e tratamento de dados pessoais, nos termos da LGPD.</LegalP>
      <LegalP><LegalStrong>e)</LegalStrong> Não utilizar a plataforma para atividades ilegais, fraudulentas ou que violem direitos de terceiros.</LegalP>
      <LegalP><LegalStrong>f)</LegalStrong> Configurar corretamente as políticas de cancelamento e reembolso para seus Clientes Finais.</LegalP>

      <LegalSection>9. Pagamentos Online e Intermediação</LegalSection>
      <LegalP>O modoGESTOR utiliza o Mercado Pago como plataforma de pagamentos no modelo marketplace.</LegalP>
      <LegalP><LegalStrong>a)</LegalStrong> O Contratante deverá conectar sua própria conta do Mercado Pago à plataforma.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> A taxa de transação é cobrada automaticamente sobre cada pagamento processado.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> O modoGESTOR não armazena dados de cartão de crédito. Todo o processamento é realizado pelo Mercado Pago (PCI DSS).</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Eventuais contestações (chargebacks) são de responsabilidade do Contratante junto ao Mercado Pago.</LegalP>
      <LegalP><LegalStrong>e)</LegalStrong> Em caso de não comparecimento (no-show), o reembolso parcial será processado conforme o percentual configurado pelo Contratante.</LegalP>

      <LegalSection>10. Propriedade Intelectual</LegalSection>
      <LegalP>Todos os direitos de propriedade intelectual sobre a plataforma pertencem exclusivamente à MODOPAG FINTECH LTDA. Os dados inseridos pelo Contratante permanecem de sua propriedade, sendo o modoGESTOR mero custodiante durante a vigência.</LegalP>

      <LegalSection>11. Limitação de Responsabilidade</LegalSection>
      <LegalP>A responsabilidade total do modoGESTOR fica limitada ao valor equivalente às <LegalStrong>últimas 3 (três) mensalidades</LegalStrong> efetivamente pagas pelo Contratante.</LegalP>
      <LegalP>O modoGESTOR não se responsabiliza por danos indiretos, lucros cessantes, indisponibilidade causada por terceiros (Mercado Pago, Stripe, WhatsApp), uso indevido da plataforma, ou conflitos entre o Contratante e seus Clientes Finais.</LegalP>

      <LegalSection>12. Suspensão e Rescisão</LegalSection>
      <LegalP>O modoGESTOR poderá suspender ou encerrar a conta em caso de inadimplência superior a 30 dias, uso ilícito ou fraudulento, violação destes Termos, ou tentativa de acesso não autorizado. O Contratante será notificado com prazo de 5 dias úteis para regularização, exceto em casos de fraude.</LegalP>

      <LegalSection>13. Alterações nos Termos</LegalSection>
      <LegalP>O modoGESTOR reserva-se o direito de alterar estes Termos mediante notificação prévia de 30 dias. A continuidade do uso após esse período será considerada como aceite.</LegalP>

      <LegalSection>14. Foro e Legislação Aplicável</LegalSection>
      <LegalP>Estes Termos são regidos pela legislação brasileira. Para dirimir controvérsias, fica eleito exclusivamente o Foro da Comarca de Feira de Santana – BA, com renúncia expressa a qualquer outro foro.</LegalP>

      <LegalSection>15. Disposições Finais</LegalSection>
      <LegalP>Ao clicar em "Aceitar" ou "Criar Conta", o Contratante manifesta seu aceite integral a todos os termos e condições aqui estabelecidos.</LegalP>
    </LegalPageLayout>
  );
}
