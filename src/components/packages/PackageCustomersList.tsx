import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package, CheckCircle, Clock, XCircle } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  completed: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

const paymentColors: Record<string, string> = {
  confirmed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export function PackageCustomersList() {
  const { currentTenant } = useTenant();
  const [customerPackages, setCustomerPackages] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPackage, setFilterPackage] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

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

      // Load per-service usage
      if (cps.length > 0) {
        const { data: svcUsage } = await supabase
          .from('customer_package_services')
          .select('customer_package_id, sessions_used, sessions_total, service:services(name)')
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
                  <div className="flex items-center gap-2">
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
                  <div className="text-xs text-muted-foreground">
                    {remaining}/{totalSessions} sessões restantes
                  </div>
                  {cp.customer?.phone && (
                    <div className="text-xs text-muted-foreground">
                      Tel: {cp.customer.phone}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}