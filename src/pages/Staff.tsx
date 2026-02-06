import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Palette,
  Scissors,
  Settings,
  Clock,
  Camera,
  Loader2
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
import { StaffScheduleManager } from "@/components/StaffScheduleManager";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const staffSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  bio: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean(),
});

const SUPABASE_URL = "https://iagzodcwctvydmgrwjsy.supabase.co";

type StaffFormData = z.infer<typeof staffSchema>;

export default function Staff() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingStaff, setEditingStaff] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedStaffForSchedule, setSelectedStaffForSchedule] = useState<any>(null);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      bio: "",
      color: "#10B981",
      active: true,
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadData();
    }
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const [staffRes, servicesRes] = await Promise.all([
        supabase
          .from('staff')
          .select(`
            *,
            staff_services:staff_services(service_id, commission_percent)
          `)
          .eq('tenant_id', currentTenant.id)
          .order('name'),
        
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name')
      ]);

      if (staffRes.error) throw staffRes.error;
      if (servicesRes.error) throw servicesRes.error;

      setStaff(staffRes.data || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const uploadPhoto = async (staffId: string): Promise<string | null> => {
    if (!photoFile || !currentTenant) return null;
    
    const fileExt = photoFile.name.split('.').pop();
    const filePath = `${currentTenant.id}/staff/${staffId}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from('tenant-media')
      .upload(filePath, photoFile, { upsert: true });
    
    if (error) throw error;
    
    return `${SUPABASE_URL}/storage/v1/object/public/tenant-media/${filePath}`;
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (values: StaffFormData) => {
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(values)
          .eq('id', editingStaff.id);

        if (error) throw error;

        // Upload photo if changed
        const photoUrl = await uploadPhoto(editingStaff.id);
        if (photoUrl) {
          await supabase.from('staff').update({ photo_url: photoUrl }).eq('id', editingStaff.id);
        }

        await updateStaffServices(editingStaff.id);

        toast({
          title: "Profissional atualizado",
          description: `${values.name} foi atualizado com sucesso.`,
        });
      } else {
        const { data: newStaff, error } = await supabase
          .from('staff')
          .insert({
            ...values,
            tenant_id: currentTenant.id,
          })
          .select()
          .single();

        if (error) throw error;

        if (newStaff) {
          const photoUrl = await uploadPhoto(newStaff.id);
          if (photoUrl) {
            await supabase.from('staff').update({ photo_url: photoUrl }).eq('id', newStaff.id);
          }
          await updateStaffServices(newStaff.id);
        }

        toast({
          title: "Profissional adicionado",
          description: `${values.name} foi adicionado à equipe.`,
        });
      }

      form.reset();
      setShowForm(false);
      setEditingStaff(null);
      setSelectedServices([]);
      setPhotoFile(null);
      setPhotoPreview(null);
      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao salvar profissional",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  const updateStaffServices = async (staffId: string) => {
    // Remove existing services
    await supabase
      .from('staff_services')
      .delete()
      .eq('staff_id', staffId);

    // Add selected services
    if (selectedServices.length > 0) {
      const staffServices = selectedServices.map(serviceId => ({
        staff_id: staffId,
        service_id: serviceId,
        commission_percent: null
      }));

      const { error } = await supabase
        .from('staff_services')
        .insert(staffServices);

      if (error) throw error;
    }
  };

  const handleEdit = (staffMember: any) => {
    setEditingStaff(staffMember);
    form.reset({
      name: staffMember.name,
      bio: staffMember.bio || "",
      color: staffMember.color,
      active: staffMember.active,
    });
    
    const memberServices = staffMember.staff_services?.map((ss: any) => ss.service_id) || [];
    setSelectedServices(memberServices);
    setPhotoFile(null);
    setPhotoPreview(staffMember.photo_url || null);
    
    setShowForm(true);
  };

  const handleDelete = async (staffMember: any) => {
    if (!confirm(`Tem certeza que deseja excluir "${staffMember.name}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffMember.id);

      if (error) throw error;

      toast({
        title: "Profissional excluído",
        description: `${staffMember.name} foi removido da equipe.`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir profissional",
        variant: "destructive",
      });
    }
  };

  const toggleStaffStatus = async (staffMember: any) => {
    try {
      const { error } = await supabase
        .from('staff')
        .update({ active: !staffMember.active })
        .eq('id', staffMember.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Profissional ${!staffMember.active ? 'ativado' : 'desativado'} com sucesso.`,
      });

      loadData();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar status",
        variant: "destructive",
      });
    }
  };

  const getStaffServices = (staffMember: any) => {
    if (!staffMember.staff_services) return [];
    
    return staffMember.staff_services
      .map((ss: any) => services.find(s => s.id === ss.service_id))
      .filter(Boolean);
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie a equipe da barbearia
          </p>
        </div>
        
        <Button
          onClick={() => {
            setEditingStaff(null);
            form.reset();
            setSelectedServices([]);
            setPhotoFile(null);
            setPhotoPreview(null);
            setShowForm(true);
          }}
          className="w-full sm:w-auto"
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Profissional
        </Button>
      </div>

      {/* Staff Grid */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {staff.map((staffMember) => {
          const memberServices = getStaffServices(staffMember);
          
          return (
            <Card key={staffMember.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <Avatar className="w-16 h-16">
                    {staffMember.photo_url ? (
                      <AvatarImage src={staffMember.photo_url} alt={staffMember.name} />
                    ) : null}
                    <AvatarFallback
                      style={{ backgroundColor: `${staffMember.color}20`, color: staffMember.color }}
                    >
                      <User className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={staffMember.active}
                      onCheckedChange={() => toggleStaffStatus(staffMember)}
                    />
                    <Badge variant={staffMember.active ? "default" : "secondary"}>
                      {staffMember.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{staffMember.name}</h3>
                    {staffMember.bio && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {staffMember.bio}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Serviços ({memberServices.length})
                    </Label>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {memberServices.length > 0 ? (
                        memberServices.slice(0, 3).map((service) => (
                          <Badge key={service.id} variant="outline" className="text-xs">
                            {service.name}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Todos os serviços
                        </span>
                      )}
                      {memberServices.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{memberServices.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center">
                      <Palette className="h-4 w-4 mr-2 text-muted-foreground" />
                      <div 
                        className="w-4 h-4 rounded-full border border-border"
                        style={{ backgroundColor: staffMember.color }}
                      />
                    </div>
                    
                    <div className="flex items-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedStaffForSchedule(staffMember);
                          setShowScheduleDialog(true);
                        }}
                        title="Configurar horários"
                      >
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(staffMember)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(staffMember)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {staff.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="text-center py-12">
              <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                Nenhum profissional cadastrado
              </h3>
              <p className="text-muted-foreground mb-4">
                Adicione o primeiro profissional da sua equipe
              </p>
              <Button
                onClick={() => {
                  setEditingStaff(null);
                  form.reset();
                  setSelectedServices([]);
                  setPhotoFile(null);
                  setPhotoPreview(null);
                  setShowForm(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Profissional
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Schedule Management Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Horários de Trabalho - {selectedStaffForSchedule?.name}
            </DialogTitle>
            <DialogDescription>
              Configure os horários de trabalho do profissional
            </DialogDescription>
          </DialogHeader>
          
          {selectedStaffForSchedule && (
            <StaffScheduleManager 
              staffId={selectedStaffForSchedule.id}
              staffName={selectedStaffForSchedule.name}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Staff Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingStaff ? 'Editar Profissional' : 'Novo Profissional'}
            </DialogTitle>
            <DialogDescription>
              {editingStaff ? 'Atualize as informações do profissional' : 'Adicione um novo membro à equipe'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              {/* Photo Upload */}
              <div className="flex flex-col items-center gap-3">
                <div 
                  className="relative w-20 h-20 rounded-full overflow-hidden cursor-pointer group"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <User className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-5 w-5 text-white" />
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {photoPreview ? 'Alterar foto' : 'Adicionar foto'}
                </button>
              </div>

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

              {/* Services Selection */}
              <div>
                <Label className="text-sm font-medium">Serviços</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  Selecione os serviços que este profissional pode realizar
                </p>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={service.id}
                        checked={selectedServices.includes(service.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedServices([...selectedServices, service.id]);
                          } else {
                            setSelectedServices(selectedServices.filter(id => id !== service.id));
                          }
                        }}
                      />
                      <label 
                        htmlFor={service.id}
                        className="text-sm cursor-pointer flex items-center"
                      >
                        <div 
                          className="w-3 h-3 rounded-full mr-2"
                          style={{ backgroundColor: service.color }}
                        />
                        {service.name}
                      </label>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Nenhum serviço cadastrado. Cadastre serviços primeiro.
                    </p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Se nenhum serviço for selecionado, o profissional poderá realizar todos os serviços
                </p>
              </div>

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

              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading ? "Salvando..." : editingStaff ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}