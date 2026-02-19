import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { getConsentStatus, grantMarketingConsent, revokeMarketingConsent } from "@/utils/consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (getConsentStatus() === null) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  const handleAccept = () => {
    grantMarketingConsent();
    setVisible(false);
  };

  const handleReject = () => {
    revokeMarketingConsent();
    setVisible(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4">
      <div className="max-w-3xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              Usamos cookies para melhorar sua experiência e medir o desempenho de nossos anúncios.{" "}
              <a href="/privacidade" className="underline text-primary hover:text-primary/80">
                Saiba mais
              </a>
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="flex-1 sm:flex-none"
            >
              Recusar
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 sm:flex-none"
            >
              Aceitar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
