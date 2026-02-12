import { Badge } from "@/components/ui/badge";
import { Package, Repeat } from "lucide-react";

interface BenefitBadgeProps {
  type: 'package' | 'subscription';
  remaining: number | null; // null = unlimited
  label?: string;
}

export function BenefitBadge({ type, remaining, label }: BenefitBadgeProps) {
  const isPackage = type === 'package';
  const Icon = isPackage ? Package : Repeat;

  return (
    <Badge
      variant="secondary"
      className={`text-[10px] px-2 py-0.5 gap-1 ${
        isPackage
          ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
          : 'bg-primary/10 text-primary border-primary/20'
      }`}
    >
      <Icon className="h-3 w-3" />
      {label || (
        remaining === null
          ? `Incluso no ${isPackage ? 'pacote' : 'plano'} (ilimitado)`
          : `Incluso no ${isPackage ? 'pacote' : 'plano'} (${remaining} restante${remaining !== 1 ? 's' : ''})`
      )}
    </Badge>
  );
}
