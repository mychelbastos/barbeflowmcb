import { useState, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Calendar } from "lucide-react";
import { format, subDays, startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface ReportDateRange {
  startDate: string; // ISO string
  endDate: string;
}

const presets = [
  { value: "today", label: "Hoje" },
  { value: "7d", label: "Últimos 7 dias" },
  { value: "this_month", label: "Este mês" },
  { value: "last_month", label: "Mês passado" },
  { value: "3m", label: "Últimos 3 meses" },
  { value: "this_year", label: "Este ano" },
  { value: "custom", label: "Personalizado" },
];

function getRange(preset: string, customStart?: string, customEnd?: string): ReportDateRange {
  const now = new Date();
  switch (preset) {
    case "today":
      return { startDate: startOfDay(now).toISOString(), endDate: endOfDay(now).toISOString() };
    case "7d":
      return { startDate: startOfDay(subDays(now, 6)).toISOString(), endDate: endOfDay(now).toISOString() };
    case "this_month":
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfDay(now).toISOString() };
    case "last_month": {
      const lm = subMonths(now, 1);
      return { startDate: startOfMonth(lm).toISOString(), endDate: endOfMonth(lm).toISOString() };
    }
    case "3m":
      return { startDate: startOfDay(subMonths(now, 3)).toISOString(), endDate: endOfDay(now).toISOString() };
    case "this_year":
      return { startDate: startOfYear(now).toISOString(), endDate: endOfDay(now).toISOString() };
    case "custom":
      if (customStart && customEnd) {
        return { startDate: new Date(customStart).toISOString(), endDate: endOfDay(new Date(customEnd)).toISOString() };
      }
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfDay(now).toISOString() };
    default:
      return { startDate: startOfMonth(now).toISOString(), endDate: endOfDay(now).toISOString() };
  }
}

interface Props {
  value: ReportDateRange;
  onChange: (range: ReportDateRange) => void;
}

export function ReportPeriodFilter({ value, onChange }: Props) {
  const [preset, setPreset] = useState("this_month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const handlePreset = (p: string) => {
    setPreset(p);
    if (p !== "custom") {
      onChange(getRange(p));
    }
  };

  const handleCustomStart = (v: string) => {
    setCustomStart(v);
    if (v && customEnd) onChange(getRange("custom", v, customEnd));
  };

  const handleCustomEnd = (v: string) => {
    setCustomEnd(v);
    if (customStart && v) onChange(getRange("custom", customStart, v));
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
      <Select value={preset} onValueChange={handlePreset}>
        <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {presets.map((p) => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      {preset === "custom" && (
        <div className="flex items-center gap-2">
          <Input type="date" value={customStart} onChange={(e) => handleCustomStart(e.target.value)} className="h-9 text-sm w-[150px]" />
          <span className="text-xs text-muted-foreground">até</span>
          <Input type="date" value={customEnd} onChange={(e) => handleCustomEnd(e.target.value)} className="h-9 text-sm w-[150px]" />
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 border border-border/60 whitespace-nowrap sm:ml-auto">
        <Calendar className="h-3.5 w-3.5 text-primary/60 flex-shrink-0" />
        <span>{format(new Date(value.startDate), "dd/MM/yy", { locale: ptBR })}</span>
        <span>—</span>
        <span>{format(new Date(value.endDate), "dd/MM/yy", { locale: ptBR })}</span>
      </div>
    </div>
  );
}

export function useReportPeriod() {
  const [range, setRange] = useState<ReportDateRange>(() => getRange("this_month"));
  return { range, setRange };
}
