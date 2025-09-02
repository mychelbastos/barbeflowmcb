import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Scissors, 
  Clock,
  DollarSign,
  Palette
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const serviceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  duration_minutes: z.number().min(15, "Duração mínima de 15 minutos"),
  price_cents: z.number().min(0, "Preço deve ser positivo"),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function Services() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);

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

  useEffect(() => {
    if (currentTenant) {
      loadServices();
    }
  }, [currentTenant]);

  const loadServices = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', currentTenant.id)
        .order('name');

      if (error) throw error;

      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar serviços",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: ServiceFormData) => {
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('services')
          .update(values)
          .eq('id', editingService.id);

        if (error) throw error;

        toast({
          title: "Serviço atualizado",
          description: `${values.name} foi atualizado com sucesso.`,
        });
      } else {
        // Create new service
        const { error } = await supabase
          .from('services')
          .insert({
            ...values,
            tenant_id: currentTenant.id,
          });

        if (error) throw error;

        toast({
          title: "Serviço criado",
          description: `${values.name} foi adicionado com sucesso.`,
        });
      }

      form.reset();
      setShowForm(false);
      setEditingService(null);
      loadServices();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar serviço",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const handleEdit = (service: any) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      duration_minutes: service.duration_minutes,
      price_cents: service.price_cents,
      color: service.color,
      active: service.active,
    });
    setShowForm(true);
  };

  const handleDelete = async (service: any) => {
    if (!confirm(`Tem certeza que deseja excluir o serviço "${service.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Serviço excluído",
        description: `${service.name} foi removido.`,
      });

      loadServices();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir serviço",
        variant: "destructive",
      });
    }
  };

  const toggleServiceStatus = async (service: any) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ active: !service.active })
        .eq('id', service.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Serviço ${!service.active ? 'ativado' : 'desativado'} com sucesso.`,
      });

      loadServices();
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
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
          <p className="text-muted-foreground">
            Gerencie os serviços oferecidos pela barbearia
          </p>
        </div>
        
        <Button
          onClick={() => {
            setEditingService(null);
            form.reset();
            setShowForm(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Serviço
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${service.color}20`,
                    color: service.color 
                  }}
                >
                  <Scissors className="h-6 w-6" />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => toggleServiceStatus(service)}
                  />
                  <Badge variant={service.active ? "default" : "secondary"}>
                    {service.active ? "Ativo" : "Inativo"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">{service.name}</h3>
                  {service.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {service.description}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center text-muted-foreground">
                    <Clock className="h-4 w-4 mr-1" />
                    {service.duration_minutes}min
                  </div>
                  <div className="flex items-center font-semibold text-success">
                    <DollarSign className="h-4 w-4 mr-1" />
                    R$ {(service.price_cents / 100).toFixed(2)}
                  </div>
                </div>
                
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="flex items-center">
                    <Palette className="h-4 w-4 mr-2 text-muted-foreground" />
                    <div 
                      className="w-4 h-4 rounded-full border border-border"
                      style={{ backgroundColor: service.color }}
                    />
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(service)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(service)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {services.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="text-center py-12">
              <Scissors className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum serviço cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione o primeiro serviço da sua barbearia
              </p>
              <Button
                onClick={() => {
                  setEditingService(null);
                  form.reset();
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Serviço
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Service Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Editar Serviço' : 'Novo Serviço'}
            </DialogTitle>
            <DialogDescription>
              {editingService ? 'Atualize as informações do serviço' : 'Adicione um novo serviço ao catálogo'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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

              <div className="grid grid-cols-2 gap-4">
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
                        <Input 
                          type="number"
                          min={0}
                          step={0.01}
                          placeholder="0.00"
                          {...field}
                          onChange={(e) => field.onChange(Math.round(parseFloat(e.target.value || "0") * 100))}
                          value={field.value ? (field.value / 100).toFixed(2) : ""}
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

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? "Salvando..." : editingService ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}