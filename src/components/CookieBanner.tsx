import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, ShieldCheck } from "lucide-react";
import { getConsentStatus, grantMarketingConsent, revokeMarketingConsent } from "@/utils/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(() => getConsentStatus() === null);

  if (!visible) return null;

  const handleAccept = () => {
    grantMarketingConsent();
    setVisible(false);
  };

  const handleDecline = () => {
    revokeMarketingConsent();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-gradient-to-t from-black/80 via-black/50 to-transparent pt-24 pointer-events-none">
      <div className="pointer-events-auto w-full max-w-2xl mx-auto px-4 pb-6">
        <div className="bg-background border border-border rounded-2xl shadow-2xl p-6 sm:p-8 animate-in slide-in-from-bottom-4 duration-500">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Sua privacidade importa</h3>
          </div>

          <p className="text-sm text-muted-foreground mb-2">
            Utilizamos cookies para melhorar sua experiência, personalizar conteúdo e medir resultados de campanhas.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            Para continuar navegando, escolha uma das opções abaixo.{" "}
            <a href="/privacidade" className="underline text-foreground hover:text-primary transition-colors">
              Política de Privacidade
            </a>
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Button variant="outline" size="lg" onClick={handleDecline} className="flex-1 sm:flex-none">
              Recusar cookies
            </Button>
            <Button size="lg" onClick={handleAccept} className="flex-1 gap-2">
              <ShieldCheck className="h-4 w-4" />
              Aceitar e continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
