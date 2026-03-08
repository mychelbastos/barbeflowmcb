import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalP, LegalStrong, LegalTable } from "@/components/legal/LegalComponents";

export default function AcordoProcessamento() {
  return (
    <LegalPageLayout title="Acordo de Processamento de Dados (DPA)" subtitle="Anexo aos Termos de Uso — Conforme LGPD Art. 39-40" lastUpdated="08 de março de 2026">
      <LegalSection>1. Partes</LegalSection>
      <LegalP><LegalStrong>Controlador:</LegalStrong> O Contratante do modoGESTOR (estabelecimento) que determina finalidades e meios de tratamento dos dados de seus clientes.</LegalP>
      <LegalP><LegalStrong>Operador:</LegalStrong> MODOPAG FINTECH LTDA, CNPJ 58.172.447/0001-28, que trata dados em nome do Controlador via plataforma modoGESTOR.</LegalP>

      <LegalSection>2. Objeto</LegalSection>
      <LegalP>Este Acordo estabelece obrigações de proteção de dados conforme a LGPD (Lei nº 13.709/2018). É parte integrante dos Termos de Uso e aplica-se automaticamente a todos os Contratantes.</LegalP>

      <LegalSection>3. Dados Tratados</LegalSection>
      <LegalTable
        headers={["Categoria", "Exemplos", "Finalidade"]}
        rows={[
          ["Identificação", "Nome, telefone, e-mail", "Cadastro, comunicação"],
          ["Financeiros", "CPF, endereço de cobrança", "Pagamentos online"],
          ["Uso", "Histórico de agendamentos", "Gestão operacional"],
          ["Fidelidade", "Selos acumulados", "Programa de fidelidade"],
        ]}
      />

      <LegalSection>4. Obrigações do Operador (modoGESTOR)</LegalSection>
      <LegalP><LegalStrong>a)</LegalStrong> Tratar dados exclusivamente conforme instruções do Controlador, limitando-se às finalidades da plataforma.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> Implementar medidas de segurança adequadas: criptografia, RLS, rate limiting, backup automático.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> Não utilizar dados dos clientes do Controlador para finalidades próprias.</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Assegurar confidencialidade por parte de todos os colaboradores autorizados.</LegalP>
      <LegalP><LegalStrong>e)</LegalStrong> Auxiliar no atendimento a solicitações de titulares em até 15 dias úteis.</LegalP>
      <LegalP><LegalStrong>f)</LegalStrong> Notificar incidentes de segurança em até 48 horas.</LegalP>
      <LegalP><LegalStrong>g)</LegalStrong> Excluir dados em até 90 dias após término do contrato (financeiros anonimizados por 5 anos).</LegalP>

      <LegalSection>5. Suboperadores Autorizados</LegalSection>
      <LegalTable
        headers={["Suboperador", "Serviço", "Localização"]}
        rows={[
          ["Supabase (AWS)", "Banco de dados", "São Paulo, BR"],
          ["Mercado Pago", "Pagamentos", "Argentina/BR"],
          ["Stripe", "Cobrança SaaS", "EUA"],
          ["Cloudflare", "Segurança", "Global"],
          ["Evolution API", "WhatsApp", "Brasil"],
        ]}
      />
      <LegalP>Novos suboperadores serão notificados com 15 dias para objeção. A ausência de objeção será considerada autorização.</LegalP>

      <LegalSection>6. Obrigações do Controlador</LegalSection>
      <LegalP><LegalStrong>a)</LegalStrong> Obter consentimento dos clientes para coleta e tratamento de dados.</LegalP>
      <LegalP><LegalStrong>b)</LegalStrong> Informar clientes sobre como seus dados serão tratados.</LegalP>
      <LegalP><LegalStrong>c)</LegalStrong> Manter dados precisos e atualizados.</LegalP>
      <LegalP><LegalStrong>d)</LegalStrong> Responder solicitações de titulares utilizando as ferramentas da plataforma.</LegalP>

      <LegalSection>7. Término e Dados</LegalSection>
      <LegalP>Ao término do contrato: acesso mantido até o final do período pago; 90 dias para exportação; dados pessoais deletados após esse prazo; dados financeiros anonimizados por 5 anos (fiscal).</LegalP>

      <LegalSection>8. Vigência</LegalSection>
      <LegalP>Este Acordo entra em vigor na data de aceitação dos Termos de Uso e permanece vigente enquanto houver tratamento de dados. Obrigações de confidencialidade sobrevivem ao término.</LegalP>

      <LegalSection>9. Foro</LegalSection>
      <LegalP>Comarca de Feira de Santana – BA, conforme Termos de Uso.</LegalP>
    </LegalPageLayout>
  );
}
