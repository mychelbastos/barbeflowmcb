import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Plus, 
  Calendar, 
  CalendarDays,
  Clock, 
  Trash2, 
  Loader2,
  CalendarOff,
  Ban,
  X
} from "lucide-react";
import { parseISO, isBefore, startOfDay } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";
import { ptBR } from "date-fns/locale";

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

const TIMEZONE = "America/Bahia";

interface Block {
  id: string;
  tenant_id: string;
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  created_at: string;
}

interface Staff {
  id: string;
  name: string;
}

interface AvailabilityBlocksManagerProps {
  tenantId: string;
}

export function AvailabilityBlocksManager({ tenantId }: AvailabilityBlocksManagerProps) {
  const { toast } = useToast();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Form state
  const [mode, setMode] = useState<BlockMode>("dates");
  const [dates, setDates] = useState<string[]>([]);
  const [dateInput, setDateInput] = useState("");
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>([]);
  const [weeksAhead, setWeeksAhead] = useState("4");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [reason, setReason] = useState("");

  const addDate = () => {
    if (dateInput && !dates.includes(dateInput)) {
      setDates(prev => [...prev, dateInput].sort());
      setDateInput("");
    }
  };

  const removeDate = (d: string) => setDates(prev => prev.filter(x => x !== d));

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
      if (selectedWeekdays.includes(d.getDay().toString())) {
        result.push(d.toISOString().split("T")[0]);
      }
    }
    return result;
  };

  useEffect(() => {
    loadData();
  }, [tenantId]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [blocksResult, staffResult] = await Promise.all([
        supabase
          .from('blocks')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('starts_at', { ascending: true }),
        supabase
          .from('staff')
          .select('id, name')
          .eq('tenant_id', tenantId)
          .eq('active', true)
          .order('name')
      ]);

      if (blocksResult.error) throw blocksResult.error;
      if (staffResult.error) throw staffResult.error;

      // Filter out past blocks
      const today = startOfDay(new Date());
      const futureBlocks = (blocksResult.data || []).filter(block => {
        const blockDate = parseISO(block.starts_at);
        return !isBefore(blockDate, today);
      });

      setBlocks(futureBlocks);
      setStaff(staffResult.data || []);
    } catch (error) {
      console.error('Error loading blocks:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar bloqueios",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setMode("dates");
    setDates([]);
    setDateInput("");
    setSelectedWeekdays([]);
    setWeeksAhead("4");
    setIsFullDay(true);
    setStartTime("09:00");
    setEndTime("18:00");
    setSelectedStaff("all");
    setReason("");
  };

  const totalBlocks = mode === "dates" ? dates.length : generateWeekdayDates().length;

  const handleCreateBlock = async () => {
    const targetDates = mode === "dates" ? dates : generateWeekdayDates();

    if (targetDates.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione ao menos uma data ou dia da semana",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      const sTime = isFullDay ? "00:00" : startTime;
      const eTime = isFullDay ? "23:59" : endTime;

      const rows = targetDates.map(date => ({
        tenant_id: tenantId,
        staff_id: selectedStaff === "all" ? null : selectedStaff,
        starts_at: `${date}T${sTime}:00-03:00`,
        ends_at: `${date}T${eTime}:00-03:00`,
        reason: reason || null,
      }));

      const { error } = await supabase.from('blocks').insert(rows);
      if (error) throw error;

      toast({
        title: "Bloqueio criado",
        description: `${targetDates.length} dia(s) bloqueado(s) com sucesso.`,
      });

      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating block:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar bloqueio",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    try {
      const { error } = await supabase
        .from('blocks')
        .delete()
        .eq('id', blockId);

      if (error) throw error;

      toast({
        title: "Bloqueio removido",
        description: "O bloqueio foi removido com sucesso.",
      });

      loadData();
    } catch (error: any) {
      console.error('Error deleting block:', error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao remover bloqueio",
        variant: "destructive",
      });
    }
  };

  const formatBlockDateTime = (startsAt: string, endsAt: string) => {
    const start = parseISO(startsAt);
    const end = parseISO(endsAt);
    
    const startH = formatInTimeZone(start, TIMEZONE, "HH");
    const startM = formatInTimeZone(start, TIMEZONE, "mm");
    const endH = formatInTimeZone(end, TIMEZONE, "HH");
    const endM = formatInTimeZone(end, TIMEZONE, "mm");
    
    const isFullDay = startH === "00" && startM === "00" && endH === "23" && endM === "59";
    
    const dateStr = formatInTimeZone(start, TIMEZONE, "EEEE, d 'de' MMMM", { locale: ptBR });
    
    if (isFullDay) {
      return { date: dateStr, time: "Dia inteiro", isFullDay: true };
    }
    
    const timeStr = `${startH}:${startM} - ${endH}:${endM}`;
    return { date: dateStr, time: timeStr, isFullDay: false };
  };

  const getStaffName = (staffId: string | null) => {
    if (!staffId) return "Todos os profissionais";
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember?.name || "Profissional";
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Bloqueios de Agenda</h3>
          <p className="text-sm text-muted-foreground">
            Feche dias inteiros ou horários específicos
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Bloqueio
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Criar Bloqueio</DialogTitle>
              <DialogDescription>
                Bloqueie um ou mais períodos para impedir agendamentos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-2">
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
                <div className="space-y-2">
                  <Label>Datas</Label>
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      value={dateInput}
                      onChange={(e) => setDateInput(e.target.value)}
                      min={formatInTimeZone(new Date(), TIMEZONE, "yyyy-MM-dd")}
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
                  <div className="space-y-2">
                    <Label>Repetir por quantas semanas?</Label>
                    <Select value={weeksAhead} onValueChange={setWeeksAhead}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 semana</SelectItem>
                        <SelectItem value="2">2 semanas</SelectItem>
                        <SelectItem value="4">4 semanas</SelectItem>
                        <SelectItem value="8">8 semanas</SelectItem>
                        <SelectItem value="12">12 semanas</SelectItem>
                        <SelectItem value="52">Sempre</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {selectedWeekdays.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {weeksAhead === "52" ? "Bloqueio permanente" : `${generateWeekdayDates().length} dia(s) serão bloqueados`}: {selectedWeekdays.map(w => WEEKDAY_LABELS[parseInt(w)].full).join(", ")}
                    </p>
                  )}
                </div>
              )}

              {/* Full Day Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Dia inteiro</Label>
                  <p className="text-sm text-muted-foreground">
                    Bloquear o dia completo
                  </p>
                </div>
                <Switch
                  checked={isFullDay}
                  onCheckedChange={setIsFullDay}
                />
              </div>

              {/* Time Selection */}
              {!isFullDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
                  </div>
                </div>
              )}

              {/* Staff Selection */}
              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os profissionais</SelectItem>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Textarea
                  placeholder="Ex: Feriado, viagem, manutenção..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="resize-none"
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleCreateBlock} disabled={saving || totalBlocks === 0}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  `Criar Bloqueio${weeksAhead === "52" ? "" : totalBlocks > 1 ? ` (${totalBlocks} dias)` : ""}`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Blocks List */}
      {blocks.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarOff className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum bloqueio</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Adicione bloqueios para fechar dias ou horários específicos da sua agenda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <BlocksList
          blocks={blocks}
          staff={staff}
          formatBlockDateTime={formatBlockDateTime}
          getStaffName={getStaffName}
          onDelete={handleDeleteBlock}
        />
      )}
    </div>
  );
}

/* ── Compact grouped list ── */

const INITIAL_VISIBLE = 5;

function BlocksList({
  blocks,
  staff,
  formatBlockDateTime,
  getStaffName,
  onDelete,
}: {
  blocks: Block[];
  staff: Staff[];
  formatBlockDateTime: (s: string, e: string) => { date: string; time: string; isFullDay: boolean };
  getStaffName: (id: string | null) => string;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  // Group blocks by month
  const grouped = blocks.reduce<Record<string, Block[]>>((acc, block) => {
    const key = formatInTimeZone(parseISO(block.starts_at), TIMEZONE, "yyyy-MM");
    if (!acc[key]) acc[key] = [];
    acc[key].push(block);
    return acc;
  }, {});

  const monthKeys = Object.keys(grouped).sort();
  const totalCount = blocks.length;

  // Flatten for limiting
  const allOrdered = monthKeys.flatMap(k => grouped[k]);
  const visibleBlocks = expanded ? allOrdered : allOrdered.slice(0, INITIAL_VISIBLE);
  const hasMore = totalCount > INITIAL_VISIBLE;

  // Rebuild grouped from visible
  const visibleGrouped = visibleBlocks.reduce<Record<string, Block[]>>((acc, block) => {
    const key = formatInTimeZone(parseISO(block.starts_at), TIMEZONE, "yyyy-MM");
    if (!acc[key]) acc[key] = [];
    acc[key].push(block);
    return acc;
  }, {});

  const visibleMonthKeys = Object.keys(visibleGrouped).sort();

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {totalCount} bloqueio{totalCount !== 1 ? "s" : ""} ativo{totalCount !== 1 ? "s" : ""}
      </p>

      {visibleMonthKeys.map(monthKey => {
        const monthLabel = formatInTimeZone(
          parseISO(`${monthKey}-01T12:00:00Z`),
          TIMEZONE,
          "MMMM 'de' yyyy",
          { locale: ptBR }
        );

        return (
          <Card key={monthKey}>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold capitalize text-muted-foreground">
                {monthLabel} ({visibleGrouped[monthKey].length})
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <div className="divide-y divide-border">
                {visibleGrouped[monthKey].map(block => {
                  const { date, time, isFullDay: fd } = formatBlockDateTime(block.starts_at, block.ends_at);
                  return (
                    <div key={block.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-8 h-8 rounded-md flex-shrink-0 flex items-center justify-center ${
                          fd ? "bg-destructive/10" : "bg-amber-500/10"
                        }`}>
                          {fd ? (
                            <Ban className="h-4 w-4 text-destructive" />
                          ) : (
                            <Clock className="h-4 w-4 text-amber-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium capitalize truncate">{date}</span>
                            <Badge variant={fd ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                              {time}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {getStaffName(block.staff_id)}
                            {block.reason && ` · ${block.reason}`}
                          </p>
                        </div>
                      </div>

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remover bloqueio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Essa ação não pode ser desfeita. O período ficará disponível novamente para agendamentos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => onDelete(block.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remover
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {hasMore && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => setExpanded(prev => !prev)}
        >
          {expanded ? "Mostrar menos" : `Ver todos os ${totalCount} bloqueios`}
        </Button>
      )}
    </div>
  );
}
