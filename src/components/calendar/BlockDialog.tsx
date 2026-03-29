import { useState } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Calendar, CalendarDays, X, AlertTriangle, Loader2 } from "lucide-react";
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

interface ConflictBooking {
  booking_id: string;
  customer_name: string;
  customer_phone: string;
  service_name: string;
  staff_name: string;
  starts_at: string;
  ends_at: string;
  has_subscription: boolean;
  status: string;
}

interface PendingBlockData {
  staff_id: string | null;
  starts_at: string;
  ends_at: string;
  reason: string | null;
}

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
  const queryClient = useQueryClient();
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
  const [checking, setChecking] = useState(false);

  // Conflict dialog state
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false);
  const [conflictingBookings, setConflictingBookings] = useState<ConflictBooking[]>([]);
  const [pendingBlocks, setPendingBlocks] = useState<PendingBlockData[]>([]);
  const [notifyCustomers, setNotifyCustomers] = useState(true);

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

  const formatTimeBR = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
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

  const buildBlockRows = (): PendingBlockData[] => {
    const targetDates = mode === "dates" ? dates : generateWeekdayDates();
    const sTime = allDay ? "00:00" : startTime;
    const eTime = allDay ? "23:59" : endTime;

    return targetDates.map(date => ({
      staff_id: staffId === "all" ? null : staffId,
      starts_at: `${date}T${sTime}:00-03:00`,
      ends_at: `${date}T${eTime}:00-03:00`,
      reason: reason || null,
    }));
  };

  const handleSave = async () => {
    if (!currentTenant) return;

    const targetDates = mode === "dates" ? dates : generateWeekdayDates();
    if (targetDates.length === 0) {
      toast({ title: "Selecione ao menos uma data ou dia da semana", variant: "destructive" });
      return;
    }

    const blocks = buildBlockRows();
    setChecking(true);

    try {
      // Check conflicts for all blocks
      const allConflicts: ConflictBooking[] = [];
      const seenIds = new Set<string>();

      for (const block of blocks) {
        const { data, error } = await supabase.rpc("preview_block_conflicts", {
          p_tenant_id: currentTenant.id,
          p_staff_id: block.staff_id ?? "",
          p_starts_at: block.starts_at,
          p_ends_at: block.ends_at,
        });
        if (error) throw error;
        if (data) {
          for (const c of data) {
            if (!seenIds.has(c.booking_id)) {
              seenIds.add(c.booking_id);
              allConflicts.push(c);
            }
          }
        }
      }

      if (allConflicts.length > 0) {
        setConflictingBookings(allConflicts);
        setPendingBlocks(blocks);
        setConflictDialogOpen(true);
      } else {
        // No conflicts — create blocks directly (old insert flow)
        await createBlocksDirect(blocks);
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar conflitos", description: err.message, variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  /** Old flow: simple insert without cancellation */
  const createBlocksDirect = async (blocks: PendingBlockData[]) => {
    if (!currentTenant) return;
    setSaving(true);
    try {
      const rows = blocks.map(b => ({
        tenant_id: currentTenant.id,
        staff_id: b.staff_id,
        starts_at: b.starts_at,
        ends_at: b.ends_at,
        reason: b.reason,
      }));
      const { error } = await supabase.from("blocks").insert(rows);
      if (error) throw error;

      toast({ title: "Bloqueio criado", description: `${blocks.length} dia(s) bloqueado(s) com sucesso` });
      queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
      onCreated();
      onOpenChange(false);
      resetForm();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar bloqueio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  /** New flow: create block via RPC with optional cancellation */
  const createBlockWithCancel = async (cancelBookings: boolean, notify: boolean) => {
    if (!currentTenant) return;
    setConflictDialogOpen(false);
    setSaving(true);

    try {
      let totalCancelled = 0;
      const allCancelledIds: string[] = [];

      for (const block of pendingBlocks) {
        const { data, error } = await supabase.rpc("create_block_and_cancel_bookings", {
          p_tenant_id: currentTenant.id,
          p_staff_id: block.staff_id ?? "",
          p_starts_at: block.starts_at,
          p_ends_at: block.ends_at,
          p_reason: block.reason ?? "",
          p_cancel_bookings: cancelBookings,
          p_notify_customers: notify,
        });
        if (error) throw error;

        const result = data as any;
        if (result?.cancelled_count) totalCancelled += result.cancelled_count;
        if (result?.cancelled_booking_ids) allCancelledIds.push(...result.cancelled_booking_ids);
      }

      // Send WhatsApp notifications if requested
      if (notify && allCancelledIds.length > 0) {
        for (const bookingId of allCancelledIds) {
          supabase.functions.invoke("send-whatsapp-notification", {
            body: {
              type: "booking_cancelled",
              booking_id: bookingId,
              tenant_id: currentTenant.id,
            },
          }).catch(() => {}); // fire-and-forget
        }
      }

      toast({
        title: "Bloqueio criado",
        description: cancelBookings
          ? `${pendingBlocks.length} dia(s) bloqueado(s). ${totalCancelled} agendamento(s) cancelado(s).`
          : `${pendingBlocks.length} dia(s) bloqueado(s) com sucesso.`,
      });

      queryClient.invalidateQueries({ queryKey: ["staff-bookings"] });
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
    setConflictingBookings([]);
    setPendingBlocks([]);
    setNotifyCustomers(true);
  };

  const totalBlocks = mode === "dates" ? dates.length : generateWeekdayDates().length;

  return (
    <>
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
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addDate(); } }}
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
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving || checking}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving || checking || totalBlocks === 0}>
              {checking ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Verificando...</>
              ) : saving ? (
                "Salvando..."
              ) : (
                `Bloquear ${weeksAhead === "52" ? "" : totalBlocks > 1 ? `(${totalBlocks} dias)` : ""}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict confirmation dialog */}
      <AlertDialog open={conflictDialogOpen} onOpenChange={setConflictDialogOpen}>
        <AlertDialogContent className="sm:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              {conflictingBookings.length} agendamento(s) neste período
            </AlertDialogTitle>
            <AlertDialogDescription>
              Os seguintes clientes serão afetados pelo bloqueio:
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="max-h-64 overflow-y-auto space-y-2 my-4">
            {conflictingBookings.map(booking => (
              <div
                key={booking.booking_id}
                className="flex justify-between items-center p-2 bg-muted/50 rounded-lg text-sm"
              >
                <div>
                  <div className="font-medium text-foreground">{booking.customer_name}</div>
                  <div className="text-muted-foreground text-xs">
                    {booking.service_name} • {booking.staff_name}
                  </div>
                </div>
                <div className="text-muted-foreground text-xs">
                  {formatTimeBR(booking.starts_at)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 mb-2">
            <Checkbox
              id="notify-cancel"
              checked={notifyCustomers}
              onCheckedChange={(v) => setNotifyCustomers(!!v)}
            />
            <label htmlFor="notify-cancel" className="text-sm text-foreground cursor-pointer">
              Enviar notificação de cancelamento via WhatsApp
            </label>
          </div>

          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => createBlockWithCancel(false, false)}
              disabled={saving}
            >
              Apenas bloquear
            </Button>
            <Button
              variant="destructive"
              onClick={() => createBlockWithCancel(true, notifyCustomers)}
              disabled={saving}
            >
              {saving ? (
                <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Processando...</>
              ) : (
                `Bloquear e cancelar (${conflictingBookings.length})`
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
