import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Loader2, Trash2, Pencil, X, Eye, EyeOff, Upload, Sparkles, ImageIcon } from "lucide-react";
import { AiTextButton, AiGenerateImageButton } from "@/components/AiContentButtons";

interface PackageServiceItem {
  service_id: string;
  sessions_count: string;
}

export function ServicePackagesTab() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enhancingId, setEnhancingId] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    isPublic: true,
    photo_url: "",
  });
  const [packageServices, setPackageServices] = useState<PackageServiceItem[]>([
    { service_id: "", sessions_count: "" },
  ]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [pkgRes, svcRes] = await Promise.all([
        supabase
          .from("service_packages")
          .select("*")
          .eq("tenant_id", currentTenant.id)
          .order("name"),
        supabase
          .from("services")
          .select("id, name, price_cents")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
      ]);

      const pkgs: any[] = pkgRes.data || [];

      // Load package_services for each package
      if (pkgs.length > 0) {
        const { data: pkgSvcs } = await supabase
          .from("package_services")
          .select("*, service:services(name)")
          .in("package_id", pkgs.map((p: any) => p.id));

        // Attach services to packages
        for (const pkg of pkgs) {
          (pkg as any).package_services = (pkgSvcs || []).filter((ps: any) => ps.package_id === pkg.id);
        }
      }

      setPackages(pkgs);
      setServices(svcRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;
    try {
      setUploadingImage(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/packages/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('tenant-media').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('tenant-media').getPublicUrl(fileName);
      setFormData(prev => ({ ...prev, photo_url: publicUrl }));
      toast({ title: "Imagem enviada com sucesso" });
    } catch (error) {
      console.error('Upload error:', error);
      toast({ title: "Erro ao enviar imagem", variant: "destructive" });
    } finally {
      setUploadingImage(false);
    }
  };

  const handleEnhanceImage = async (pkg: any) => {
    if (!pkg.photo_url) { toast({ title: "Adicione uma foto primeiro", variant: "destructive" }); return; }
    try {
      setEnhancingId(pkg.id);
      toast({ title: "✨ Melhorando imagem com IA...", description: "Isso pode levar alguns segundos" });
      const { data, error } = await supabase.functions.invoke('enhance-product-image', {
        body: { item_id: pkg.id, image_url: pkg.photo_url, table: 'service_packages' },
      });
      if (error) throw error;
      if (data?.error) { toast({ title: data.error, variant: "destructive" }); return; }
      toast({ title: "Imagem melhorada com sucesso! ✨" });
      loadData();
    } catch (err) {
      console.error('Enhance error:', err);
      toast({ title: "Erro ao melhorar imagem", variant: "destructive" });
    } finally {
      setEnhancingId(null);
    }
  };

  const openCreateForm = () => {
    setEditingId(null);
    setFormData({ name: "", price: "", isPublic: true, photo_url: "" });
    setPackageServices([{ service_id: "", sessions_count: "" }]);
    setShowForm(true);
  };

  const openEditForm = (pkg: any) => {
    setEditingId(pkg.id);
    setFormData({
      name: pkg.name,
      price: (pkg.price_cents / 100).toFixed(2),
      isPublic: pkg.public !== false,
      photo_url: pkg.photo_url || "",
    });
    const svcs = (pkg.package_services || []).map((ps: any) => ({
      service_id: ps.service_id,
      sessions_count: String(ps.sessions_count),
    }));
    setPackageServices(svcs.length > 0 ? svcs : [{ service_id: "", sessions_count: "" }]);
    setShowForm(true);
  };

  const addServiceRow = () => {
    setPackageServices(prev => [...prev, { service_id: "", sessions_count: "" }]);
  };

  const removeServiceRow = (idx: number) => {
    setPackageServices(prev => prev.filter((_, i) => i !== idx));
  };

  const updateServiceRow = (idx: number, field: keyof PackageServiceItem, value: string) => {
    setPackageServices(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const handleSave = async () => {
    if (!currentTenant || !formData.name || !formData.price) return;
    const validServices = packageServices.filter(ps => ps.service_id && ps.sessions_count);
    if (validServices.length === 0) {
      toast({ title: "Adicione ao menos um serviço ao pacote", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);
      const priceCents = Math.round(parseFloat(formData.price) * 100);
      const totalSessions = validServices.reduce((sum, s) => sum + parseInt(s.sessions_count), 0);

      if (editingId) {
        // Update package
        const { error } = await supabase.from("service_packages").update({
          name: formData.name,
          price_cents: priceCents,
          total_sessions: totalSessions,
          public: formData.isPublic,
          photo_url: formData.photo_url || null,
        }).eq("id", editingId);
        if (error) throw error;

        // Delete old package_services and re-insert
        await supabase.from("package_services").delete().eq("package_id", editingId);
        const { error: psError } = await supabase.from("package_services").insert(
          validServices.map(s => ({
            package_id: editingId,
            service_id: s.service_id,
            sessions_count: parseInt(s.sessions_count),
          }))
        );
        if (psError) throw psError;
        toast({ title: "Pacote atualizado" });
      } else {
        // Create package
        const { data: newPkg, error } = await supabase.from("service_packages").insert({
          tenant_id: currentTenant.id,
          name: formData.name,
          service_id: validServices[0].service_id,
          total_sessions: totalSessions,
          price_cents: priceCents,
          public: formData.isPublic,
          photo_url: formData.photo_url || null,
        }).select().single();
        if (error) throw error;

        // Insert package_services
        const { error: psError } = await supabase.from("package_services").insert(
          validServices.map(s => ({
            package_id: newPkg.id,
            service_id: s.service_id,
            sessions_count: parseInt(s.sessions_count),
          }))
        );
        if (psError) throw psError;
        toast({ title: "Pacote criado" });
      }

      setShowForm(false);
      setEditingId(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (pkg: any) => {
    const { error } = await supabase
      .from("service_packages")
      .update({ active: !pkg.active })
      .eq("id", pkg.id);
    if (!error) {
      toast({ title: pkg.active ? "Pacote desativado" : "Pacote ativado" });
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_packages").delete().eq("id", id);
    if (!error) { toast({ title: "Pacote removido" }); loadData(); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={openCreateForm}>
          <Plus className="h-4 w-4 mr-1" /> Novo Pacote
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Nenhum pacote cadastrado</p>
          <p className="text-xs text-muted-foreground mt-1">Crie pacotes como "10 cortes + 5 barbas por R$350"</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" style={{ overflow: 'hidden' }}>
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`overflow-hidden ${!pkg.active ? "opacity-50" : ""}`}>
              {pkg.photo_url && (
                <div className="h-28 w-full overflow-hidden rounded-t-lg">
                  <img src={pkg.photo_url} alt={pkg.name} className="w-full h-full object-cover" />
                </div>
              )}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-foreground truncate">{pkg.name}</h3>
                      {pkg.public === false && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          <EyeOff className="h-3 w-3 mr-0.5" /> Privado
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-primary">
                      R$ {(pkg.price_cents / 100).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Switch
                      checked={pkg.active}
                      onCheckedChange={() => handleToggleActive(pkg)}
                    />
                  </div>
                </div>

                {/* Services in package */}
                <div className="space-y-1 mb-3">
                  {(pkg.package_services || []).map((ps: any) => (
                    <div key={ps.id} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground truncate">{ps.service?.name}</span>
                      <Badge variant="secondary" className="text-xs ml-2 shrink-0">
                        {ps.sessions_count}x
                      </Badge>
                    </div>
                  ))}
                  {(!pkg.package_services || pkg.package_services.length === 0) && (
                    <p className="text-xs text-muted-foreground">Sem serviços vinculados</p>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-1 pt-2 border-t border-border">
                  <AiGenerateImageButton
                    table="service_packages"
                    itemId={pkg.id}
                    hasImage={!!pkg.photo_url}
                    onGenerated={loadData}
                  />
                  {pkg.photo_url && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEnhanceImage(pkg)}
                      disabled={enhancingId === pkg.id}
                      className="text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                      title="Melhorar imagem com IA"
                    >
                      {enhancingId === pkg.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => openEditForm(pkg)}>
                    <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) { setShowForm(false); setEditingId(null); } }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Pacote" : "Novo Pacote"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Nome do pacote</Label>
                <AiTextButton
                  table="service_packages"
                  currentName={formData.name}
                  onResult={(title) => setFormData(p => ({ ...p, name: title }))}
                />
              </div>
              <Input
                placeholder="Ex: Pacote Completo"
                value={formData.name}
                onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
              />
            </div>

            {/* Services list */}
            <div className="space-y-2">
              <Label>Serviços inclusos</Label>
              {packageServices.map((ps, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Select value={ps.service_id} onValueChange={(v) => updateServiceRow(idx, "service_id", v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Serviço" />
                    </SelectTrigger>
                    <SelectContent>
                      {services
                        .filter(s => !packageServices.some((p, i) => i !== idx && p.service_id === s.id))
                        .map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min="1"
                    placeholder="Qtd"
                    className="w-20"
                    value={ps.sessions_count}
                    onChange={(e) => updateServiceRow(idx, "sessions_count", e.target.value)}
                  />
                  {packageServices.length > 1 && (
                    <Button variant="ghost" size="icon" className="shrink-0" onClick={() => removeServiceRow(idx)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addServiceRow} className="w-full">
                <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar serviço
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Preço total (R$)</Label>
              <CurrencyInput
                value={formData.price}
                onChange={(v) => setFormData(p => ({ ...p, price: v }))}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-2">
              <Label>Imagem do pacote</Label>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              {formData.photo_url ? (
                <div className="relative w-full h-28 rounded-lg overflow-hidden border border-border">
                  <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                  <Button type="button" variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6"
                    onClick={() => setFormData(p => ({ ...p, photo_url: "" }))}>
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
              <Switch
                checked={formData.isPublic}
                onCheckedChange={(v) => setFormData(p => ({ ...p, isPublic: v }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
