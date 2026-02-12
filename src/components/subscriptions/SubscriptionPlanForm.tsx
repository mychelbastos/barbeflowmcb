import { useState, useEffect, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, X, Upload, Loader2 } from "lucide-react";

interface PlanServiceItem {
  service_id: string;
  sessions_per_cycle: string;
  unlimited: boolean;
}

interface SubscriptionPlanFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: any | null;
  services: any[];
  onSaved: () => void;
}

export function SubscriptionPlanForm({ open, onOpenChange, plan, services, onSaved }: SubscriptionPlanFormProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(plan?.name || '');
  const [description, setDescription] = useState(plan?.description || '');
  const [price, setPrice] = useState(plan ? (plan.price_cents / 100).toFixed(2) : '');
  const [isPublic, setIsPublic] = useState(plan?.public !== false);
  const [photoUrl, setPhotoUrl] = useState(plan?.photo_url || '');
  const [sessionsUnlimited, setSessionsUnlimited] = useState(plan?.sessions_limit == null);
  const [sessionsLimit, setSessionsLimit] = useState(plan?.sessions_limit?.toString() || '');
  const [planServices, setPlanServices] = useState<PlanServiceItem[]>(() => {
    if (plan?.plan_services?.length) {
      return plan.plan_services.map((ps: any) => ({
        service_id: ps.service_id,
        sessions_per_cycle: ps.sessions_per_cycle?.toString() || '',
        unlimited: ps.sessions_per_cycle == null,
      }));
    }
    return [{ service_id: '', sessions_per_cycle: '', unlimited: true }];
  });

  // Reset form when plan changes
  const resetForm = () => {
    setName(plan?.name || '');
    setDescription(plan?.description || '');
    setPrice(plan ? (plan.price_cents / 100).toFixed(2) : '');
    setIsPublic(plan?.public !== false);
    setPhotoUrl(plan?.photo_url || '');
    setSessionsUnlimited(plan?.sessions_limit == null);
    setSessionsLimit(plan?.sessions_limit?.toString() || '');
    if (plan?.plan_services?.length) {
      setPlanServices(plan.plan_services.map((ps: any) => ({
        service_id: ps.service_id,
        sessions_per_cycle: ps.sessions_per_cycle?.toString() || '',
        unlimited: ps.sessions_per_cycle == null,
      })));
    } else {
      setPlanServices([{ service_id: '', sessions_per_cycle: '', unlimited: true }]);
    }
  };

  // Sync form with plan prop when dialog opens
  useEffect(() => {
    if (open) resetForm();
  }, [open, plan]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/plans/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('tenant-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(fileName);
      setPhotoUrl(publicUrl);
      toast({ title: "Imagem enviada com sucesso" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant || !name || !price) return;
    const validServices = planServices.filter(ps => ps.service_id);
    if (validServices.length === 0) {
      toast({ title: "Adicione ao menos um serviço ao plano", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const priceCents = Math.round(parseFloat(price) * 100);

      if (plan?.id) {
        // Update
        const { error } = await supabase.from('subscription_plans').update({
          name,
          description: description || null,
          price_cents: priceCents,
          sessions_limit: sessionsUnlimited ? null : parseInt(sessionsLimit) || null,
          public: isPublic,
          photo_url: photoUrl || null,
        }).eq('id', plan.id);
        if (error) throw error;

        // Replace plan services
        await supabase.from('subscription_plan_services').delete().eq('plan_id', plan.id);
        await supabase.from('subscription_plan_services').insert(
          validServices.map(s => ({
            plan_id: plan.id,
            service_id: s.service_id,
            sessions_per_cycle: s.unlimited ? null : parseInt(s.sessions_per_cycle) || null,
          }))
        );
        toast({ title: "Plano atualizado" });
      } else {
        // Create
        const { data: newPlan, error } = await supabase.from('subscription_plans').insert({
          tenant_id: currentTenant.id,
          name,
          description: description || null,
          price_cents: priceCents,
          sessions_limit: sessionsUnlimited ? null : parseInt(sessionsLimit) || null,
          public: isPublic,
          photo_url: photoUrl || null,
        }).select().single();
        if (error) throw error;

        await supabase.from('subscription_plan_services').insert(
          validServices.map(s => ({
            plan_id: newPlan.id,
            service_id: s.service_id,
            sessions_per_cycle: s.unlimited ? null : parseInt(s.sessions_per_cycle) || null,
          }))
        );
        toast({ title: "Plano criado" });
      }

      onSaved();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { resetForm(); } onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{plan ? "Editar Plano" : "Novo Plano de Assinatura"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Nome do plano</Label>
            <Input placeholder="Ex: Plano Premium" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Descrição (opcional)</Label>
            <Textarea placeholder="Descrição exibida ao cliente" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
          </div>

          <div className="space-y-2">
            <Label>Valor mensal (R$)</Label>
            <CurrencyInput value={price} onChange={setPrice} placeholder="129,90" />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Limite geral de sessões/mês</Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Ilimitado</span>
                <Switch checked={sessionsUnlimited} onCheckedChange={setSessionsUnlimited} />
              </div>
            </div>
            {!sessionsUnlimited && (
              <Input type="number" min="1" placeholder="Ex: 4" value={sessionsLimit} onChange={(e) => setSessionsLimit(e.target.value)} />
            )}
          </div>

          <div className="space-y-2">
            <Label>Serviços inclusos</Label>
            {planServices.map((ps, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <Select value={ps.service_id} onValueChange={(v) => {
                  setPlanServices(prev => prev.map((item, i) => i === idx ? { ...item, service_id: v } : item));
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {services
                      .filter(s => !planServices.some((p, i) => i !== idx && p.service_id === s.id))
                      .map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-1">
                  {ps.unlimited ? (
                    <span className="text-xs text-muted-foreground whitespace-nowrap">∞</span>
                  ) : (
                    <Input
                      type="number" min="1" placeholder="Qtd" className="w-16"
                      value={ps.sessions_per_cycle}
                      onChange={(e) => setPlanServices(prev => prev.map((item, i) => i === idx ? { ...item, sessions_per_cycle: e.target.value } : item))}
                    />
                  )}
                  <Switch
                    checked={ps.unlimited}
                    onCheckedChange={(v) => setPlanServices(prev => prev.map((item, i) => i === idx ? { ...item, unlimited: v } : item))}
                  />
                </div>
                {planServices.length > 1 && (
                  <Button variant="ghost" size="icon" className="shrink-0" onClick={() => setPlanServices(prev => prev.filter((_, i) => i !== idx))}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setPlanServices(prev => [...prev, { service_id: '', sessions_per_cycle: '', unlimited: true }])} className="w-full">
              <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar serviço
            </Button>
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Imagem do plano</Label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {photoUrl ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border">
                  <img src={photoUrl} alt="Preview" className="w-full h-full object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setPhotoUrl('')}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button type="button" variant="outline" className="w-full h-20 border-dashed"
                  onClick={() => fileInputRef.current?.click()} disabled={uploadingImage}>
                  <div className="flex flex-col items-center gap-1">
                    {uploadingImage ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5 text-muted-foreground" />}
                    <span className="text-xs text-muted-foreground">{uploadingImage ? "Enviando..." : "Clique para enviar foto"}</span>
                  </div>
                </Button>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl bg-muted/30 border border-border px-4 py-3">
              <div>
                <Label className="text-sm">Visível para clientes</Label>
                <p className="text-xs text-muted-foreground">Exibir na página pública de agendamento</p>
              </div>
              <Switch checked={isPublic} onCheckedChange={setIsPublic} />
            </div>
          </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Salvando..." : plan ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
