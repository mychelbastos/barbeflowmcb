import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Package, CheckCircle, Clock, Pencil, Save, X } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-muted text-muted-foreground border-border',
};

const paymentColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

interface ServiceUsage {
  id: string;
  customer_package_id: string;
  service_id: string;
  sessions_used: number;
  sessions_total: number;
  service?: { name: string } | null;
}

export function PackageCustomersList() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customerPackages, setCustomerPackages] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPackage, setFilterPackage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Edit sessions modal
  const [editingCp, setEditingCp] = useState<any | null>(null);
  const [editServices, setEditServices] = useState<ServiceUsage[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [cpRes, pkgRes] = await Promise.all([
        supabase
          .from('customer_packages')
          .select('*, customer:customers(name, phone, email), package:service_packages(name, price_cents)')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('service_packages')
          .select('id, name')
          .eq('tenant_id', currentTenant.id),
      ]);

      const cps = cpRes.data || [];

      if (cps.length > 0) {
        const { data: svcUsage } = await supabase
          .from('customer_package_services')
          .select('id, customer_package_id, service_id, sessions_used, sessions_total, service:services(name)')
          .in('customer_package_id', cps.map(cp => cp.id));

        for (const cp of cps) {
          const usage = (svcUsage || []).filter((u: any) => u.customer_package_id === cp.id);
          (cp as any).services = usage;
        }
      }

      setCustomerPackages(cps);
      setPackages(pkgRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const openEditSessions = (cp: any) => {
    setEditingCp(cp);
    setEditServices((cp.services || []).map((s: any) => ({
      id: s.id,
      customer_package_id: s.customer_package_id,
      service_id: s.service_id,
      sessions_used: s.sessions_used,
      sessions_total: s.sessions_total,
      service: s.service,
    })));
  };

  const handleSaveEdit = async () => {
    if (!editingCp || !currentTenant) return;
    setSaving(true);
    try {
      for (const svc of editServices) {
        const { error } = await supabase
          .from('customer_package_services')
          .update({ sessions_used: svc.sessions_used })
          .eq('id', svc.id);
        if (error) throw error;
      }

      // Update package-level totals
      const totalUsed = editServices.reduce((s, sv) => s + sv.sessions_used, 0);
      const totalSessions = editServices.reduce((s, sv) => s + sv.sessions_total, 0);
      const newStatus = totalUsed >= totalSessions ? 'completed' : 'active';

      await supabase
        .from('customer_packages')
        .update({ sessions_used: totalUsed, status: newStatus })
        .eq('id', editingCp.id);

      toast({ title: "Sessões atualizadas" });
      setEditingCp(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const filtered = customerPackages.filter(cp => {
    if (filterPackage !== 'all' && cp.package_id !== filterPackage) return false;
    if (filterStatus !== 'all' && cp.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterPackage} onValueChange={setFilterPackage}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Pacote" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os pacotes</SelectItem>
            {packages.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativo</SelectItem>
            <SelectItem value="completed">Esgotado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Nenhum cliente com pacote encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cp) => {
            const totalUsed = (cp.services || []).reduce((s: number, sv: any) => s + sv.sessions_used, 0);
            const totalSessions = (cp.services || []).reduce((s: number, sv: any) => s + sv.sessions_total, 0);
            const remaining = totalSessions - totalUsed;

            return (
              <div key={cp.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm text-foreground truncate">{cp.customer?.name}</span>
                    <Badge className={statusColors[cp.status] || statusColors.active}>
                      {cp.status === 'completed' ? 'Esgotado' : 'Ativo'}
                    </Badge>
                    <Badge className={paymentColors[cp.payment_status] || paymentColors.pending}>
                      {cp.payment_status === 'confirmed' ? (
                        <><CheckCircle className="h-3 w-3 mr-1" /> Pago</>
                      ) : (
                        <><Clock className="h-3 w-3 mr-1" /> Pendente</>
                      )}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {cp.package?.name} — R$ {((cp.package?.price_cents || 0) / 100).toFixed(2)}
                  </div>
                  {/* Per-service breakdown */}
                  {(cp.services || []).map((svc: any) => (
                    <div key={svc.id} className="text-xs text-muted-foreground">
                      {svc.service?.name}: {svc.sessions_total - svc.sessions_used}/{svc.sessions_total} restantes
                    </div>
                  ))}
                  {cp.customer?.phone && (
                    <div className="text-xs text-muted-foreground">
                      Tel: {cp.customer.phone}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => openEditSessions(cp)} title="Editar sessões usadas">
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Sessions Dialog */}
      <Dialog open={!!editingCp} onOpenChange={(open) => { if (!open) setEditingCp(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar sessões usadas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Cliente: <strong>{editingCp?.customer?.name}</strong> — {editingCp?.package?.name}
            </p>
            {editServices.map((svc, idx) => (
              <div key={svc.id} className="flex items-center gap-3">
                <Label className="flex-1 text-sm truncate">{svc.service?.name}</Label>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    max={svc.sessions_total}
                    className="w-20"
                    value={svc.sessions_used}
                    onChange={(e) => {
                      const val = Math.min(parseInt(e.target.value) || 0, svc.sessions_total);
                      setEditServices(prev => prev.map((s, i) => i === idx ? { ...s, sessions_used: val } : s));
                    }}
                  />
                  <span className="text-xs text-muted-foreground">/ {svc.sessions_total}</span>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingCp(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
