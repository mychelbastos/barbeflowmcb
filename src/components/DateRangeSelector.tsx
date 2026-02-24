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
      <div className="p-3 md:px-5 md:py-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          {showTitle && (
            <div className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Filter className="h-4 w-4 text-primary" />
              </div>
              <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                Período de Análise
              </span>
            </div>
          )}

          {/* Divider on desktop */}
          {showTitle && (
            <div className="hidden sm:block w-px h-8 bg-border flex-shrink-0" />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 flex-1">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Label className="text-muted-foreground text-xs whitespace-nowrap hidden sm:inline">Período</Label>
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="h-9 text-sm w-full sm:w-[180px]">
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
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-9 text-sm w-[150px]"
                />
                <span className="text-xs text-muted-foreground">até</span>
                <Input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-9 text-sm w-[150px]"
                />
              </div>
            )}

            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/60 whitespace-nowrap sm:ml-auto">
              <Calendar className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
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
