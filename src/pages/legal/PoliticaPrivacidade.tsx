import LegalPageLayout from "@/components/legal/LegalPageLayout";
import { LegalSection, LegalSubSection, LegalP, LegalStrong, LegalHighlight, LegalCompanyBox, LegalTable } from "@/components/legal/LegalComponents";

export default function PoliticaPrivacidade() {
  return (
    <LegalPageLayout title="Política de Privacidade" subtitle="Proteção de Dados e Privacidade" lastUpdated="08 de março de 2026">
      <LegalCompanyBox>
        <strong className="block text-[#f5f5f5] text-[13.5px] mb-0.5">Controlador dos dados dos Contratantes:</strong>
        MODOPAG FINTECH LTDA — CNPJ: 58.172.447/0001-28<br />
        Av. Maria Quitéria, 645, Sala 02, Brasília, CEP 44088-000, Feira de Santana – BA<br />
        Encarregado de Proteção de Dados (DPO): contato@modogestor.com.br
      </LegalCompanyBox>

      <LegalSection>1. Introdução</LegalSection>
      <LegalP>A MODOPAG FINTECH LTDA ("modoGESTOR") reconhece e valoriza a privacidade dos seus usuários. Esta Política explica como seus dados pessoais são coletados, utilizados, armazenados, compartilhados e protegidos, em conformidade com a LGPD (Lei nº 13.709/2018) e o Marco Civil da Internet (Lei nº 12.965/2014).</LegalP>

      <LegalSection>2. Papéis e Responsabilidades (LGPD)</LegalSection>
      <LegalTable
        headers={["Papel", "Relação", "Dados"]}
        rows={[
          ["Controlador", "modoGESTOR → Contratante", "Dados do barbeiro: nome, email, CPF/CNPJ, pagamento"],
          ["Operador", "Contratante → modoGESTOR → Cliente Final", "Dados dos clientes: nome, telefone, CPF, agendamentos"],
        ]}
      />

      <LegalSection>3. Dados Coletados</LegalSection>
      <LegalSubSection>3.1. Dados dos Contratantes</LegalSubSection>
      <LegalP>Nome completo, e-mail, telefone/WhatsApp, CPF ou CNPJ, endereço do estabelecimento, dados bancários (conta Mercado Pago vinculada), dados do cartão de crédito (processados pelo Stripe, nunca armazenados no modoGESTOR), foto de perfil e logo.</LegalP>
      <LegalSubSection>3.2. Dados dos Clientes Finais</LegalSubSection>
      <LegalP>Nome completo, telefone/WhatsApp, e-mail (opcional), CPF (para pagamento online), data de nascimento (opcional), endereço de cobrança (para cartão), histórico de agendamentos e pagamentos, dados de fidelidade.</LegalP>
      <LegalSubSection>3.3. Dados automáticos</LegalSubSection>
      <LegalP>Endereço IP, tipo de navegador e dispositivo, páginas acessadas, data e hora de acesso.</LegalP>

      <LegalSection>4. Finalidade e Base Legal</LegalSection>
      <LegalTable
        headers={["Finalidade", "Base Legal (LGPD)"]}
        rows={[
          ["Criar e gerenciar conta", "Execução de contrato (Art. 7º, V)"],
          ["Processar pagamentos (Stripe / MP)", "Execução de contrato (Art. 7º, V)"],
          ["Enviar confirmações e lembretes (WhatsApp)", "Execução de contrato (Art. 7º, V)"],
          ["Resumos semanais ao Contratante", "Legítimo interesse (Art. 7º, IX)"],
          ["Prevenção a fraudes e segurança", "Legítimo interesse (Art. 7º, IX)"],
          ["Obrigações fiscais", "Obrigação legal (Art. 7º, II)"],
          ["Comunicações de marketing", "Consentimento (Art. 7º, I)"],
        ]}
      />

      <LegalSection>5. Compartilhamento de Dados</LegalSection>
      <LegalTable
        headers={["Parceiro", "Finalidade", "Localização"]}
        rows={[
          ["Mercado Pago", "Pagamentos online", "Argentina/Brasil"],
          ["Stripe", "Cobrança SaaS", "Estados Unidos"],
          ["Supabase (AWS)", "Armazenamento", "São Paulo (sa-east-1)"],
          ["Cloudflare", "Segurança, CDN", "Global"],
          ["Evolution API / WhatsApp", "Notificações", "Brasil"],
        ]}
      />
      <LegalP>O modoGESTOR <LegalStrong>não vende, aluga ou comercializa</LegalStrong> dados pessoais a terceiros para fins de marketing ou publicidade.</LegalP>

      <LegalSection>6. Transferência Internacional</LegalSection>
      <LegalP>Alguns parceiros possuem servidores fora do Brasil (Stripe/EUA, Cloudflare/global). Transferências são realizadas com garantias previstas na LGPD. O banco de dados principal está em São Paulo (AWS sa-east-1).</LegalP>

      <LegalSection>7. Retenção de Dados</LegalSection>
      <LegalTable
        headers={["Tipo de Dado", "Período"]}
        rows={[
          ["Dados do Contratante (conta ativa)", "Durante a vigência"],
          ["Dados após cancelamento", "90 dias para exportação, depois deletados"],
          ["Dados financeiros", "5 anos (anonimizados) — obrigação fiscal"],
          ["Logs de segurança", "2 horas (auto-limpeza)"],
        ]}
      />

      <LegalSection>8. Direitos dos Titulares</LegalSection>
      <LegalP>Conforme a LGPD, você tem direito a: acesso, correção, exclusão, portabilidade, revogação de consentimento, informação sobre compartilhamento e oposição ao tratamento.</LegalP>
      <LegalHighlight>
        <LegalStrong>Como exercer seus direitos:</LegalStrong> Envie e-mail para contato@modogestor.com.br com o assunto "Exercício de Direitos LGPD". Responderemos em até 15 dias úteis.
      </LegalHighlight>

      <LegalSection>9. Medidas de Segurança</LegalSection>
      <LegalP>Criptografia em trânsito (HTTPS/TLS) e em repouso, Row Level Security (RLS) em todas as tabelas, rate limiting por IP e telefone, CORS restritivo, proteção contra bots (Cloudflare Turnstile), validação de CPF e endereço (AVS), dados de cartão nunca armazenados (Mercado Pago PCI DSS / Stripe), backup automático com Point-in-Time Recovery.</LegalP>

      <LegalSection>10. Incidentes de Segurança</LegalSection>
      <LegalP>Em caso de incidente que acarrete risco relevante, notificaremos a ANPD e os titulares afetados conforme Art. 48 da LGPD.</LegalP>

      <LegalSection>11. Cookies e Rastreamento</LegalSection>
      <LegalTable
        headers={["Tipo", "Finalidade", "Obrigatório?"]}
        rows={[
          ["Cookies de sessão", "Login e navegação funcional", "Sim (essencial)"],
          ["Cookies de autenticação", "Identificar usuário logado", "Sim (essencial)"],
          ["Cloudflare Turnstile", "Proteção contra bots", "Sim (segurança)"],
        ]}
      />
      <LegalP>O modoGESTOR <LegalStrong>não utiliza</LegalStrong> cookies de publicidade, Google Analytics, Meta Pixel ou rastreamento de terceiros na plataforma.</LegalP>

      <LegalSection>12. Alterações</LegalSection>
      <LegalP>Alterações relevantes serão comunicadas com 30 dias de antecedência por e-mail. Versão atualizada sempre disponível em modogestor.com.br/privacidade.</LegalP>

      <LegalSection>13. Contato</LegalSection>
      <LegalCompanyBox>
        <strong className="block text-[#f5f5f5] text-[13.5px] mb-0.5">Encarregado de Proteção de Dados (DPO)</strong>
        E-mail: contato@modogestor.com.br<br />
        Av. Maria Quitéria, 645, Sala 02, Feira de Santana – BA<br />
        Horário: segunda a sexta, 9h às 18h
      </LegalCompanyBox>
      <LegalP>Caso não fique satisfeito, você pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).</LegalP>
    </LegalPageLayout>
  );
}
