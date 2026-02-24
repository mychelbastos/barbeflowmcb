import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  value: number;
  onChange: (v: number) => void;
}

export function ReportDaysFilter({ value, onChange }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Label className="text-sm text-muted-foreground whitespace-nowrap">Sem retorno há</Label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 30))}
        className="h-9 w-20 text-sm"
        min={1}
      />
      <span className="text-sm text-muted-foreground">dias</span>
    </div>
  );
}
