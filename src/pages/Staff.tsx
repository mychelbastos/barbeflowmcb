import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
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
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { StaffScheduleManager } from "@/components/StaffScheduleManager";

const staffSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  bio: z.string().optional(),
  color: z.string().min(1, "Cor é obrigatória"),
  active: z.boolean(),
  is_owner: z.boolean(),
  default_commission_percent: z.number().min(0).max(100),
  product_commission_percent: z.number().min(0).max(100),
});

const SUPABASE_URL = "https://iagzodcwctvydmgrwjsy.supabase.co";

type StaffFormData = z.infer<typeof staffSchema>;

export default function Staff() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const { hasActiveSubscription } = useSubscription();
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
  const [pendingAction, setPendingAction] = useState<{ type: "save" | "activate"; data: any } | null>(null);
  const [extraConfirmOpen, setExtraConfirmOpen] = useState(false);
  const [extraCount, setExtraCount] = useState(0);
  const [updatingSubscription, setUpdatingSubscription] = useState(false);

  const form = useForm<StaffFormData>({
    resolver: zodResolver(staffSchema),
    defaultValues: {
      name: "",
      bio: "",
      color: "#10B981",
      active: true,
      is_owner: false,
      default_commission_percent: 0,
      product_commission_percent: 0,
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

  const getActiveStaffCount = (excludeId?: string, includeNew?: boolean) => {
    let count = staff.filter(s => s.active && s.id !== excludeId).length;
    if (includeNew) count++;
    return count;
  };

  const updateSubscriptionQuantity = async (additionalCount: number) => {
    const { data, error } = await supabase.functions.invoke("update-subscription-quantity", {
      body: { additional_count: additionalCount },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  };

  const checkAndConfirmExtra = (actionType: "save" | "activate", actionData: any, futureActiveCount: number) => {
    const extras = Math.max(0, futureActiveCount - 1);
    if (extras > 0 && hasActiveSubscription) {
      setExtraCount(extras);
      setPendingAction({ type: actionType, data: actionData });
      setExtraConfirmOpen(true);
      return true; // needs confirmation
    }
    return false; // no confirmation needed
  };

  const handleExtraConfirmed = async () => {
    setExtraConfirmOpen(false);
    if (!pendingAction) return;

    setUpdatingSubscription(true);
    try {
      if (pendingAction.type === "save") {
        await executeSave(pendingAction.data);
      } else if (pendingAction.type === "activate") {
        await executeToggle(pendingAction.data);
      }
      // Update subscription quantity
      await updateSubscriptionQuantity(extraCount);
    } catch (error: any) {
      toast({ title: "Erro", description: error.message || "Erro ao atualizar assinatura", variant: "destructive" });
    } finally {
      setUpdatingSubscription(false);
      setPendingAction(null);
    }
  };

  const handleSubmit = async (values: StaffFormData) => {
    if (!currentTenant) return;

    const isNewStaff = !editingStaff;
    const isActivating = editingStaff && !editingStaff.active && values.active;
    
    if ((isNewStaff && values.active) || isActivating) {
      const futureCount = getActiveStaffCount(editingStaff?.id, true);
      if (checkAndConfirmExtra("save", values, futureCount)) return;
    }

    await executeSave(values);

    // If deactivating, reduce subscription quantity
    if (editingStaff && editingStaff.active && !values.active && hasActiveSubscription) {
      const futureCount = getActiveStaffCount(editingStaff.id, false);
      const extras = Math.max(0, futureCount - 1);
      try {
        await updateSubscriptionQuantity(extras);
      } catch (err) {
        console.error("Failed to update subscription quantity:", err);
      }
    }
  };

  const executeSave = async (values: StaffFormData) => {
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      if (editingStaff) {
        const { error } = await supabase
          .from('staff')
          .update(values)
          .eq('id', editingStaff.id);

        if (error) throw error;

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
      is_owner: staffMember.is_owner || false,
      default_commission_percent: staffMember.default_commission_percent || 0,
      product_commission_percent: staffMember.product_commission_percent || 0,
    });
    
    const memberServices = staffMember.staff_services?.map((ss: any) => ss.service_id) || [];
    setSelectedServices(memberServices);
    setPhotoFile(null);
    setPhotoPreview(staffMember.photo_url || null);
    
    setShowForm(true);
  };

  const handleDelete = async (staffId: string, staffName: string) => {
    try {
      const deletedMember = staff.find(s => s.id === staffId);
      const { error } = await supabase
        .from('staff')
        .delete()
        .eq('id', staffId);

      if (error) throw error;

      toast({
        title: "Profissional excluído",
        description: `${staffName} foi removido da equipe.`,
      });

      // Update subscription if deleted member was active
      if (deletedMember?.active && hasActiveSubscription) {
        const futureCount = getActiveStaffCount(staffId, false);
        const extras = Math.max(0, futureCount - 1);
        try {
          await updateSubscriptionQuantity(extras);
        } catch (err) {
          console.error("Failed to update subscription quantity:", err);
        }
      }

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
    const willBeActive = !staffMember.active;
    
    if (willBeActive) {
      // Activating - check if extras needed
      const futureCount = getActiveStaffCount(undefined, false) + 1;
      if (checkAndConfirmExtra("activate", staffMember, futureCount)) return;
    }

    await executeToggle(staffMember);
  };

  const executeToggle = async (staffMember: any) => {
    const willBeActive = !staffMember.active;
    try {
      const { error } = await supabase
        .from('staff')
        .update({ active: willBeActive })
        .eq('id', staffMember.id);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Profissional ${willBeActive ? 'ativado' : 'desativado'} com sucesso.`,
      });

      // If deactivating, reduce subscription quantity
      if (!willBeActive && hasActiveSubscription) {
        const futureCount = getActiveStaffCount(staffMember.id, false);
        const extras = Math.max(0, futureCount - 1);
        try {
          await updateSubscriptionQuantity(extras);
        } catch (err) {
          console.error("Failed to update subscription quantity:", err);
        }
      }

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Profissionais</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie a equipe do seu estabelecimento
          </p>
        </div>
      </div>
      <div className="flex justify-end">
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
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{staffMember.name}</h3>
                      {staffMember.is_owner && (
                        <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-400 border-amber-500/30">
                          Chefe
                        </Badge>
                      )}
                    </div>
                    {staffMember.bio && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {staffMember.bio}
                      </p>
                    )}
                  </div>

                  {/* Commission info */}
                  {!staffMember.is_owner && (staffMember.default_commission_percent > 0 || staffMember.product_commission_percent > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {staffMember.default_commission_percent > 0 && (
                        <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                          Serviços: {staffMember.default_commission_percent}%
                        </Badge>
                      )}
                      {staffMember.product_commission_percent > 0 && (
                        <Badge variant="outline" className="text-xs bg-blue-500/10 text-blue-400 border-blue-500/30">
                          Produtos: {staffMember.product_commission_percent}%
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Services section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5">
                      <Scissors className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Serviços ({memberServices.length})
                      </span>
                    </div>
                    {memberServices.length > 0 ? (
                      <div className="space-y-1.5">
                        {memberServices.slice(0, 4).map((service: any) => (
                          <div key={service.id} className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/50">
                            <div className="flex items-center gap-2 min-w-0">
                              <div
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: service.color || staffMember.color }}
                              />
                              <span className="text-xs font-medium text-foreground truncate">
                                {service.name}
                              </span>
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0 ml-2">
                              {(service.price_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </div>
                        ))}
                        {memberServices.length > 4 && (
                          <p className="text-xs text-muted-foreground text-center pt-0.5">
                            +{memberServices.length - 4} serviço(s)
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic px-2">
                        Todos os serviços
                      </p>
                    )}
                  </div>
                  
                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-1.5">
                      <Palette className="h-3.5 w-3.5 text-muted-foreground" />
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
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir profissional?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Deseja excluir "{staffMember.name}" da equipe? Essa ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(staffMember.id, staffMember.name)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingStaff ? "Editar Profissional" : "Adicionar Profissional"}</DialogTitle>
            <DialogDescription>
              Preencha os dados do profissional e os serviços que ele realiza.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="flex flex-col items-center gap-4 py-2">
                <div className="relative">
                  <Avatar className="w-24 h-24 border-2 border-border">
                    <AvatarImage src={photoPreview || undefined} />
                    <AvatarFallback className="bg-muted text-muted-foreground">
                      <Camera className="h-8 w-8" />
                    </AvatarFallback>
                  </Avatar>
                  <Input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    ref={fileInputRef}
                    onChange={handlePhotoChange}
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="absolute bottom-0 right-0 rounded-full w-8 h-8 p-0"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Foto do profissional (opcional)</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome do profissional" {...field} />
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
                      <FormLabel>Cor na Agenda</FormLabel>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="color" {...field} className="w-12 h-10 p-1" />
                          <Input {...field} placeholder="#000000" className="flex-1" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bio (opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Breve descrição..." className="resize-none" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-medium">Comissões (opcional)</h4>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="default_commission_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviços (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="product_commission_percent"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Produtos (%)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            max="100" 
                            {...field} 
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <h4 className="text-sm font-medium">Serviços Realizados</h4>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-2">
                  {services.map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`service-${service.id}`}
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
                        htmlFor={`service-${service.id}`} 
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {service.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <FormField
                  control={form.control}
                  name="is_owner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Dono/Gerente</FormLabel>
                        <p className="text-[11px] text-muted-foreground">
                          Pode acessar todas as configurações
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
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={formLoading}>
                  {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Extra Professional Confirmation Dialog */}
      <AlertDialog open={extraConfirmOpen} onOpenChange={setExtraConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Profissional adicional</AlertDialogTitle>
            <AlertDialogDescription>
              Você terá {extraCount + 1} profissional(is) ativo(s). Isso adicionará{" "}
              <strong>R$ {(extraCount * 24.9).toFixed(2).replace(".", ",")}/mês</strong> por{" "}
              {extraCount} profissional(is) extra(s) na sua assinatura (R$ 24,90 cada).
              <br /><br />
              Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingSubscription} onClick={() => setPendingAction(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleExtraConfirmed} disabled={updatingSubscription}>
              {updatingSubscription && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedStaffForSchedule && (
        <StaffScheduleManager
          staffId={selectedStaffForSchedule.id}
          staffName={selectedStaffForSchedule.name}
        />
      )}
    </div>
  );
}
