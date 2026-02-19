import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";
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
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-3xl mx-auto bg-background border border-border rounded-2xl shadow-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          Usamos cookies para melhorar sua experiência e medir resultados de campanhas.{" "}
          <a href="/privacidade" className="underline text-foreground hover:text-primary transition-colors">
            Saiba mais
          </a>
        </p>
        <div className="flex gap-2 shrink-0 w-full sm:w-auto">
          <Button variant="ghost" size="sm" onClick={handleDecline} className="flex-1 sm:flex-none">
            Recusar
          </Button>
          <Button size="sm" onClick={handleAccept} className="flex-1 sm:flex-none">
            Aceitar
          </Button>
        </div>
      </div>
    </div>
  );
}
