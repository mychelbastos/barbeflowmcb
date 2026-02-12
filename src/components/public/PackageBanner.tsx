import { Package, Repeat, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BenefitSummary {
  name: string;
  type: 'package' | 'subscription';
  remainingSessions: number;
}

interface PackageBannerProps {
  benefits: BenefitSummary[];
  onUseBenefits: () => void;
}

export function PackageBanner({ benefits, onUseBenefits }: PackageBannerProps) {
  if (benefits.length === 0) return null;

  return (
    <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl mb-6">
      <div className="flex items-center gap-2 mb-2">
        <Package className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium text-primary">Você tem sessões disponíveis!</span>
      </div>
      <div className="space-y-1 mb-3">
        {benefits.map((b, i) => (
          <div key={i} className="flex items-center gap-2 text-xs text-zinc-400">
            {b.type === 'package' ? (
              <Package className="h-3 w-3 text-amber-400 shrink-0" />
            ) : (
              <Repeat className="h-3 w-3 text-primary shrink-0" />
            )}
            <span>{b.name} — {b.remainingSessions} sessões restantes</span>
          </div>
        ))}
      </div>
      <Button
        size="sm"
        variant="outline"
        onClick={onUseBenefits}
        className="w-full border-primary/30 text-primary hover:bg-primary/10 rounded-lg"
      >
        Usar meus benefícios
        <ArrowRight className="h-3.5 w-3.5 ml-1" />
      </Button>
    </div>
  );
}
