import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Users, EyeOff, Sparkles, Loader2 } from "lucide-react";

interface SubscriptionPlanCardProps {
  plan: any;
  onEdit: (plan: any) => void;
  onDelete: (id: string) => void;
  onToggleActive: (plan: any) => void;
  onReload?: () => void;
}

export function SubscriptionPlanCard({ plan, onEdit, onDelete, onToggleActive, onReload }: SubscriptionPlanCardProps) {
  const { toast } = useToast();
  const [enhancing, setEnhancing] = useState(false);

  const handleEnhance = async () => {
    if (!plan.photo_url) return;
    try {
      setEnhancing(true);
      toast({ title: "✨ Melhorando imagem com IA...", description: "Isso pode levar alguns segundos" });
      const { data, error } = await supabase.functions.invoke('enhance-product-image', {
        body: { item_id: plan.id, image_url: plan.photo_url, table: 'subscription_plans' },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); return; }
      toast({ title: "Imagem melhorada com sucesso! ✨" });
      onReload?.();
    } catch (err) {
      console.error('Enhance error:', err);
      toast({ title: "Erro ao melhorar imagem", variant: "destructive" });
    } finally {
      setEnhancing(false);
    }
  };

  return (
    <Card className={!plan.active ? "opacity-50" : ""}>
      {plan.photo_url && (
        <div className="h-28 w-full overflow-hidden rounded-t-lg">
          <img src={plan.photo_url} alt={plan.name} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-foreground truncate">{plan.name}</h3>
              {plan.public === false && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  <EyeOff className="h-3 w-3 mr-0.5" /> Privado
                </Badge>
              )}
            </div>
            <span className="text-sm font-semibold text-emerald-400">
              R$ {(plan.price_cents / 100).toFixed(2)}/mês
            </span>
            {plan.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{plan.description}</p>
            )}
          </div>
          <Switch checked={plan.active} onCheckedChange={() => onToggleActive(plan)} />
        </div>

        {/* Services */}
        <div className="space-y-1 mb-3">
          {(plan.plan_services || []).map((ps: any) => (
            <div key={ps.id} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate">{ps.service?.name}</span>
              <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                {ps.sessions_per_cycle == null ? '∞' : `${ps.sessions_per_cycle}x/mês`}
              </Badge>
            </div>
          ))}
        </div>

        {/* Subscriber count */}
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-3">
          <Users className="h-3.5 w-3.5" />
          <span>{plan.active_subscribers || 0} assinante(s) ativo(s)</span>
        </div>

        {/* Limits */}
        {plan.sessions_limit && (
          <div className="text-xs text-muted-foreground mb-3">
            Limite geral: {plan.sessions_limit} sessões/mês
          </div>
        )}

        <div className="flex items-center gap-1 pt-2 border-t border-border">
          {plan.photo_url && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleEnhance}
              disabled={enhancing}
              className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
              title="Melhorar imagem com IA"
            >
              {enhancing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => onEdit(plan)}>
            <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(plan.id)}>
            <Trash2 className="h-3.5 w-3.5 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
