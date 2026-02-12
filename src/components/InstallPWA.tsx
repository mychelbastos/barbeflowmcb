import { useState, useEffect } from "react";
import { X, Download, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    // Check if dismissed recently (24h cooldown)
    const dismissed = localStorage.getItem("pwa-install-dismissed");
    if (dismissed && Date.now() - Number(dismissed) < 86400000) return;

    // iOS detection
    const ua = navigator.userAgent;
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    setIsIOS(isIOSDevice);

    if (isIOSDevice) {
      // On iOS, show manual instructions after a delay
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Chrome/Android: listen for native install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowBanner(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", String(Date.now()));
  };

  return (
    <AnimatePresence>
      {showBanner && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-[100] mx-auto max-w-md rounded-2xl border border-border bg-card p-4 shadow-2xl shadow-black/40"
        >
          <button
            onClick={handleDismiss}
            className="absolute right-3 top-3 rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 pr-4">
              <p className="text-sm font-semibold text-foreground">
                Instalar BarberFlow
              </p>
              {isIOS ? (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Toque em{" "}
                  <span className="font-medium text-foreground">Compartilhar</span>{" "}
                  e depois em{" "}
                  <span className="font-medium text-foreground">
                    Adicionar à Tela de Início
                  </span>
                  .
                </p>
              ) : (
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                  Adicione o app à sua tela inicial para acesso rápido.
                </p>
              )}
            </div>
          </div>

          {!isIOS && (
            <Button
              onClick={handleInstall}
              size="sm"
              className="mt-3 w-full"
            >
              <Download className="h-4 w-4 mr-1.5" />
              Instalar agora
            </Button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default InstallPWA;
