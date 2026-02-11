import { useState, useEffect, useCallback } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus, Loader2, Trash2, Pencil, UserCheck, Clock, CalendarClock, Ban
} from "lucide-react";

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
const WEEKDAY_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

interface RecurringClient {
  id: string;
  tenant_id: string;
  staff_id: string;
  service_id: string | null;
  customer_id: string;
  weekday: number;
  start_time: string;
  duration_minutes: number;
  start_date: string;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: { name: string; phone: string } | null;
}

interface Staff {
  id: string;
  name: string;
}

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
}

export default function RecurringClients() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();

  const [records, setRecords] = useState<RecurringClient[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("09:00");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [isActive, setIsActive] = useState(true);
  const [notes, setNotes] = useState("");

  const loadData = useCallback(async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [recRes, staffRes, svcRes, custRes] = await Promise.all([
        supabase
          .from("recurring_clients")
          .select("*, customer:customers(name, phone)")
          .eq("tenant_id", currentTenant.id)
          .order("weekday")
          .order("start_time"),
        supabase
          .from("staff")
          .select("id, name")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
        supabase
          .from("services")
          .select("id, name, duration_minutes, price_cents")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
        supabase
          .from("customers")
          .select("id, name, phone")
          .eq("tenant_id", currentTenant.id)
          .order("name"),
      ]);
      if (recRes.error) throw recRes.error;
      if (staffRes.error) throw staffRes.error;
      if (svcRes.error) throw svcRes.error;
      if (custRes.error) throw custRes.error;
      setRecords((recRes.data as any) || []);
      setStaff(staffRes.data || []);
      setServices(svcRes.data || []);
      setCustomers(custRes.data || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: "Erro ao carregar clientes fixos", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [currentTenant, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setSelectedCustomer("");
    setSelectedStaff("");
    setSelectedService("");
    setWeekday("1");
    setStartTime("09:00");
    setStartDate(new Date().toISOString().slice(0, 10));
    setIsActive(true);
    setNotes("");
    setEditingId(null);
  };

  const openEdit = (r: RecurringClient) => {
    setEditingId(r.id);
    setSelectedCustomer(r.customer_id);
    setSelectedStaff(r.staff_id);
    setSelectedService(r.service_id || "");
    setWeekday(String(r.weekday));
    setStartTime(r.start_time.slice(0, 5));
    setStartDate(r.start_date);
    setIsActive(r.active);
    setNotes(r.notes || "");
    setDialogOpen(true);
  };

  const getServiceDuration = (serviceId: string): number => {
    return services.find(s => s.id === serviceId)?.duration_minutes || 30;
  };

  const handleSave = async () => {
    if (!currentTenant) return;
    if (!selectedCustomer || !selectedStaff || !selectedService) {
      toast({ title: "Erro", description: "Preencha cliente, profissional e serviço", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const duration = getServiceDuration(selectedService);
      const payload = {
        tenant_id: currentTenant.id,
        staff_id: selectedStaff,
        service_id: selectedService,
        customer_id: selectedCustomer,
        weekday: Number(weekday),
        start_time: startTime,
        duration_minutes: duration,
        start_date: startDate,
        active: isActive,
        notes: notes.trim() || null,
      };

      if (editingId) {
        const { error } = await supabase.from("recurring_clients").update(payload).eq("id", editingId);
        if (error) throw error;
        toast({ title: "Atualizado", description: "Cliente fixo atualizado com sucesso." });
      } else {
        const { error } = await supabase.from("recurring_clients").insert(payload);
        if (error) {
          if (error.code === "23505") {
            toast({ title: "Conflito", description: "Já existe um cliente fixo ativo nesse dia/horário para este profissional.", variant: "destructive" });
            return;
          }
          throw error;
        }
        toast({ title: "Criado", description: "Cliente fixo adicionado com sucesso." });
      }

      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err.message || "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (r: RecurringClient) => {
    try {
      const { error } = await supabase
        .from("recurring_clients")
        .update({ active: !r.active })
        .eq("id", r.id);
      if (error) {
        if (error.code === "23505") {
          toast({ title: "Conflito", description: "Já existe um cliente fixo ativo nesse dia/horário.", variant: "destructive" });
          return;
        }
        throw error;
      }
      toast({ title: r.active ? "Desativado" : "Ativado", description: `Cliente fixo ${r.active ? "desativado" : "ativado"}.` });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("recurring_clients").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removido", description: "Cliente fixo removido com sucesso." });
      loadData();
    } catch (err: any) {
      console.error(err);
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const getStaffName = (staffId: string) => staff.find((s) => s.id === staffId)?.name || "Profissional";
  const getServiceName = (serviceId: string | null) => services.find((s) => s.id === serviceId)?.name || "—";

  if (tenantLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Clientes Fixos</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie horários recorrentes semanais para clientes fixos
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Novo Cliente Fixo
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar" : "Novo"} Cliente Fixo</DialogTitle>
              <DialogDescription>
                Defina a recorrência semanal para bloquear o horário na agenda
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} — {c.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Profissional</Label>
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o profissional" />
                  </SelectTrigger>
                  <SelectContent>
                    {staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Serviço</Label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name} ({s.duration_minutes}min — R$ {(s.price_cents / 100).toFixed(2)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedService && (
                  <p className="text-xs text-muted-foreground">
                    Duração: {getServiceDuration(selectedService)} minutos
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Dia da semana</Label>
                  <Select value={weekday} onValueChange={setWeekday}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {WEEKDAY_LABELS.map((label, i) => (
                        <SelectItem key={i} value={String(i)}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Horário</Label>
                  <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Início da recorrência</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base">Ativo</Label>
                  <p className="text-sm text-muted-foreground">Horário será bloqueado automaticamente</p>
                </div>
                <Switch checked={isActive} onCheckedChange={setIsActive} />
              </div>

              <div className="space-y-2">
                <Label>Observações (opcional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Ex: Corte + barba toda semana" className="resize-none" rows={2} />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Salvando...</> : editingId ? "Salvar" : "Criar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CalendarClock className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Nenhum cliente fixo</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Adicione clientes fixos para bloquear horários recorrentes semanais na agenda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {records.map((r) => (
            <Card key={r.id} className={!r.active ? "opacity-60" : ""}>
              <CardContent className="flex items-center justify-between p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${r.active ? "bg-emerald-500/10" : "bg-zinc-700/30"}`}>
                    <UserCheck className={`h-5 w-5 ${r.active ? "text-emerald-500" : "text-zinc-500"}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-foreground truncate">{r.customer?.name || "Cliente"}</p>
                      <Badge variant={r.active ? "default" : "secondary"} className="text-xs">
                        {r.active ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {WEEKDAY_SHORT[r.weekday]} {r.start_time.slice(0, 5)} ({r.duration_minutes}min)
                      </span>
                      <span>•</span>
                      <span>{getServiceName(r.service_id)}</span>
                      <span>•</span>
                      <span>{getStaffName(r.staff_id)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => handleToggleActive(r)}>
                    <Ban className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground" onClick={() => openEdit(r)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover cliente fixo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          O horário ficará disponível novamente para novos agendamentos.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(r.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
