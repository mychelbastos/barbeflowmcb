import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, X } from "lucide-react";
import type { StaffMember } from "@/hooks/useBookingsByDate";

type BlockMode = "dates" | "weekdays";

const WEEKDAY_LABELS = [
  { value: "0", short: "Dom", full: "Domingo" },
  { value: "1", short: "Seg", full: "Segunda-feira" },
  { value: "2", short: "Ter", full: "Terça-feira" },
  { value: "3", short: "Qua", full: "Quarta-feira" },
  { value: "4", short: "Qui", full: "Quinta-feira" },
  { value: "5", short: "Sex", full: "Sexta-feira" },
  { value: "6", short: "Sáb", full: "Sábado" },
];

interface BlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffMember[];
  defaultDate?: string;
  onCreated: () => void;
}

export function BlockDialog({ open, onOpenChange, staff, defaultDate, onCreated }: BlockDialogProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [staffId, setStaffId] = useState<string>("all");
  const [mode, setMode] = useState<BlockMode>("dates");
  
  // Dates mode
  const [dates, setDates] = useState<string[]>(defaultDate ? [defaultDate] : []);
  const [dateInput, setDateInput] = useState("");
  
  // Weekdays mode
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [weeksAhead, setWeeksAhead] = useState("4");
  
  // Time
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("18:00");
  
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const addDate = () => {
    if (dateInput && !dates.includes(dateInput)) {
      setDates(prev => [...prev, dateInput].sort());
      setDateInput("");
    }
  };

  const removeDate = (d: string) => {
    setDates(prev => prev.filter(x => x !== d));
  };

  const formatDateBR = (d: string) => {
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  };

  const generateWeekdayDates = (): string[] => {
    const weeks = parseInt(weeksAhead) || 4;
    const result: string[] = [];
    const today = new Date();
    
    for (let i = 0; i < weeks * 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dayOfWeek = d.getDay().toString();
      if (selectedWeekdays.includes(dayOfWeek)) {
        const iso = d.toISOString().split("T")[0];
        result.push(iso);
      }
    }
    return result;
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    
    const targetDates = mode === "dates" ? dates : generateWeekdayDates();
    
    if (targetDates.length === 0) {
      toast({ title: "Selecione ao menos uma data ou dia da semana", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const sTime = allDay ? "00:00" : startTime;
      const eTime = allDay ? "23:59" : endTime;

      const rows = targetDates.map(date => ({
        tenant_id: currentTenant.id,
        staff_id: staffId === "all" ? null : staffId,
        starts_at: `${date}T${sTime}:00-03:00`,
        ends_at: `${date}T${eTime}:00-03:00`,
        reason: reason || null,
      }));

      const { error } = await supabase.from("blocks").insert(rows);
      if (error) throw error;

      toast({ 
        title: "Bloqueio criado", 
        description: `${targetDates.length} dia(s) bloqueado(s) com sucesso` 
      });
      onCreated();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar bloqueio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setStaffId("all");
    setMode("dates");
    setDates(defaultDate ? [defaultDate] : []);
    setDateInput("");
    setSelectedWeekdays([]);
    setWeeksAhead("4");
    setAllDay(false);
    setStartTime("08:00");
    setEndTime("18:00");
    setReason("");
  };

  const totalBlocks = mode === "dates" ? dates.length : generateWeekdayDates().length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bloquear Horário</DialogTitle>
          <DialogDescription>Bloqueie um ou mais períodos para impedir agendamentos</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Staff */}
          <div>
            <Label>Profissional</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os profissionais</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode selector */}
          <div>
            <Label className="mb-2 block">Tipo de bloqueio</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("dates")}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  mode === "dates" 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Datas específicas
              </button>
              <button
                type="button"
                onClick={() => setMode("weekdays")}
                className={`flex items-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all ${
                  mode === "weekdays" 
                    ? "border-primary bg-primary/10 text-primary" 
                    : "border-border bg-card text-muted-foreground hover:border-primary/50"
                }`}
              >
                <CalendarDays className="h-4 w-4" />
                Dias da semana
              </button>
            </div>
          </div>

          {/* Dates mode */}
          {mode === "dates" && (
            <div>
              <Label>Datas</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  type="date" 
                  value={dateInput} 
                  onChange={(e) => setDateInput(e.target.value)} 
                  className="flex-1"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDate(); }}}
                />
                <Button type="button" variant="outline" size="sm" onClick={addDate} disabled={!dateInput}>
                  Adicionar
                </Button>
              </div>
              {dates.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {dates.map(d => (
                    <Badge key={d} variant="secondary" className="gap-1 pr-1">
                      {formatDateBR(d)}
                      <button onClick={() => removeDate(d)} className="hover:text-destructive transition-colors">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Weekdays mode */}
          {mode === "weekdays" && (
            <div className="space-y-3">
              <div>
                <Label className="mb-2 block">Dias da semana</Label>
                <ToggleGroup 
                  type="multiple" 
                  value={selectedWeekdays} 
                  onValueChange={setSelectedWeekdays}
                  className="flex flex-wrap gap-1"
                >
                  {WEEKDAY_LABELS.map(w => (
                    <ToggleGroupItem 
                      key={w.value} 
                      value={w.value} 
                      className="text-xs px-2.5 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                    >
                      {w.short}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </div>
              <div>
                <Label>Repetir por quantas semanas?</Label>
                <Select value={weeksAhead} onValueChange={setWeeksAhead}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 semana</SelectItem>
                    <SelectItem value="2">2 semanas</SelectItem>
                    <SelectItem value="4">4 semanas</SelectItem>
                    <SelectItem value="8">8 semanas</SelectItem>
                    <SelectItem value="12">12 semanas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {selectedWeekdays.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {generateWeekdayDates().length} dia(s) serão bloqueados: {selectedWeekdays.map(w => WEEKDAY_LABELS[parseInt(w)].full).join(", ")}
                </p>
              )}
            </div>
          )}

          {/* All day toggle */}
          <div className="flex items-center justify-between">
            <Label htmlFor="all-day">Dia inteiro</Label>
            <Switch id="all-day" checked={allDay} onCheckedChange={setAllDay} />
          </div>

          {/* Time range */}
          {!allDay && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Início</Label>
                <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Fim</Label>
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1" />
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <Label>Motivo (opcional)</Label>
            <Textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex: Reunião, Folga, Férias..." className="mt-1 resize-none" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving || totalBlocks === 0}>
            {saving ? "Salvando..." : `Bloquear ${totalBlocks > 1 ? `(${totalBlocks} dias)` : ""}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
