import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Lock, Crown, ArrowUp } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const FEATURE_NAMES: Record<string, string> = {
  ai_image: "Foto Profissional",
  ai_text: "Texto que Vende",
  order_bump: "Vitrine Inteligente",
  unlimited_staff: "Profissionais Ilimitados",
  whatsapp_chatbot: "Chatbot WhatsApp",
};

interface UpgradePromptProps {
  feature: string;
  /** Render as an inline locked button instead of a block */
  inline?: boolean;
}

export function UpgradePrompt({ feature, inline }: UpgradePromptProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const label = FEATURE_NAMES[feature] || feature;

  const handleUpgrade = () => {
    setOpen(false);
    navigate("/app/settings?tab=billing");
  };

  if (inline) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(true)}
              className="text-muted-foreground border-muted opacity-70 cursor-pointer"
            >
              <Lock className="h-3.5 w-3.5 mr-1" />
              {label}
              <Badge variant="outline" className="ml-1.5 text-[10px] px-1 py-0 border-amber-500/30 text-amber-400">
                Ilimitado
              </Badge>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Disponível no plano Ilimitado</p>
          </TooltipContent>
        </Tooltip>
        <UpgradeDialog open={open} onOpenChange={setOpen} label={label} onUpgrade={handleUpgrade} />
      </TooltipProvider>
    );
  }

  return (
    <>
      <div
        className="flex items-center gap-2 p-3 rounded-lg border border-dashed border-amber-500/30 bg-amber-500/5 cursor-pointer hover:bg-amber-500/10 transition-colors"
        onClick={() => setOpen(true)}
      >
        <Lock className="h-4 w-4 text-amber-400 shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">
          <span className="font-medium text-amber-400">{label}</span> — disponível no plano Ilimitado
        </span>
        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 shrink-0">
          Upgrade
        </Badge>
      </div>
      <UpgradeDialog open={open} onOpenChange={setOpen} label={label} onUpgrade={handleUpgrade} />
    </>
  );
}

function UpgradeDialog({ open, onOpenChange, label, onUpgrade }: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  label: string;
  onUpgrade: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Recurso do plano Ilimitado
          </DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{label}</span> está disponível exclusivamente no plano Ilimitado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 text-sm text-muted-foreground">
          <p>Com o plano Ilimitado você também ganha:</p>
          <ul className="space-y-1 ml-1">
            <li>✨ Foto Profissional com IA</li>
            <li>✨ Texto que Vende com IA</li>
            <li>✨ Vitrine Inteligente (order bump)</li>
            <li>✨ Profissionais ilimitados sem custo extra</li>
            <li>✨ Taxa de transação reduzida (1,0%)</li>
          </ul>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button onClick={onUpgrade} className="bg-amber-500 hover:bg-amber-600 text-black">
            <ArrowUp className="h-4 w-4 mr-1" />
            Fazer upgrade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
