import { useState } from "react";
import { getPublicUrl } from "@/lib/hostname";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText, Shield } from "lucide-react";

export function TermsAcceptanceModal() {
  const { currentTenant } = useTenant();
  const [accepted, setAccepted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const settings = currentTenant?.settings as Record<string, any> | null;
  const alreadyAccepted = !!settings?.terms_accepted_at;

  if (!currentTenant || alreadyAccepted || dismissed) return null;

  const handleAccept = async () => {
    if (!accepted) return;
    setSaving(true);
    try {
      const newSettings = {
        ...(settings || {}),
        terms_accepted_at: new Date().toISOString(),
        terms_version: "2025-03-08",
      };
      await supabase
        .from("tenants")
        .update({ settings: newSettings })
        .eq("id", currentTenant.id);
      // Force reload to update tenant data
      window.location.reload();
    } catch {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <DialogTitle>Aceite dos Termos de Uso</DialogTitle>
          </div>
          <DialogDescription>
            Atualizamos nossos termos e políticas. Para continuar usando o modoGESTOR, é necessário aceitar os novos documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <a
            href={getPublicUrl("/termos")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
          >
            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              Termos de Uso
            </span>
          </a>
          <a
            href={getPublicUrl("/privacidade")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/30 transition-all group"
          >
            <FileText className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
            <span className="text-sm font-medium group-hover:text-primary transition-colors">
              Política de Privacidade
            </span>
          </a>
        </div>

        <div className="flex items-start gap-3 pt-2">
          <Checkbox
            id="accept-terms"
            checked={accepted}
            onCheckedChange={(c) => setAccepted(c === true)}
            className="mt-0.5"
          />
          <label htmlFor="accept-terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            Li e aceito os{" "}
            <span className="text-foreground font-medium">Termos de Uso</span> e a{" "}
            <span className="text-foreground font-medium">Política de Privacidade</span> do modoGESTOR.
          </label>
        </div>

        <Button
          onClick={handleAccept}
          disabled={!accepted || saving}
          className="w-full mt-2"
        >
          {saving ? "Salvando..." : "Aceitar e continuar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
