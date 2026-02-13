import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { useBookingModal } from "@/hooks/useBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Pause, XCircle, UserPlus, Calendar, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AssignSubscriptionDialog } from "@/components/subscriptions/AssignSubscriptionDialog";

const statusColors: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pending: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  paused: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
  expired: 'bg-muted text-muted-foreground border-border',
};

const statusLabels: Record<string, string> = {
  active: 'Ativo',
  pending: 'Pendente',
  authorized: 'Autorizado',
  paused: 'Pausado',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export function SubscribersList() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const { openBookingModal } = useBookingModal();
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [subsRes, plansRes] = await Promise.all([
        supabase
          .from('customer_subscriptions')
          .select('*, customer:customers(name, phone, email), plan:subscription_plans(name, price_cents)')
          .eq('tenant_id', currentTenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('subscription_plans')
          .select('id, name')
          .eq('tenant_id', currentTenant.id),
      ]);

      // Load usage for active subscriptions
      const subs = subsRes.data || [];
      const activeSubs = subs.filter(s => s.status === 'active');
      if (activeSubs.length > 0) {
        const { data: usageData } = await supabase
          .from('subscription_usage')
          .select('subscription_id, sessions_used, sessions_limit')
          .in('subscription_id', activeSubs.map(s => s.id));

        for (const sub of subs) {
          const usage = (usageData || []).filter(u => u.subscription_id === sub.id);
          const totalUsed = usage.reduce((sum: number, u: any) => sum + u.sessions_used, 0);
          const totalLimit = usage.some((u: any) => u.sessions_limit == null) ? null : usage.reduce((sum: number, u: any) => sum + (u.sessions_limit || 0), 0);
          (sub as any).usage_summary = { used: totalUsed, limit: totalLimit };
        }
      }

      setSubscribers(subs);
      setPlans(plansRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (sub: any) => {
    try {
      await supabase.functions.invoke('mp-pause-subscription', {
        body: { subscription_id: sub.id },
      });
      toast({ title: "Assinatura pausada" });
      loadData();
    } catch (err) {
      toast({ title: "Erro ao pausar", variant: "destructive" });
    }
  };

  const handleCancel = async (sub: any) => {
    try {
      await supabase.functions.invoke('mp-cancel-subscription', {
        body: { subscription_id: sub.id },
      });
      toast({ title: "Assinatura cancelada" });
      loadData();
    } catch (err) {
      toast({ title: "Erro ao cancelar", variant: "destructive" });
    }
  };

  const handleDelete = async (sub: any) => {
    const { error } = await supabase
      .from('customer_subscriptions')
      .delete()
      .eq('id', sub.id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assinatura excluída" });
      loadData();
    }
  };

  const filtered = subscribers.filter(s => {
    if (filterPlan !== 'all' && s.plan_id !== filterPlan) return false;
    if (filterStatus !== 'all' && s.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex gap-2">
          <Select value={filterPlan} onValueChange={setFilterPlan}>
            <SelectTrigger className="w-40"><SelectValue placeholder="Plano" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os planos</SelectItem>
              {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="paused">Pausado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button size="sm" onClick={() => setShowAssignDialog(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Atribuir
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-sm text-muted-foreground">Nenhum assinante encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/30 border border-border">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground truncate">{sub.customer?.name}</span>
                  <Badge className={statusColors[sub.status] || statusColors.pending}>
                    {statusLabels[sub.status] || sub.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {sub.plan?.name} — R$ {((sub.plan?.price_cents || 0) / 100).toFixed(2)}/mês
                </div>
                {sub.usage_summary && (
                  <div className="text-xs text-muted-foreground">
                    Uso: {sub.usage_summary.used}{sub.usage_summary.limit != null ? `/${sub.usage_summary.limit}` : ''} sessões
                  </div>
                )}
                {sub.next_payment_date && (
                  <div className="text-xs text-muted-foreground">
                    Próx. cobrança: {new Date(sub.next_payment_date).toLocaleDateString('pt-BR')}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1">
                {(sub.status === 'active' || sub.status === 'authorized') && (
                  <Button variant="ghost" size="sm" title="Agendar" onClick={() => openBookingModal({
                    customerSubscriptionId: sub.id,
                    preselectedCustomerId: sub.customer_id,
                  })}>
                    <Calendar className="h-3.5 w-3.5 text-emerald-400" />
                  </Button>
                )}
                {sub.status === 'active' && (
                  <>
                    <Button variant="ghost" size="sm" onClick={() => handlePause(sub)}>
                      <Pause className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleCancel(sub)}>
                      <XCircle className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </>
                )}
                {(sub.status === 'pending' || sub.status === 'cancelled') && (
                  <Button variant="ghost" size="sm" title="Excluir assinatura" onClick={() => handleDelete(sub)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <AssignSubscriptionDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        onAssigned={loadData}
      />
    </div>
  );
}
