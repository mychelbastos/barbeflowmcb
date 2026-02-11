import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Pencil, Trash2, Users } from "lucide-react";

interface SubscriptionPlanCardProps {
  plan: any;
  onEdit: (plan: any) => void;
  onDelete: (id: string) => void;
  onToggleActive: (plan: any) => void;
}

export function SubscriptionPlanCard({ plan, onEdit, onDelete, onToggleActive }: SubscriptionPlanCardProps) {
  return (
    <Card className={!plan.active ? "opacity-50" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{plan.name}</h3>
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
