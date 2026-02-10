import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Package, Loader2, Trash2 } from "lucide-react";

export function ServicePackagesTab() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [packages, setPackages] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    service_id: "",
    total_sessions: "",
    price: "",
  });

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
          .select("*, service:services(name)")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
        supabase
          .from("services")
          .select("id, name, price_cents")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
      ]);
      setPackages(pkgRes.data || []);
      setServices(svcRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentTenant || !formData.name || !formData.service_id || !formData.total_sessions || !formData.price) return;
    try {
      setSaving(true);
      const { error } = await supabase.from("service_packages").insert({
        tenant_id: currentTenant.id,
        name: formData.name,
        service_id: formData.service_id,
        total_sessions: parseInt(formData.total_sessions),
        price_cents: Math.round(parseFloat(formData.price) * 100),
      });
      if (error) throw error;
      toast({ title: "Pacote criado" });
      setShowForm(false);
      setFormData({ name: "", service_id: "", total_sessions: "", price: "" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("service_packages").update({ active: false }).eq("id", id);
    if (!error) { toast({ title: "Pacote removido" }); loadData(); }
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Pacote
        </Button>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-zinc-600 mb-4" />
          <p className="text-sm text-zinc-500">Nenhum pacote cadastrado</p>
          <p className="text-xs text-zinc-600 mt-1">Crie pacotes como "10 cortes por R$250"</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {packages.map((pkg) => (
            <Card key={pkg.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">{pkg.name}</h3>
                    <p className="text-sm text-muted-foreground">{pkg.service?.name}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary">{pkg.total_sessions} sessões</Badge>
                      <span className="text-sm font-semibold text-emerald-400">
                        R$ {(pkg.price_cents / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(pkg.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Pacote</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do pacote</Label>
              <Input placeholder="Ex: Pacote 10 Cortes" value={formData.name} onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Serviço</Label>
              <Select value={formData.service_id} onValueChange={(v) => setFormData(p => ({ ...p, service_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {services.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name} - R$ {(s.price_cents / 100).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Qtd. sessões</Label>
                <Input type="number" min="1" value={formData.total_sessions} onChange={(e) => setFormData(p => ({ ...p, total_sessions: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Preço total (R$)</Label>
                <Input type="number" step="0.01" min="0" value={formData.price} onChange={(e) => setFormData(p => ({ ...p, price: e.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
