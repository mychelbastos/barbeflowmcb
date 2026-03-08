import { getPublicUrl } from "@/lib/hostname";
import { FileText, Lock, Handshake, Wallet, CalendarCheck, ExternalLink } from "lucide-react";

const legalDocs = [
  {
    icon: FileText,
    title: "Termos de Uso",
    description: "Regras de uso da plataforma modoGESTOR",
    url: "/termos",
  },
  {
    icon: Lock,
    title: "Política de Privacidade",
    description: "Como seus dados e dos seus clientes são tratados",
    url: "/privacidade",
  },
  {
    icon: Handshake,
    title: "Acordo de Processamento de Dados (DPA)",
    description: "Como o modoGESTOR processa os dados dos seus clientes",
    url: "/dpa",
  },
  {
    icon: Wallet,
    title: "Política de Reembolso e Cancelamento",
    description: "Regras de reembolso para assinaturas e pagamentos",
    url: "/reembolso",
  },
  {
    icon: CalendarCheck,
    title: "Termos do Agendamento Online",
    description: "Termos exibidos aos seus clientes ao agendar",
    url: "/termos-agendamento",
  },
];

interface LegalSettingsSectionProps {
  termsAcceptedAt?: string | null;
}

export default function LegalSettingsSection({ termsAcceptedAt }: LegalSettingsSectionProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">Documentos Legais</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Documentos que regem o uso da plataforma e a relação com seus clientes.
        </p>
      </div>

      <div className="space-y-3">
        {legalDocs.map((doc) => (
          <a
            key={doc.url}
            href={getPublicUrl(doc.url)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                <doc.icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                  {doc.title}
                </p>
                <p className="text-xs text-muted-foreground">{doc.description}</p>
              </div>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </a>
        ))}
      </div>

      {termsAcceptedAt && (
        <p className="text-xs text-muted-foreground">
          Termos aceitos em: {new Date(termsAcceptedAt).toLocaleDateString("pt-BR")}{" "}
          às{" "}
          {new Date(termsAcceptedAt).toLocaleTimeString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      )}
    </div>
  );
}
