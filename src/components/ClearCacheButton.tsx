import { RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export function ClearCacheButton({ compact }: { compact?: boolean }) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  const handleClearCache = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    toast.info("Atualizando o sistema...");

    try {
      if ("caches" in window) {
        const names = await caches.keys();
        await Promise.all(names.map((n) => caches.delete(n)));
        console.log("Service worker caches cleared:", names.length);
      }

      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        console.log("Service workers unregistered:", regs.length);
      }

      queryClient.clear();

      await new Promise((r) => setTimeout(r, 500));
      window.location.reload();
    } catch (error) {
      console.error("Error clearing cache:", error);
      window.location.reload();
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClearCache}
          disabled={isRefreshing}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/30 rounded-xl h-8 w-8"
        >
          <RefreshCw
            className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Atualizar sistema</TooltipContent>
    </Tooltip>
  );
}
