import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SubscriptionPlanForm } from "@/components/subscriptions/SubscriptionPlanForm";
import { SubscriptionPlanCard } from "@/components/subscriptions/SubscriptionPlanCard";
import { SubscribersList } from "@/components/subscriptions/SubscribersList";
import { Button } from "@/components/ui/button";
import { Plus, CreditCard, Loader2 } from "lucide-react";

export default function SubscriptionPlansPage() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [plans, setPlans] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [plansRes, servicesRes] = await Promise.all([
        supabase.from('subscription_plans').select('*').eq('tenant_id', currentTenant.id).order('name'),
        supabase.from('services').select('id, name, price_cents').eq('tenant_id', currentTenant.id).eq('active', true).order('name'),
      ]);

      const plansData = plansRes.data || [];

      // Load plan services
      if (plansData.length > 0) {
        const { data: planServices } = await supabase
          .from('subscription_plan_services')
          .select('*, service:services(name)')
          .in('plan_id', plansData.map(p => p.id));

        // Load subscriber counts
        const { data: subCounts } = await supabase
          .from('customer_subscriptions')
          .select('plan_id, status')
          .in('plan_id', plansData.map(p => p.id))
          .in('status', ['active', 'authorized']);

        for (const plan of plansData) {
          (plan as any).plan_services = (planServices || []).filter((ps: any) => ps.plan_id === plan.id);
          (plan as any).active_subscribers = (subCounts || []).filter((s: any) => s.plan_id === plan.id).length;
        }
      }

      setPlans(plansData);
      setServices(servicesRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (plan: any) => {
    const { error } = await supabase
      .from('subscription_plans')
      .update({ active: !plan.active })
      .eq('id', plan.id);
    if (!error) {
      toast({ title: plan.active ? "Plano desativado" : "Plano ativado" });
      loadData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('subscription_plans').delete().eq('id', id);
    if (!error) { toast({ title: "Plano removido" }); loadData(); }
  };

  const handleEdit = (plan: any) => {
    setEditingPlan(plan);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleFormSaved = () => {
    handleFormClose();
    loadData();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Assinaturas</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gerencie planos de assinatura recorrente para seus clientes
        </p>
      </div>

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Planos</TabsTrigger>
          <TabsTrigger value="subscribers">Assinantes</TabsTrigger>
        </TabsList>

        <TabsContent value="plans">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button size="sm" onClick={() => { setEditingPlan(null); setShowForm(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Novo Plano
              </Button>
            </div>

            {plans.length === 0 ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">Nenhum plano de assinatura cadastrado</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Crie planos como "Corte Mensal R$89,90/mês"
                </p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {plans.map((plan) => (
                  <SubscriptionPlanCard
                    key={plan.id}
                    plan={plan}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onToggleActive={handleToggleActive}
                  />
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="subscribers">
          <SubscribersList />
        </TabsContent>
      </Tabs>

      <SubscriptionPlanForm
        open={showForm}
        onOpenChange={(open) => { if (!open) handleFormClose(); }}
        plan={editingPlan}
        services={services}
        onSaved={handleFormSaved}
      />
    </div>
  );
}
