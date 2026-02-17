import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Clock, Plus, Edit, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Schedule {
  id: string;
  weekday: number;
  start_time: string;
  end_time: string;
  break_start?: string;
  break_end?: string;
  active: boolean;
}

interface StaffScheduleManagerProps {
  staffId: string;
  staffName: string;
}

const WEEKDAYS = [
  "Domingo",
  "Segunda-feira", 
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado"
];

export const StaffScheduleManager = ({ staffId, staffName }: StaffScheduleManagerProps) => {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    weekdays: [] as number[],
    start_time: "09:00",
    end_time: "18:00",
    break_start: "",
    break_end: "",
    active: true
  });

  useEffect(() => {
    if (staffId && currentTenant) {
      loadSchedules();
    }
  }, [staffId, currentTenant]);

  const loadSchedules = async () => {
    if (!currentTenant || !staffId) {
      console.log('Missing tenant or staffId:', { currentTenant: !!currentTenant, staffId });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log('Loading schedules for staff:', staffId, 'tenant:', currentTenant.id);
      
      const { data, error } = await supabase
        .from('schedules')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .eq('staff_id', staffId)
        .order('weekday');

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Loaded schedules:', data);
      setSchedules(data || []);
    } catch (error) {
      console.error('Error loading schedules:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar horários",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      // Validate times
      if (formData.start_time >= formData.end_time) {
        toast({
          title: "Erro",
          description: "O horário de início deve ser anterior ao horário de fim",
          variant: "destructive",
        });
        return;
      }

      if (formData.break_start && formData.break_end) {
        if (formData.break_start >= formData.break_end) {
          toast({
            title: "Erro",
            description: "O início do intervalo deve ser anterior ao fim do intervalo",
            variant: "destructive",
          });
          return;
        }
      }

      // Check if schedule already exists for any of the selected weekdays
      const conflictingDays = [];
      for (const weekday of formData.weekdays) {
        const existingSchedule = schedules.find(s => 
          s.weekday === weekday && s.id !== editingSchedule?.id
        );
        if (existingSchedule) {
          conflictingDays.push(WEEKDAYS[weekday]);
        }
      }

      if (conflictingDays.length > 0) {
        toast({
          title: "Erro",
          description: `Já existem horários para: ${conflictingDays.join(', ')}`,
          variant: "destructive",
        });
        return;
      }

      // If editing, update single schedule
      if (editingSchedule) {
        const scheduleData = {
          tenant_id: currentTenant.id,
          staff_id: staffId,
          weekday: formData.weekdays[0], // editing only affects one day
          start_time: formData.start_time,
          end_time: formData.end_time,
          break_start: formData.break_start || null,
          break_end: formData.break_end || null,
          active: formData.active
        };

        const { error } = await supabase
          .from('schedules')
          .update(scheduleData)
          .eq('id', editingSchedule.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Horário atualizado com sucesso",
        });
      } else {
        // If creating new, create for all selected weekdays
        const schedulesToInsert = formData.weekdays.map(weekday => ({
          tenant_id: currentTenant.id,
          staff_id: staffId,
          weekday,
          start_time: formData.start_time,
          end_time: formData.end_time,
          break_start: formData.break_start || null,
          break_end: formData.break_end || null,
          active: formData.active
        }));

        const { error } = await supabase
          .from('schedules')
          .insert(schedulesToInsert);

        if (error) throw error;

        const dayNames = formData.weekdays.map(w => WEEKDAYS[w]).join(', ');
        toast({
          title: "Sucesso",
          description: `Horários adicionados para: ${dayNames}`,
        });
      }

      setShowForm(false);
      setEditingSchedule(null);
      setFormData({
        weekdays: [],
        start_time: "09:00",
        end_time: "18:00",
        break_start: "",
        break_end: "",
        active: true
      });
      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar horário",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      weekdays: [schedule.weekday], // editing only one day
      start_time: schedule.start_time,
      end_time: schedule.end_time,
      break_start: schedule.break_start || "",
      break_end: schedule.break_end || "",
      active: schedule.active
    });
    setShowForm(true);
  };

  const handleDelete = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Horário excluído com sucesso",
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir horário",
        variant: "destructive",
      });
    }
  };

  const toggleScheduleStatus = async (schedule: Schedule) => {
    try {
      const { error } = await supabase
        .from('schedules')
        .update({ active: !schedule.active })
        .eq('id', schedule.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: `Horário ${!schedule.active ? 'ativado' : 'desativado'} com sucesso`,
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="h-32 bg-muted rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Horários de Trabalho
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure os horários de trabalho de {staffName}
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => {
                setEditingSchedule(null);
                setFormData({
                  weekdays: [],
                  start_time: "09:00",
                  end_time: "18:00",
                  break_start: "",
                  break_end: "",
                  active: true
                });
                setShowForm(true);
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Horário
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {schedules.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-2">Nenhum horário configurado</p>
              <p className="text-sm">
                Configure os horários de trabalho para permitir agendamentos
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => (
                <div key={schedule.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Badge variant={schedule.active ? "default" : "secondary"}>
                      {WEEKDAYS[schedule.weekday]}
                    </Badge>
                    <div className="text-sm">
                      <span className="font-medium">
                        {schedule.start_time} - {schedule.end_time}
                      </span>
                      {schedule.break_start && schedule.break_end && (
                        <span className="ml-2 text-muted-foreground">
                          (Intervalo: {schedule.break_start} - {schedule.break_end})
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={schedule.active}
                      onCheckedChange={() => toggleScheduleStatus(schedule)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(schedule)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir horário?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Deseja excluir o horário de {WEEKDAYS[schedule.weekday]}? Essa ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(schedule.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingSchedule ? 'Editar Horário' : 'Novo Horário'}
            </DialogTitle>
            <DialogDescription>
              Configure o horário de trabalho para {staffName}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-sm font-medium">
                {editingSchedule ? 'Dia da Semana' : 'Dias da Semana'}
              </Label>
              <p className="text-xs text-muted-foreground mb-3">
                {editingSchedule 
                  ? 'Dia que será editado' 
                  : 'Selecione os dias que terão o mesmo horário'
                }
              </p>
              
              {editingSchedule ? (
                // Single day selector for editing
                <select
                  className="w-full mt-1 p-2 border border-border rounded-md bg-background"
                  value={formData.weekdays[0] || 0}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    weekdays: [parseInt(e.target.value)] 
                  })}
                >
                  {WEEKDAYS.map((day, index) => (
                    <option key={index} value={index}>
                      {day}
                    </option>
                  ))}
                </select>
              ) : (
              // Multiple day checkboxes for creating
                <>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { label: "Seg-Sex", days: [1, 2, 3, 4, 5] },
                    { label: "Seg-Sáb", days: [1, 2, 3, 4, 5, 6] },
                    { label: "Todos", days: [0, 1, 2, 3, 4, 5, 6] },
                  ].map(({ label, days }) => {
                    const availableDays = days.filter(d => !schedules.some(s => s.weekday === d));
                    const allSelected = availableDays.length > 0 && availableDays.every(d => formData.weekdays.includes(d));
                    return (
                      <Button
                        key={label}
                        type="button"
                        variant={allSelected ? "default" : "outline"}
                        size="sm"
                        disabled={availableDays.length === 0}
                        onClick={() => {
                          if (allSelected) {
                            setFormData({ ...formData, weekdays: formData.weekdays.filter(w => !availableDays.includes(w)) });
                          } else {
                            setFormData({ ...formData, weekdays: [...new Set([...formData.weekdays, ...availableDays])] });
                          }
                        }}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {WEEKDAYS.map((day, index) => {
                    const hasExistingSchedule = schedules.some(s => s.weekday === index);
                    return (
                      <div key={index} className="flex items-center space-x-2">
                        <Checkbox
                          id={`weekday-${index}`}
                          checked={formData.weekdays.includes(index)}
                          disabled={hasExistingSchedule}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                weekdays: [...formData.weekdays, index]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                weekdays: formData.weekdays.filter(w => w !== index)
                              });
                            }
                          }}
                        />
                        <label 
                          htmlFor={`weekday-${index}`}
                          className={`text-sm cursor-pointer ${
                            hasExistingSchedule 
                              ? 'text-muted-foreground line-through' 
                              : ''
                          }`}
                        >
                          {day}
                          {hasExistingSchedule && (
                            <span className="ml-1 text-xs">(já configurado)</span>
                          )}
                        </label>
                      </div>
                    );
                  })}
                </div>
                </>
              )}
              
              {!editingSchedule && formData.weekdays.length === 0 && (
                <p className="text-xs text-destructive mt-2">
                  Selecione pelo menos um dia da semana
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Hora de Início</Label>
                <Input
                  id="start_time"
                  type="time"
                  value={formData.start_time}
                  onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">Hora de Fim</Label>
                <Input
                  id="end_time"
                  type="time"
                  value={formData.end_time}
                  onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="break_start">Início do Intervalo (opcional)</Label>
                <Input
                  id="break_start"
                  type="time"
                  value={formData.break_start}
                  onChange={(e) => setFormData({ ...formData, break_start: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="break_end">Fim do Intervalo (opcional)</Label>
                <Input
                  id="break_end"
                  type="time"
                  value={formData.break_end}
                  onChange={(e) => setFormData({ ...formData, break_end: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Horário ativo</Label>
            </div>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading || (!editingSchedule && formData.weekdays.length === 0)}>
                {formLoading ? "Salvando..." : editingSchedule ? "Atualizar" : "Adicionar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
};