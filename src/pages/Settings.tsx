import mpIcon from "@/assets/mercadopago-icon.jpg";
import { useState, useEffect } from "react";
import { useWhatsAppStatus } from "@/hooks/useWhatsAppStatus";
import { CustomerImportExport } from "@/components/CustomerImportExport";
import WhatsAppConfigEmbed from "@/pages/WhatsAppConfig";
import { BillingTab } from "@/components/billing/BillingTab";
import { useSearchParams } from "react-router-dom";
import { useTenant } from "@/hooks/useTenant";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { NewTenantModal } from "@/components/modals/NewTenantModal";
import { NoTenantState } from "@/components/NoTenantState";
import { AvailabilityBlocksManager } from "@/components/AvailabilityBlocksManager";
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
  Database,
  Upload,
  Image as ImageIcon,
  Globe,
  Smartphone,
  Plus,
  Link2,
  Unlink,
  CheckCircle,
  Loader2,
  AlertCircle,
  CalendarOff,
  Sparkles
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  extra_slot_duration: z.number().min(5).max(60),
  cancellation_hours: z.number().min(0).max(48),
  max_advance_days: z.number().min(0).max(365),
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

function WhatsAppNotificationStatus() {
  const waConnected = useWhatsAppStatus();
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium">WhatsApp</p>
          <Badge variant="secondary" className={waConnected ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" : "bg-zinc-700/50 text-zinc-400"}>
            {waConnected ? "Ativo" : "Inativo"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {waConnected
            ? "Confirmações e lembretes são enviados automaticamente via WhatsApp."
            : "Conecte o WhatsApp na página de WhatsApp para ativar notificações automáticas."}
        </p>
      </div>
      <div className={`w-3 h-3 rounded-full ${waConnected ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
    </div>
  );
}

export default function Settings() {
  const { currentTenant, tenants, loading: tenantLoading } = useTenant();
  const { isSuperAdmin } = useSuperAdmin();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const tabFromUrl = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabFromUrl || "general");
  const [showNewTenantModal, setShowNewTenantModal] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [generatingCover, setGeneratingCover] = useState(false);
  // Mercado Pago states
  const [mpConnected, setMpConnected] = useState(false);
  const [mpLoading, setMpLoading] = useState(true);
  const [mpConnecting, setMpConnecting] = useState(false);
  const [mpDisconnecting, setMpDisconnecting] = useState(false);

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
      extra_slot_duration: 5,
      cancellation_hours: 2,
      max_advance_days: 30,
      whatsapp_enabled: false,
      email_notifications: true,
      allow_online_payment: false,
      require_prepayment: false,
      prepayment_percentage: 0,
    },
  });

  // Check URL params for MP connection status
  useEffect(() => {
    const mpConnectedParam = searchParams.get('mp_connected');
    const mpErrorParam = searchParams.get('mp_error');

    if (mpConnectedParam === '1') {
      toast({
        title: "Mercado Pago conectado!",
        description: "Sua conta foi vinculada com sucesso.",
      });
      setSearchParams({});
      setActiveTab('payments');
    }

    if (mpErrorParam) {
      const errorMessages: Record<string, string> = {
        missing_params: 'Parâmetros ausentes na resposta',
        invalid_state: 'Estado de autenticação inválido',
        expired: 'Sessão expirada, tente novamente',
        config_error: 'Erro de configuração do servidor',
        token_exchange_failed: 'Falha ao obter tokens',
        no_token: 'Token não recebido',
        db_error: 'Erro ao salvar conexão',
        server_error: 'Erro interno do servidor',
      };
      toast({
        title: "Erro ao conectar Mercado Pago",
        description: errorMessages[mpErrorParam] || 'Erro desconhecido',
        variant: "destructive",
      });
      setSearchParams({});
      setActiveTab('payments');
    }
  }, [searchParams]);

  // Sync tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentTenant) {
      loadTenantData();
      loadMpConnection();
      setLogoUrl(currentTenant.logo_url || null);
      setCoverUrl(currentTenant.cover_url || null);
    }
  }, [currentTenant]);

  const loadMpConnection = async () => {
    if (!currentTenant) return;
    
    try {
      setMpLoading(true);
      const { data, error } = await supabase
        .from('mercadopago_connections')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .maybeSingle();

      setMpConnected(!!data && !error);
    } catch (error) {
      console.error('Error checking MP connection:', error);
      setMpConnected(false);
    } finally {
      setMpLoading(false);
    }
  };

  const handleMpConnect = async () => {
    if (!currentTenant) return;

    try {
      setMpConnecting(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke('mp-oauth-start', {
        body: { tenant_id: currentTenant.id },
      });

      if (error) throw error;
      
      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('URL de autorização não recebida');
      }
    } catch (error: any) {
      console.error('Error starting MP OAuth:', error);
      toast({
        title: "Erro ao conectar",
        description: error.message || "Não foi possível iniciar a conexão com o Mercado Pago",
        variant: "destructive",
      });
      setMpConnecting(false);
    }
  };

  const handleMpDisconnect = async () => {
    if (!currentTenant) return;

    try {
      setMpDisconnecting(true);
      
      const { error } = await supabase.functions.invoke('mp-disconnect', {
        body: { tenant_id: currentTenant.id },
      });

      if (error) throw error;
      
      setMpConnected(false);
      
      // Reset payment settings in form
      settingsForm.setValue('allow_online_payment', false);
      settingsForm.setValue('require_prepayment', false);
      
      toast({
        title: "Mercado Pago desconectado",
        description: "Sua conta foi desvinculada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error disconnecting MP:', error);
      toast({
        title: "Erro ao desconectar",
        description: error.message || "Não foi possível desconectar o Mercado Pago",
        variant: "destructive",
      });
    } finally {
      setMpDisconnecting(false);
    }
  };

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
      timezone: settings.timezone ?? "America/Bahia",
      buffer_time: settings.buffer_time ?? 10,
      slot_duration: settings.slot_duration ?? 15,
      extra_slot_duration: settings.extra_slot_duration ?? 5,
      cancellation_hours: settings.cancellation_hours ?? 2,
      max_advance_days: settings.max_advance_days ?? 30,
      whatsapp_enabled: settings.whatsapp_enabled ?? false,
      email_notifications: settings.email_notifications !== false,
      allow_online_payment: settings.allow_online_payment ?? false,
      require_prepayment: settings.require_prepayment ?? false,
      prepayment_percentage: settings.prepayment_percentage ?? 0,
    });
  };

  const handleLogoUpload = async (file: File) => {
    if (!currentTenant) return;

    try {
      setUploadingLogo(true);

      // Create unique file name
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/logo-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('tenant-media')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('tenant-media')
        .getPublicUrl(fileName);

      const publicUrl = publicUrlData.publicUrl;

      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', currentTenant.id);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);

      toast({
        title: "Logo atualizado",
        description: "A imagem foi salva com sucesso.",
      });

      // Auto-generate cover from logo
      toast({
        title: "Gerando capa...",
        description: "Criando uma capa automaticamente com sua logo.",
      });
      try {
        const { data: coverData, error: coverError } = await supabase.functions.invoke('generate-cover', {
          body: { tenant_id: currentTenant.id, logo_url: publicUrl }
        });
        if (coverError) throw coverError;
        if (coverData?.cover_url) {
          setCoverUrl(coverData.cover_url);
          toast({
            title: "Capa gerada!",
            description: "Uma capa foi criada automaticamente com sua logo.",
          });
        }
      } catch (coverErr: any) {
        console.error('Cover generation error:', coverErr);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer o upload da imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleLogoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 5MB.",
        variant: "destructive",
      });
      return;
    }

    handleLogoUpload(file);
  };

  const handleGenerateCover = async () => {
    if (!currentTenant || !logoUrl) return;

    try {
      setGeneratingCover(true);
      toast({
        title: "🎨 Gerando capa com IA...",
        description: "Isso pode levar alguns segundos.",
      });

      const { data, error } = await supabase.functions.invoke('generate-cover', {
        body: { tenant_id: currentTenant.id, logo_url: logoUrl },
      });

      if (error) throw error;

      if (data?.cover_url) {
        setCoverUrl(data.cover_url);
        toast({
          title: "Capa gerada com sucesso! ✨",
          description: "A nova capa foi aplicada ao seu perfil público.",
        });
      }
    } catch (err: any) {
      console.error('Cover generation error:', err);
      toast({
        title: "Erro ao gerar capa",
        description: err.message || "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setGeneratingCover(false);
    }
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
        description: "As informações do estabelecimento foram atualizadas com sucesso.",
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

  if (tenantLoading) {
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
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Configurações</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie as configurações do seu estabelecimento
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 md:space-y-6">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 hidden md:hidden">
          <TabsList>
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="scheduling">Agendamento</TabsTrigger>
            <TabsTrigger value="notifications">Notificações</TabsTrigger>
            <TabsTrigger value="payments">Pagamentos</TabsTrigger>
            <TabsTrigger value="data">Dados</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
            {isSuperAdmin && <TabsTrigger value="multi-tenant">Multi-Empresa</TabsTrigger>}
          </TabsList>
        </div>

        {/* General Settings */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Store className="h-5 w-5 mr-2" />
                Informações do Estabelecimento
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
                          <FormLabel>Nome do Estabelecimento *</FormLabel>
                          <FormControl>
                            <Input placeholder="Meu Estabelecimento" {...field} />
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
                                modogestor.com.br/
                              </span>
                              <Input 
                                placeholder="meu-estabelecimento" 
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
                            <Input placeholder="contato@empresa.com" {...field} />
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
                    <div>
                      {/* Logo Upload */}
                      <div>
                        <Label>Logo</Label>
                        <p className="text-xs text-muted-foreground mb-2">
                          A capa será gerada automaticamente a partir da logo.
                        </p>
                        <div className="mt-2 border-2 border-dashed border-border rounded-lg p-4 transition-colors hover:border-emerald-500/50">
                          {logoUrl ? (
                            <div className="relative group">
                              <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden bg-zinc-800">
                                <img 
                                  src={logoUrl} 
                                  alt="Logo" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              {coverUrl && (
                                <div className="mt-3">
                                  <Label className="text-xs text-muted-foreground">Capa gerada</Label>
                                  <div className="w-full h-20 rounded-lg overflow-hidden bg-zinc-800 mt-1">
                                    <img src={coverUrl} alt="Capa" className="w-full h-full object-cover" />
                                  </div>
                                </div>
                              )}
                              <div className="mt-3 flex items-center justify-center gap-2 flex-wrap">
                                <label className="cursor-pointer">
                                  <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleLogoFileChange(e)}
                                    disabled={uploadingLogo}
                                  />
                                  <Button 
                                    variant="outline" 
                                    size="sm" 
                                    type="button"
                                    disabled={uploadingLogo}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                                    }}
                                  >
                                    {uploadingLogo ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Enviando...
                                      </>
                                    ) : (
                                      <>
                                        <Upload className="h-4 w-4 mr-2" />
                                        Alterar Logo
                                      </>
                                    )}
                                  </Button>
                                </label>
                                {logoUrl && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    type="button"
                                    disabled={generatingCover}
                                    onClick={handleGenerateCover}
                                    className="text-orange-400 border-orange-400/30 hover:bg-orange-500/10 hover:text-orange-300"
                                  >
                                    {generatingCover ? (
                                      <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Gerando Capa...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-4 w-4 mr-2" />
                                        {coverUrl ? 'Regerar Capa' : 'Gerar Capa'}
                                      </>
                                    )}
                                  </Button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="text-center py-4">
                              <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => handleLogoFileChange(e)}
                                  disabled={uploadingLogo}
                                />
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  type="button"
                                  disabled={uploadingLogo}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    (e.currentTarget.previousElementSibling as HTMLInputElement)?.click();
                                  }}
                                >
                                  {uploadingLogo ? (
                                    <>
                                      <span className="animate-spin mr-2">⏳</span>
                                      Enviando...
                                    </>
                                  ) : (
                                    <>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Upload Logo
                                    </>
                                  )}
                                </Button>
                              </label>
                              <p className="text-xs text-muted-foreground mt-2">
                                Recomendado: 200x200px
                              </p>
                            </div>
                          )}
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
                          <Select onValueChange={field.onChange} value={field.value}>
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
                            value={field.value.toString()}
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

                    <FormField
                      control={settingsForm.control}
                      name="extra_slot_duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Incremento de Tempo Extra (minutos)</FormLabel>
                          <Select 
                            onValueChange={(value) => field.onChange(parseInt(value))} 
                            value={field.value.toString()}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5">5 minutos</SelectItem>
                              <SelectItem value="10">10 minutos</SelectItem>
                              <SelectItem value="15">15 minutos</SelectItem>
                              <SelectItem value="20">20 minutos</SelectItem>
                              <SelectItem value="30">30 minutos</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>
                            Incremento ao adicionar tempo extra no agendamento
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

                  {/* Advance Booking Limit */}
                  <FormField
                    control={settingsForm.control}
                    name="max_advance_days"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Limite de Agendamento Antecipado (dias)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            min={0} 
                            max={365}
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormDescription>
                          Quantos dias à frente o cliente pode agendar. Ex: 30 = cliente pode agendar até 30 dias no futuro. Use 0 para ilimitado.
                        </FormDescription>
                        <FormMessage />
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

          {/* Availability Blocks */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CalendarOff className="h-5 w-5 mr-2" />
                Bloqueios de Agenda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AvailabilityBlocksManager tenantId={currentTenant.id} />
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

                  <WhatsAppNotificationStatus />

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
                Pagamentos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Mercado Pago Connection Status */}
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-white flex items-center justify-center">
                      {mpLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <img src={mpIcon} alt="Mercado Pago" className="h-8 w-8 object-contain" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium">Mercado Pago</h4>
                      <p className="text-sm text-muted-foreground">
                        {mpLoading ? 'Verificando...' : mpConnected ? 'Conta conectada' : 'Não conectado'}
                      </p>
                    </div>
                  </div>
                  
                  {!mpLoading && (
                    mpConnected ? (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleMpDisconnect}
                        disabled={mpDisconnecting}
                      >
                        {mpDisconnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Desconectando...
                          </>
                        ) : (
                          <>
                            <Unlink className="h-4 w-4 mr-2" />
                            Desconectar
                          </>
                        )}
                      </Button>
                    ) : (
                      <Button 
                        variant="default" 
                        size="sm"
                        onClick={handleMpConnect}
                        disabled={mpConnecting}
                      >
                        {mpConnecting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Conectando...
                          </>
                        ) : (
                          <>
                            <Link2 className="h-4 w-4 mr-2" />
                            Conectar Mercado Pago
                          </>
                        )}
                      </Button>
                    )
                  )}
                </div>
              </div>

              <Separator />

              <Form {...settingsForm}>
                <form onSubmit={settingsForm.handleSubmit(handleSettingsSubmit)} className="space-y-6">
                  <TooltipProvider>
                    <FormField
                      control={settingsForm.control}
                      name="allow_online_payment"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <FormLabel className="text-base">
                                Pagamento via Site
                              </FormLabel>
                              {mpConnected && (
                                <Badge variant="outline" className="text-emerald-600 border-emerald-600">
                                  Disponível
                                </Badge>
                              )}
                            </div>
                            <FormDescription>
                              Permitir que clientes paguem online pelo site
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={(checked) => {
                                      field.onChange(checked);
                                      // If disabling online payment, also disable prepayment
                                      if (!checked) {
                                        settingsForm.setValue('require_prepayment', false);
                                      }
                                    }}
                                    disabled={!mpConnected}
                                  />
                                </div>
                              </TooltipTrigger>
                              {!mpConnected && (
                                <TooltipContent>
                                  <p>Conecte sua conta Mercado Pago para ativar</p>
                                </TooltipContent>
                              )}
                            </Tooltip>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </TooltipProvider>

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
                            disabled={!settingsForm.watch('allow_online_payment')}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {settingsForm.watch("allow_online_payment") && (
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
                            />
                          </FormControl>
                          <FormDescription>
                            Percentual do valor total a ser pago (0 = valor integral)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {!mpConnected && (
                    <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-amber-800 dark:text-amber-200">Conecte o Mercado Pago</h4>
                          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                            Para aceitar pagamentos online, você precisa conectar sua conta do Mercado Pago.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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

        {/* Billing */}
        <TabsContent value="billing">
          <BillingTab />
        </TabsContent>

        {/* Data Import/Export */}
        <TabsContent value="data">
          <CustomerImportExport />
        </TabsContent>

        {/* Multi-Tenant Management (Only for Super Admins) */}
        {isSuperAdmin && (
          <TabsContent value="multi-tenant">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Gerenciamento Multi-Empresa
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
                  <h3 className="text-lg font-medium mb-4">Seus Estabelecimentos</h3>
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
                      Criar Novo Estabelecimento
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

        {/* WhatsApp Tab */}
        <TabsContent value="whatsapp">
          <WhatsAppConfigEmbed />
        </TabsContent>
      </Tabs>

      <NewTenantModal
        open={showNewTenantModal}
        onOpenChange={setShowNewTenantModal}
      />
    </div>
  );
}