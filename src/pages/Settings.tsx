import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { NewTenantModal } from "@/components/modals/NewTenantModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  Settings as SettingsIcon, 
  Store, 
  Clock, 
  Bell, 
  CreditCard,
  Upload,
  Image as ImageIcon,
  Globe,
  Smartphone,
  Plus
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormDescription,
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

const tenantSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  slug: z.string().min(3, "Slug deve ter pelo menos 3 caracteres").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
});

const settingsSchema = z.object({
  timezone: z.string(),
  buffer_time: z.number().min(0).max(60),
  slot_duration: z.number().min(15).max(120),
  cancellation_hours: z.number().min(0).max(48),
  whatsapp_enabled: z.boolean(),
  email_notifications: z.boolean(),
  allow_online_payment: z.boolean(),
  require_prepayment: z.boolean(),
  prepayment_percentage: z.number().min(0).max(100),
});

type TenantFormData = z.infer<typeof tenantSchema>;
type SettingsFormData = z.infer<typeof settingsSchema>;

const timezones = [
  { value: "America/Sao_Paulo", label: "São Paulo (UTC-3)" },
  { value: "America/Bahia", label: "Bahia (UTC-3)" },
  { value: "America/Manaus", label: "Manaus (UTC-4)" },
  { value: "America/Rio_Branco", label: "Rio Branco (UTC-5)" },
];

export default function Settings() {
  const { currentTenant, tenants } = useTenant();
  const { isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);

  const tenantForm = useForm<TenantFormData>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: "",
      slug: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const settingsForm = useForm<SettingsFormData>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      timezone: "America/Bahia",
      buffer_time: 10,
      slot_duration: 15,
      cancellation_hours: 2,
      whatsapp_enabled: false,
      email_notifications: true,
      allow_online_payment: false,
      require_prepayment: false,
      prepayment_percentage: 0,
    },
  });

  useEffect(() => {
    if (currentTenant) {
      loadTenantData();
    }
  }, [currentTenant]);

  const loadTenantData = () => {
    if (!currentTenant) return;

    tenantForm.reset({
      name: currentTenant.name || "",
      slug: currentTenant.slug || "",
      phone: currentTenant.phone || "",
      email: currentTenant.email || "",
      address: currentTenant.address || "",
    });

    const settings = currentTenant.settings || {};
    settingsForm.reset({
      timezone: settings.timezone || "America/Bahia",
      buffer_time: settings.buffer_time || 10,
      slot_duration: settings.slot_duration || 15,
      cancellation_hours: settings.cancellation_hours || 2,
      whatsapp_enabled: settings.whatsapp_enabled || false,
      email_notifications: settings.email_notifications || true,
      allow_online_payment: settings.allow_online_payment || false,
      require_prepayment: settings.require_prepayment || false,
      prepayment_percentage: settings.prepayment_percentage || 0,
    });
  };

  const handleTenantSubmit = async (values: TenantFormData) => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('tenants')
        .update(values)
        .eq('id', currentTenant.id);

      if (error) throw error;

      toast({
        title: "Dados atualizados",
        description: "As informações da barbearia foram atualizadas com sucesso.",
      });

      // await refreshTenant?.(); // TODO: Implement refreshTenant in useTenant hook
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar dados",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSettingsSubmit = async (values: SettingsFormData) => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      const { error } = await supabase
        .from('tenants')
        .update({ 
          settings: {
            ...currentTenant.settings,
            ...values
          }
        })
        .eq('id', currentTenant.id);

      if (error) throw error;

      toast({
        title: "Configurações atualizadas",
        description: "As configurações foram salvas com sucesso.",
      });

      // await refreshTenant?.(); // TODO: Implement refreshTenant in useTenant hook
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configurações",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentTenant) {
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
      <div>
        <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações da sua barbearia
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className={`grid w-full ${isSuperAdmin ? 'grid-cols-5' : 'grid-cols-4'}`}>
          <TabsTrigger value="general">Geral</TabsTrigger>
          <TabsTrigger value="scheduling">Agendamento</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="payments">Pagamentos</TabsTrigger>
          {isSuperAdmin && (
            <TabsTrigger value="multi-tenant">Multi-Barbearia</TabsTrigger>
          )}
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Informações da Barbearia
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...tenantForm}>
                <form onSubmit={tenantForm.handleSubmit(handleTenantSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={tenantForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome da Barbearia *</FormLabel>
                          <FormControl>
                            <Input placeholder="Barbearia Premium" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tenantForm.control}
                      name="slug"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Slug Público *</FormLabel>
                          <FormControl>
                            <div className="flex">
                              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-muted-foreground text-sm">
                                meusite.com/
                              </span>
                              <Input 
                                placeholder="barbearia-premium" 
                                className="rounded-l-none"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            URL pública para agendamentos online
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={tenantForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 99999-9999" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={tenantForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="contato@barbearia.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={tenantForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Endereço</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Rua das Flores, 123 - Centro, São Paulo - SP"
                            className="resize-none"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div>
                    <h3 className="text-lg font-medium mb-4">Mídia</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <Label>Logo</Label>
                        <div className="mt-2 flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Logo
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Recomendado: 200x200px
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Capa</Label>
                        <div className="mt-2 flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                          <div className="text-center">
                            <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <Button variant="outline" size="sm">
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Capa
                            </Button>
                            <p className="text-xs text-muted-foreground mt-2">
                              Recomendado: 1200x400px
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Alterações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scheduling Settings */}
        <TabsContent value="scheduling">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Configurações de Agendamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={settingsForm.control}
                      name="timezone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Fuso Horário</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {timezones.map((tz) => (
                                <SelectItem key={tz.value} value={tz.value}>
                                  {tz.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={settingsForm.control}
                      name="slot_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Duração dos Slots (minutos)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            defaultValue={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="15">15 minutos</SelectItem>
                              <SelectItem value="20">20 minutos</SelectItem>
                              <SelectItem value="30">30 minutos</SelectItem>
                              <SelectItem value="60">60 minutos</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Intervalo entre horários disponíveis
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={settingsForm.control}
                      name="buffer_time"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tempo de Buffer (minutos)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              max={60}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Tempo extra entre agendamentos
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={settingsForm.control}
                      name="cancellation_hours"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prazo de Cancelamento (horas)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              max={48}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Prazo mínimo para cancelamento
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notificações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="email_notifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Notificações por Email
                          </FormLabel>
                          <FormDescription>
                            Receber confirmações e lembretes por email
                          </FormDescription>
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
                    control={settingsForm.control}
                    name="whatsapp_enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <FormLabel className="text-base mr-2">
                              WhatsApp
                            </FormLabel>
                            <Badge variant="secondary">Em breve</Badge>
                          </div>
                          <FormDescription>
                            Enviar confirmações e lembretes via WhatsApp
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Settings */}
        <TabsContent value="payments">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="h-5 w-5 mr-2" />
                Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <FormField
                    control={settingsForm.control}
                    name="allow_online_payment"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center">
                            <FormLabel className="text-base mr-2">
                              Pagamento Online
                            </FormLabel>
                            <Badge variant="secondary">Em breve</Badge>
                          </div>
                          <FormDescription>
                            Permitir pagamento online via cartão
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={settingsForm.control}
                    name="require_prepayment"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Exigir Pré-pagamento
                          </FormLabel>
                          <FormDescription>
                            Exigir pagamento antecipado para confirmar agendamento
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {settingsForm.watch("require_prepayment") && (
                    <FormField
                      control={settingsForm.control}
                      name="prepayment_percentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentual de Pré-pagamento (%)</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              min={0} 
                              max={100}
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              disabled
                            />
                          </FormControl>
                          <FormDescription>
                            Percentual do valor total a ser pago antecipadamente
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <div className="rounded-lg bg-muted p-4">
                    <h4 className="font-medium mb-2">Configurar Gateway de Pagamento</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Para aceitar pagamentos online, você precisa configurar um gateway de pagamento.
                    </p>
                    <Button variant="outline" disabled>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Configurar Pagar.me
                    </Button>
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={loading}>
                      {loading ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Tenant Management (Only for Super Admins) */}
        {isSuperAdmin && (
          <TabsContent value="multi-tenant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Gerenciamento Multi-Barbearia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">⚠️ Área Administrativa</h3>
                  <p className="text-sm text-yellow-700">
                    Esta área é exclusiva para super administradores do sistema. 
                    Para ter acesso, seu email deve estar configurado na lista de super admins.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-4">Suas Barbearias</h3>
                  <div className="space-y-3">
                    {tenants.map((tenant) => (
                      <div
                        key={tenant.id}
                        className="flex items-center justify-between p-4 border border-border rounded-lg"
                      >
                        <div>
                          <h4 className="font-medium">{tenant.name}</h4>
                          <p className="text-sm text-muted-foreground">@{tenant.slug}</p>
                          <p className="text-xs text-muted-foreground">
                            Criado em {new Date(tenant.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {currentTenant?.id === tenant.id && (
                            <Badge variant="default">Ativo</Badge>
                          )}
                          <Badge variant="outline">Admin</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-4">
                    <Button onClick={() => setShowNewTenantModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Nova Barbearia
                    </Button>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-medium mb-4">Configuração de Super Admin</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-800 mb-2">Como configurar acesso</h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>1. Abra o arquivo: <code className="bg-blue-100 px-1 rounded">src/hooks/useSuperAdmin.ts</code></p>
                      <p>2. Adicione seu email na constante <code className="bg-blue-100 px-1 rounded">SUPER_ADMIN_EMAILS</code></p>
                      <p>3. Salve o arquivo e recarregue a página</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <NewTenantModal
        open={showNewTenantModal}
        onOpenChange={setShowNewTenantModal}
      />
    </div>
  );
}