import { useNavigate } from "react-router-dom";
import { dashPath } from "@/lib/hostname";
import { Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeBadgeProps {
  featureName: string;
}

export function UpgradeBadge({ featureName }: UpgradeBadgeProps) {
  const navigate = useNavigate();

  return (
    <Card className="border-primary/20 bg-primary/5">
      <CardContent className="pt-6 text-center space-y-3">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Lock className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Disponível no plano Profissional</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Faça upgrade para acessar {featureName} e muito mais.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(dashPath("/app/settings?tab=billing"))}
          className="gap-1"
        >
          Fazer upgrade <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardContent>
    </Card>
  );
}
