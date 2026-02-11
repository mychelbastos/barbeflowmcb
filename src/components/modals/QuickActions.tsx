import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

// Schemas
const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  duration_minutes: z.number().min(15, "Duração mínima de 15 minutos"),
  price_cents: z.number().min(0, "Preço deve ser positivo"),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean(),
});

const staffSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  bio: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean(),
});

const blockSchema = z.object({
  reason: z.string().min(1, "Motivo é obrigatório"),
  starts_at: z.string().min(1, "Data/hora inicial é obrigatória"),
  ends_at: z.string().min(1, "Data/hora final é obrigatória"),
  staff_id: z.string().optional(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;
type StaffFormData = z.infer<typeof staffSchema>;
type BlockFormData = z.infer<typeof blockSchema>;

interface QuickActionsProps {
  onSuccess?: () => void;
}

// Service Modal
export function NewServiceModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration_minutes: 30,
      price_cents: 0,
      color: "#3B82F6",
      active: true,
    },
  });

  const onSubmit = async (values: ServiceFormData) => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { error } = await supabase.from('services').insert({
        ...values,
        tenant_id: currentTenant.id,
      });

      if (error) throw error;

      toast({
        title: "Serviço criado",
        description: `${values.name} foi adicionado com sucesso.`,
      });
      
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar serviço",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Novo Serviço
          </DialogTitle>
          <DialogDescription>
            Adicione um novo serviço ao seu catálogo
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Corte + Barba" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descrição do serviço..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (min) *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min={15}
                        step={15}
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price_cents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <CurrencyInput
                        value={field.value ? (field.value / 100).toFixed(2) : ""}
                        onChange={(v) => field.onChange(Math.round(parseFloat(v || "0") * 100))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input type="color" className="w-16 h-10" {...field} />
                    </FormControl>
                    <Input 
                      placeholder="#3B82F6" 
                      className="flex-1"
                      {...field}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Serviço Ativo</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Serviços ativos ficam visíveis para agendamento
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Criar Serviço
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Staff Modal  
export function NewStaffModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      bio: "",
      color: "#10B981",
      active: true,
    },
  });

  const onSubmit = async (values: StaffFormData) => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { error } = await supabase.from('staff').insert({
        ...values,
        tenant_id: currentTenant.id,
      });

      if (error) throw error;

      toast({
        title: "Profissional adicionado",
        description: `${values.name} foi adicionado à equipe.`,
      });
      
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao adicionar profissional",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Adicionar Profissional
          </DialogTitle>
          <DialogDescription>
            Adicione um novo membro à sua equipe
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Especialidades, experiência..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cor do Perfil</FormLabel>
                  <div className="flex space-x-2">
                    <FormControl>
                      <Input type="color" className="w-16 h-10" {...field} />
                    </FormControl>
                    <Input 
                      placeholder="#10B981" 
                      className="flex-1"
                      {...field}
                    />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between">
                  <div>
                    <FormLabel>Profissional Ativo</FormLabel>
                    <p className="text-xs text-muted-foreground">
                      Profissionais ativos ficam disponíveis para agendamento
                    </p>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Block Modal
export function BlockTimeModal({ 
  open, 
  onOpenChange, 
  onSuccess 
}: { 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [staff, setStaff] = useState<any[]>([]);

  const form = useForm<BlockFormData>({
    resolver: zodResolver(blockSchema),
    defaultValues: {
      reason: "",
      starts_at: "",
      ends_at: "",
      staff_id: "",
    },
  });

  // Load staff when modal opens
  useEffect(() => {
    if (open && currentTenant) {
      loadStaff();
    }
  }, [open, currentTenant]);

  const loadStaff = async () => {
    if (!currentTenant) return;

    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_id', currentTenant.id)
      .eq('active', true);

    setStaff(data || []);
  };

  const onSubmit = async (values: BlockFormData) => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { error } = await supabase.from('blocks').insert({
        tenant_id: currentTenant.id,
        staff_id: values.staff_id || null,
        reason: values.reason,
        starts_at: values.starts_at,
        ends_at: values.ends_at,
      });

      if (error) throw error;

      toast({
        title: "Horário bloqueado",
        description: "O período foi bloqueado com sucesso.",
      });
      
      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao bloquear horário",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            Bloquear Horário
          </DialogTitle>
          <DialogDescription>
            Bloqueie um período para manutenção ou ausência
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3 md:space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Almoço, Reunião..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staff_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos os profissionais" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos os profissionais</SelectItem>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <FormField
                control={form.control}
                name="starts_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ends_at"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim *</FormLabel>
                    <FormControl>
                      <Input 
                        type="datetime-local"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Bloquear
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}