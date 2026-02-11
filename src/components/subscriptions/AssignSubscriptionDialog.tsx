import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Copy, Loader2 } from "lucide-react";

interface AssignSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAssigned: () => void;
}

export function AssignSubscriptionDialog({ open, onOpenChange, onAssigned }: AssignSubscriptionDialogProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [useMp, setUseMp] = useState(true);
  const [saving, setSaving] = useState(false);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (open && currentTenant) {
      loadData();
      setSelectedCustomer('');
      setSelectedPlan('');
      setUseMp(true);
      setCheckoutUrl(null);
      setSearchQuery('');
    }
  }, [open, currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    const [custRes, plansRes] = await Promise.all([
      supabase.from('customers').select('id, name, phone, email').eq('tenant_id', currentTenant.id).order('name'),
      supabase.from('subscription_plans').select('id, name, price_cents').eq('tenant_id', currentTenant.id).eq('active', true),
    ]);
    setCustomers(custRes.data || []);
    setPlans(plansRes.data || []);
  };

  const filteredCustomers = customers.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.phone.includes(q);
  });

  const handleAssign = async () => {
    if (!currentTenant || !selectedCustomer || !selectedPlan) return;
    
    const customer = customers.find(c => c.id === selectedCustomer);
    
    if (useMp && !customer?.email) {
      toast({ title: "Email obrigatório", description: "O cliente precisa ter email cadastrado para assinaturas via MP.", variant: "destructive" });
      return;
    }

    try {
      setSaving(true);

      // Create customer_subscription
      const { data: sub, error } = await supabase.from('customer_subscriptions').insert({
        tenant_id: currentTenant.id,
        customer_id: selectedCustomer,
        plan_id: selectedPlan,
        status: useMp ? 'pending' : 'active',
        started_at: useMp ? null : new Date().toISOString(),
        current_period_start: useMp ? null : new Date().toISOString(),
        current_period_end: useMp ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }).select().single();

      if (error) throw error;

      if (useMp) {
        // Call edge function to create MP preapproval
        const { data: mpResult, error: mpError } = await supabase.functions.invoke('mp-create-subscription', {
          body: { subscription_id: sub.id },
        });

        if (mpError) throw mpError;

        if (mpResult?.checkout_url) {
          setCheckoutUrl(mpResult.checkout_url);
          toast({ title: "Link de assinatura gerado!" });
        }
      } else {
        // Manual - initialize usage
        const plan = plans.find(p => p.id === selectedPlan);
        toast({ title: "Assinatura ativada manualmente" });
        onAssigned();
        onOpenChange(false);
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyLink = () => {
    if (checkoutUrl) {
      navigator.clipboard.writeText(checkoutUrl);
      toast({ title: "Link copiado!" });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir Assinatura</DialogTitle>
        </DialogHeader>

        {checkoutUrl ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Envie este link para o cliente autorizar a assinatura no Mercado Pago:
            </p>
            <div className="flex items-center gap-2">
              <Input value={checkoutUrl} readOnly className="text-xs" />
              <Button size="sm" variant="outline" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={() => { onAssigned(); onOpenChange(false); }}>Fechar</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Buscar cliente</Label>
              <Input placeholder="Nome ou telefone" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger><SelectValue placeholder="Selecione o cliente" /></SelectTrigger>
                <SelectContent>
                  {filteredCustomers.slice(0, 20).map(c => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} — {c.phone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Plano</Label>
              <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} — R$ {(p.price_cents / 100).toFixed(2)}/mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <Label>Cobrar via Mercado Pago</Label>
              <Switch checked={useMp} onCheckedChange={setUseMp} />
            </div>
            {!useMp && (
              <p className="text-xs text-muted-foreground">A assinatura será marcada como ativa sem cobrança automática.</p>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={handleAssign} disabled={saving || !selectedCustomer || !selectedPlan}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : useMp ? "Gerar Link" : "Ativar"}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
