import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Sparkles, Loader2, ImagePlus, Wand2 } from "lucide-react";

interface AiTextButtonProps {
  table: string;
  currentName?: string;
  currentDescription?: string;
  onResult: (title: string, description: string) => void;
}

export function AiTextButton({ table, currentName, currentDescription, onResult }: AiTextButtonProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('ai-generate-content', {
        body: {
          type: 'text',
          table,
          item_name: currentName,
          item_description: currentDescription,
          user_instruction: instruction,
        },
      });

      if (error) {
        const msg = data?.error || 'Erro ao gerar conteúdo. Tente novamente em alguns segundos.';
        toast({ title: msg, variant: "destructive" });
        return;
      }
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }

      onResult(data.title, data.description);
      toast({ title: "Conteúdo gerado com IA ✨" });
      setOpen(false);
      setInstruction("");
    } catch (err) {
      console.error('AI text error:', err);
      toast({ title: "Erro ao gerar conteúdo. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10 hover:text-orange-300"
      >
        <Wand2 className="h-3.5 w-3.5 mr-1" />
        Gerar com IA
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-orange-400" />
              Gerar Título e Descrição
            </DialogTitle>
            <DialogDescription>
              A IA vai criar um título e descrição otimizados para conversão
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {currentName && (
              <p className="text-sm text-muted-foreground">
                Nome atual: <span className="text-foreground font-medium">{currentName}</span>
              </p>
            )}
            <div className="space-y-2">
              <Label>Instrução ou contexto (opcional)</Label>
              <Input
                placeholder="Ex: foco em luxo, destacar rapidez..."
                value={instruction}
                onChange={(e) => setInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerate()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleGenerate} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Sparkles className="h-4 w-4 mr-1" />}
              {loading ? "Gerando..." : "Gerar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface AiGenerateImageButtonProps {
  table: string;
  itemId: string;
  hasImage: boolean;
  onGenerated: () => void;
}

export function AiGenerateImageButton({ table, itemId, hasImage, onGenerated }: AiGenerateImageButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    try {
      setLoading(true);
      toast({ title: "🎨 Gerando imagem com IA...", description: "Isso pode levar alguns segundos" });

      const { data, error } = await supabase.functions.invoke('ai-generate-content', {
        body: { type: 'image', table, item_id: itemId },
      });

      if (error) {
        const msg = data?.error || 'Erro ao gerar imagem. Tente novamente em alguns segundos.';
        toast({ title: msg, variant: "destructive" });
        return;
      }
      if (data?.error) {
        toast({ title: data.error, variant: "destructive" });
        return;
      }

      toast({ title: "Imagem gerada com sucesso! 🎨" });
      onGenerated();
    } catch (err) {
      console.error('AI image error:', err);
      toast({ title: "Erro ao gerar imagem. Tente novamente.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleGenerate}
      disabled={loading}
      className="text-purple-400 hover:text-purple-300 hover:bg-purple-500/10"
      title={hasImage ? "Regenerar imagem com IA" : "Gerar imagem com IA"}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <ImagePlus className="h-4 w-4" />
      )}
      <span className="ml-1 text-xs hidden sm:inline">{hasImage ? "Regenerar" : "Gerar imagem"}</span>
    </Button>
  );
}
