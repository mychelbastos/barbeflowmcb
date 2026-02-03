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
import { 
  Plus, 
  Calendar, 
  Clock, 
  Trash2, 
  Loader2,
  CalendarOff,
  Ban
} from "lucide-react";
import { format, parseISO, isBefore, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  const [blockDate, setBlockDate] = useState("");
  const [isFullDay, setIsFullDay] = useState(true);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [reason, setReason] = useState("");

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

  const handleCreateBlock = async () => {
    if (!blockDate) {
      toast({
        title: "Erro",
        description: "Selecione uma data",
        variant: "destructive",
      });
      return;
    }

    try {
      setSaving(true);

      let startsAt: string;
      let endsAt: string;

      if (isFullDay) {
        // Full day block: from 00:00 to 23:59
        startsAt = `${blockDate}T00:00:00`;
        endsAt = `${blockDate}T23:59:59`;
      } else {
        // Partial block with specific times
        startsAt = `${blockDate}T${startTime}:00`;
        endsAt = `${blockDate}T${endTime}:00`;
      }

      const { error } = await supabase
        .from('blocks')
        .insert({
          tenant_id: tenantId,
          staff_id: selectedStaff === "all" ? null : selectedStaff,
          starts_at: startsAt,
          ends_at: endsAt,
          reason: reason || null,
        });

      if (error) throw error;

      toast({
        title: "Bloqueio criado",
        description: "O bloqueio foi adicionado com sucesso.",
      });

      // Reset form and close dialog
      setBlockDate("");
      setIsFullDay(true);
      setStartTime("09:00");
      setEndTime("18:00");
      setSelectedStaff("all");
      setReason("");
      setDialogOpen(false);
      
      // Reload blocks
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
    
    const startHours = start.getHours();
    const startMinutes = start.getMinutes();
    const endHours = end.getHours();
    const endMinutes = end.getMinutes();
    
    // Check if it's a full day block (00:00 to 23:59)
    const isFullDay = startHours === 0 && startMinutes === 0 && 
                      endHours === 23 && endMinutes === 59;
    
    const dateStr = format(start, "EEEE, d 'de' MMMM", { locale: ptBR });
    
    if (isFullDay) {
      return { date: dateStr, time: "Dia inteiro", isFullDay: true };
    }
    
    const timeStr = `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`;
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
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Criar Bloqueio</DialogTitle>
              <DialogDescription>
                Bloqueie um dia inteiro ou horários específicos
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              {/* Date Selection */}
              <div className="space-y-2">
                <Label>Data</Label>
                <Input
                  type="date"
                  value={blockDate}
                  onChange={(e) => setBlockDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                />
              </div>

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

              {/* Time Selection (only if not full day) */}
              {!isFullDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Início</Label>
                    <Input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fim</Label>
                    <Input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                    />
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
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
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
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateBlock} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Bloqueio"
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
        <div className="space-y-3">
          {blocks.map((block) => {
            const { date, time, isFullDay } = formatBlockDateTime(block.starts_at, block.ends_at);
            
            return (
              <Card key={block.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isFullDay ? 'bg-destructive/10' : 'bg-amber-500/10'
                    }`}>
                      {isFullDay ? (
                        <Ban className="h-5 w-5 text-destructive" />
                      ) : (
                        <Clock className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium capitalize">{date}</p>
                        <Badge variant={isFullDay ? "destructive" : "secondary"}>
                          {time}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-sm text-muted-foreground">
                          {getStaffName(block.staff_id)}
                        </p>
                        {block.reason && (
                          <>
                            <span className="text-muted-foreground">•</span>
                            <p className="text-sm text-muted-foreground">
                              {block.reason}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-4 w-4" />
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
                          onClick={() => handleDeleteBlock(block.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
