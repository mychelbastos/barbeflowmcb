import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  month: Date;
  onChange: (date: Date) => void;
}

export function MonthNavigator({ month, onChange }: Props) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onChange(subMonths(month, 1))}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm font-semibold text-foreground capitalize min-w-[160px] text-center">
        {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
      </span>
      <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => onChange(addMonths(month, 1))}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
