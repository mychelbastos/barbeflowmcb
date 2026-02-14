import { createContext, useContext, useState, ReactNode } from "react";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface DateRange {
  from: Date;
  to: Date;
}

export interface DateRangeContextValue {
  dateRange: DateRange;
  setDateRange: (range: DateRange) => void;
  preset: string;
  setPreset: (preset: string) => void;
  customStartDate: string;
  setCustomStartDate: (date: string) => void;
  customEndDate: string;
  setCustomEndDate: (date: string) => void;
}

const DateRangeContext = createContext<DateRangeContextValue | undefined>(undefined);

export const presetOptions = [
  { value: 'today', label: 'Hoje' },
  { value: '7', label: 'Últimos 7 dias' },
  { value: '14', label: 'Últimos 14 dias' },
  { value: '30', label: 'Últimos 30 dias' },
  { value: '60', label: 'Últimos 60 dias' },
  { value: '90', label: 'Últimos 90 dias' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mês' },
  { value: 'custom', label: 'Personalizado' },
];

const getDateRangeFromPreset = (preset: string, customStart?: string, customEnd?: string): DateRange => {
  const now = new Date();
  
  switch (preset) {
    case 'today':
      return { from: startOfDay(now), to: endOfDay(now) };
    case '7':
      return { from: startOfDay(subDays(now, 6)), to: endOfDay(now) };
    case '14':
      return { from: startOfDay(subDays(now, 13)), to: endOfDay(now) };
    case '30':
      return { from: startOfDay(subDays(now, 29)), to: endOfDay(now) };
    case '60':
      return { from: startOfDay(subDays(now, 59)), to: endOfDay(now) };
    case '90':
      return { from: startOfDay(subDays(now, 89)), to: endOfDay(now) };
    case 'week':
      return { from: startOfWeek(now, { locale: ptBR }), to: endOfWeek(now, { locale: ptBR }) };
    case 'month':
      return { from: startOfMonth(now), to: endOfMonth(now) };
    case 'custom':
      if (customStart && customEnd) {
        // Use parseISO to correctly parse YYYY-MM-DD without timezone issues
        const startDate = startOfDay(parseISO(customStart));
        const endDate = endOfDay(parseISO(customEnd));
        return { from: startDate, to: endDate };
      }
      return { from: subDays(now, 29), to: now };
    default:
      return { from: subDays(now, 29), to: now };
  }
};

export function DateRangeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState('today');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>(() => 
    getDateRangeFromPreset('today')
  );

  const handleSetPreset = (newPreset: string) => {
    setPreset(newPreset);
    const newRange = getDateRangeFromPreset(newPreset, customStartDate, customEndDate);
    setDateRange(newRange);
  };

  const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

  const handleSetCustomStartDate = (date: string) => {
    setCustomStartDate(date);
    if (preset === 'custom' && isValidDate(date) && isValidDate(customEndDate)) {
      const newRange = getDateRangeFromPreset('custom', date, customEndDate);
      setDateRange(newRange);
    }
  };

  const handleSetCustomEndDate = (date: string) => {
    setCustomEndDate(date);
    if (preset === 'custom' && isValidDate(customStartDate) && isValidDate(date)) {
      const newRange = getDateRangeFromPreset('custom', customStartDate, date);
      setDateRange(newRange);
    }
  };

  return (
    <DateRangeContext.Provider
      value={{
        dateRange,
        setDateRange,
        preset,
        setPreset: handleSetPreset,
        customStartDate,
        setCustomStartDate: handleSetCustomStartDate,
        customEndDate,
        setCustomEndDate: handleSetCustomEndDate,
      }}
    >
      {children}
    </DateRangeContext.Provider>
  );
}

export function useDateRange() {
  const context = useContext(DateRangeContext);
  if (context === undefined) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
}