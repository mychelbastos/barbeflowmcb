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
    <div className={`bg-zinc-900/50 border border-zinc-800/50 rounded-xl md:rounded-2xl ${className}`}>
      {showTitle && (
        <div className="p-3 md:p-5 border-b border-zinc-800/50">
          <h2 className="text-base md:text-lg font-semibold text-zinc-100 flex items-center">
            <div className="w-7 h-7 md:w-8 md:h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center mr-2 md:mr-3">
              <Filter className="h-3.5 w-3.5 md:h-4 md:w-4 text-emerald-400" />
            </div>
            Período de Análise
          </h2>
        </div>
      )}
      <div className={showTitle ? "p-3 md:p-5" : "p-3 md:p-5"}>
        <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-3">
          <div className="space-y-1.5 md:space-y-2">
            <Label className="text-zinc-400 text-xs md:text-sm">Período</Label>
            <Select value={preset} onValueChange={setPreset}>
              <SelectTrigger className="h-10 md:h-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-zinc-800">
                {presetOptions.map(option => (
                  <SelectItem 
                    key={option.value} 
                    value={option.value}
                    className="text-zinc-300 focus:bg-zinc-800 focus:text-zinc-100 text-sm"
                  >
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {preset === 'custom' && (
            <>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-zinc-400 text-xs md:text-sm">Data Inicial</Label>
                <Input 
                  type="date" 
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="h-10 md:h-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm"
                />
              </div>
              <div className="space-y-1.5 md:space-y-2">
                <Label className="text-zinc-400 text-xs md:text-sm">Data Final</Label>
                <Input 
                  type="date" 
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="h-10 md:h-11 bg-zinc-800/50 border-zinc-700/50 text-zinc-100 focus:border-emerald-500/50 focus:ring-emerald-500/20 text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Display current range */}
        <div className="mt-3 md:mt-4 p-2.5 md:p-3 bg-zinc-800/30 rounded-lg md:rounded-xl border border-zinc-700/30">
          <div className="flex items-center text-xs md:text-sm text-zinc-400 flex-wrap gap-1">
            <Calendar className="h-3.5 w-3.5 md:h-4 md:w-4 mr-1.5 md:mr-2 text-zinc-500 flex-shrink-0" />
            <span className="flex flex-wrap gap-1">
              <span>De</span>
              <strong className="text-emerald-400">{format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}</strong>
              <span>até</span>
              <strong className="text-emerald-400">{format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
