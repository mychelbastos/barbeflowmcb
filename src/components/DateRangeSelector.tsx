import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDateRange, presetOptions } from "@/contexts/DateRangeContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, Filter } from "lucide-react";

interface DateRangeSelectorProps {
  className?: string;
  showTitle?: boolean;
}

export function DateRangeSelector({ className, showTitle = true }: DateRangeSelectorProps) {
  const {
    preset,
    setPreset,
    customStartDate,
    setCustomStartDate,
    customEndDate,
    setCustomEndDate,
    dateRange,
  } = useDateRange();

  return (
    <div className={`bg-card border border-border rounded-xl md:rounded-2xl ${className}`}>
      <div className="p-3 md:p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
          {showTitle && (
            <div className="flex items-center gap-2 md:mr-2 flex-shrink-0">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
              </div>
              <h2 className="text-sm md:text-base font-semibold text-foreground whitespace-nowrap">
                Período de Análise
              </h2>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-1">
            <div className="space-y-1 sm:min-w-[180px] sm:max-w-[220px]">
              <Label className="text-muted-foreground text-xs">Período</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="h-9 md:h-10 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {presetOptions.map(option => (
                    <SelectItem key={option.value} value={option.value} className="text-sm">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {preset === 'custom' && (
              <>
                <div className="space-y-1 sm:min-w-[160px]">
                  <Label className="text-muted-foreground text-xs">Data Inicial</Label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
                <div className="space-y-1 sm:min-w-[160px]">
                  <Label className="text-muted-foreground text-xs">Data Final</Label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="h-9 md:h-10 text-sm"
                  />
                </div>
              </>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 border border-border whitespace-nowrap sm:ml-auto">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              <span>De</span>
              <strong className="text-primary">{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}</strong>
              <span>até</span>
              <strong className="text-primary">{format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
