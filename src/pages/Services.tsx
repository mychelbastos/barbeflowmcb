import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Palette,
  Upload,
  X,
  ImageIcon,
  Sparkles,
  Loader2 as Loader2Icon
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AiTextButton, AiGenerateImageButton } from "@/components/AiContentButtons";
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
  public: z.boolean(),
});

type ServiceFormData = z.infer<typeof serviceSchema>;

export default function Services() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<any>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [enhancingServiceId, setEnhancingServiceId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "A imagem deve ter no máximo 5MB",
          variant: "destructive",
        });
        return;
      }
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const uploadPhoto = async (serviceId: string): Promise<string | null> => {
    if (!photoFile || !currentTenant) return null;

    const fileExt = photoFile.name.split('.').pop();
    const fileName = `${currentTenant.id}/${serviceId}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('service-photos')
      .upload(fileName, photoFile, { upsert: true });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw uploadError;
    }

    const { data } = supabase.storage
      .from('service-photos')
      .getPublicUrl(fileName);

    return data.publicUrl;
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setPhotoRemoved(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const form = useForm<ServiceFormData>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      name: "",
      description: "",
      duration_minutes: 30,
      price_cents: 0,
      color: "#3B82F6",
      active: true,
      public: true,
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
        // Upload photo if there's a new one, or clear if removed
        let photoUrl = editingService.photo_url;
        if (photoFile) {
          setUploadingPhoto(true);
          photoUrl = await uploadPhoto(editingService.id);
          setUploadingPhoto(false);
        } else if (photoRemoved) {
          photoUrl = null;
        }

        // Update existing service
        const { error } = await supabase
          .from('services')
          .update({ ...values, photo_url: photoUrl })
          .eq('id', editingService.id);

        if (error) throw error;

        toast({
          title: "Serviço atualizado",
          description: `${values.name} foi atualizado com sucesso.`,
        });
      } else {
        // Create new service first to get ID
        const { data: newService, error } = await supabase
          .from('services')
          .insert({
            ...values,
            tenant_id: currentTenant.id,
          })
          .select()
          .single();

        if (error) throw error;

        // Upload photo if provided
        if (photoFile && newService) {
          setUploadingPhoto(true);
          const photoUrl = await uploadPhoto(newService.id);
          setUploadingPhoto(false);

          if (photoUrl) {
            await supabase
              .from('services')
              .update({ photo_url: photoUrl })
              .eq('id', newService.id);
          }
        }

        toast({
          title: "Serviço criado",
          description: `${values.name} foi adicionado com sucesso.`,
        });
      }

      form.reset();
      removePhoto();
      setPhotoRemoved(false);
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
      setUploadingPhoto(false);
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
      public: service.public ?? true,
    });
    setPhotoPreview(service.photo_url || null);
    setPhotoFile(null);
    setPhotoRemoved(false);
    setShowForm(true);
  };

  const handleDelete = async (service: any) => {
    try {
      // Try to delete first
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', service.id);

      if (error) {
        // If foreign key constraint, deactivate instead
        if (error.message?.includes('foreign key constraint')) {
          const { error: updateError } = await supabase
            .from('services')
            .update({ active: false })
            .eq('id', service.id);

          if (updateError) throw updateError;

          toast({
            title: "Serviço desativado",
            description: `${service.name} possui agendamentos vinculados e foi desativado ao invés de excluído.`,
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Serviço excluído",
          description: `${service.name} foi removido.`,
        });
      }

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
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Serviços</h1>
        <p className="text-sm md:text-base text-muted-foreground">Gerencie os serviços oferecidos</p>
      </div>
      <div className="flex justify-end">
        <Button onClick={() => { setEditingService(null); form.reset(); setShowForm(true); }} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" /> Novo Serviço
        </Button>
      </div>

      {/* Services Grid */}
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Card key={service.id} className="relative overflow-hidden">
            {service.photo_url && (
              <div className="h-32 w-full overflow-hidden">
                <img 
                  src={service.photo_url} 
                  alt={service.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                {!service.photo_url && (
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ 
                      backgroundColor: `${service.color}20`,
                      color: service.color 
                    }}
                  >
                    <Scissors className="h-6 w-6" />
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  {!service.public && (
                    <Badge variant="outline" className="text-xs">Oculto</Badge>
                  )}
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
                  <div className="font-semibold text-success">
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
                    <AiGenerateImageButton
                      table="services"
                      itemId={service.id}
                      hasImage={!!service.photo_url}
                      onGenerated={loadServices}
                    />
                    {service.photo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            setEnhancingServiceId(service.id);
                            toast({ title: "✨ Melhorando imagem com IA...", description: "Isso pode levar alguns segundos" });
                            const { data, error } = await supabase.functions.invoke('enhance-product-image', {
                              body: { item_id: service.id, image_url: service.photo_url, table: 'services' },
                            });
                            if (error) throw error;
                            if (data?.error) { toast({ title: data.error, variant: "destructive" }); return; }
                            toast({ title: "Imagem melhorada com sucesso! ✨" });
                            loadServices();
                          } catch (err) {
                            console.error('Enhance error:', err);
                            toast({ title: "Erro ao melhorar imagem", variant: "destructive" });
                          } finally {
                            setEnhancingServiceId(null);
                          }
                        }}
                        disabled={enhancingServiceId === service.id}
                        className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                        title="Melhorar imagem com IA"
                      >
                        {enhancingServiceId === service.id ? (
                          <Loader2Icon className="h-4 w-4 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                      </Button>
                    )}
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
                      onClick={() => setDeleteTarget(service)}
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
                Adicione o primeiro serviço do seu negócio
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
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nome e Descrição</span>
                <AiTextButton
                  table="services"
                  currentName={form.watch("name")}
                  currentDescription={form.watch("description")}
                  onResult={(title, desc) => {
                    form.setValue("name", title);
                    form.setValue("description", desc);
                  }}
                />
              </div>

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

              {/* Photo Upload */}
              <div className="space-y-2">
                <Label>Foto do Serviço</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  className="hidden"
                />
                
                {photoPreview ? (
                  <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
                    <img 
                      src={photoPreview} 
                      alt="Preview" 
                      className="w-full h-full object-cover"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={removePhoto}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-24 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Clique para enviar foto
                      </span>
                    </div>
                  </Button>
                )}
                <p className="text-xs text-muted-foreground">
                  Máximo 5MB. Formatos: JPG, PNG, WebP
                </p>
              </div>

              <FormField
                control={form.control}
                name="active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Serviço Ativo</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Serviços ativos ficam disponíveis para agendamento interno
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

              <FormField
                control={form.control}
                name="public"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <div>
                      <FormLabel>Visível na Página Pública</FormLabel>
                      <p className="text-xs text-muted-foreground">
                        Exibir este serviço na página de agendamento online
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
                <Button type="submit" disabled={formLoading || uploadingPhoto}>
                  {uploadingPhoto ? "Enviando foto..." : formLoading ? "Salvando..." : editingService ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir serviço</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o serviço "{deleteTarget?.name}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteTarget) {
                  handleDelete(deleteTarget);
                  setDeleteTarget(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}