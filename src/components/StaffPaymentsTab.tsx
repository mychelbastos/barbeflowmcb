import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Wallet, DollarSign, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function StaffPaymentsTab() {
  const { currentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const { toast } = useToast();
  const [payments, setPayments] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    staff_id: "",
    type: "commission",
    amount: "",
    notes: "",
    status: "pending",
  });

  useEffect(() => {
    if (currentTenant) loadData();
  }, [currentTenant, dateRange]);

  const loadData = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const [paymentsRes, staffRes] = await Promise.all([
        supabase
          .from("staff_payments")
          .select("*, staff:staff(name)")
          .eq("tenant_id", currentTenant.id)
          .gte("created_at", dateRange.from.toISOString())
          .lte("created_at", dateRange.to.toISOString())
          .order("created_at", { ascending: false }),
        supabase
          .from("staff")
          .select("id, name")
          .eq("tenant_id", currentTenant.id)
          .eq("active", true)
          .order("name"),
      ]);
      setPayments(paymentsRes.data || []);
      setStaff(staffRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalPending = payments.filter(p => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0);
  const totalPaid = payments.filter(p => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0);

  const handleSave = async () => {
    if (!currentTenant || !formData.staff_id || !formData.amount) return;
    try {
      setSaving(true);
      const amountCents = Math.round(parseFloat(formData.amount) * 100);
      const { error } = await supabase.from("staff_payments").insert({
        tenant_id: currentTenant.id,
        staff_id: formData.staff_id,
        type: formData.type,
        amount_cents: amountCents,
        notes: formData.notes.trim() || null,
        status: formData.status,
        paid_at: formData.status === "paid" ? new Date().toISOString() : null,
        reference_period_start: dateRange.from.toISOString().split("T")[0],
        reference_period_end: dateRange.to.toISOString().split("T")[0],
      });
      if (error) throw error;
      toast({ title: "Pagamento registrado" });
      setShowForm(false);
      setFormData({ staff_id: "", type: "commission", amount: "", notes: "", status: "pending" });
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const markAsPaid = async (id: string) => {
    const { error } = await supabase
      .from("staff_payments")
      .update({ status: "paid", paid_at: new Date().toISOString() })
      .eq("id", id);
    if (!error) {
      toast({ title: "Marcado como pago" });
      loadData();
    }
  };

  const typeLabels: Record<string, string> = {
    commission: "Comissão",
    advance: "Adiantamento",
    bonus: "Bônus",
    deduction: "Desconto",
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Wallet className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pendente</p>
                <p className="text-lg font-bold text-amber-400">R$ {(totalPending / 100).toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pago</p>
                <p className="text-lg font-bold text-emerald-400">R$ {(totalPaid / 100).toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Registrar Pagamento
        </Button>
      </div>

      {/* Payments Table */}
      {payments.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Nenhum pagamento no período</div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.staff?.name}</TableCell>
                  <TableCell>{typeLabels[p.type] || p.type}</TableCell>
                  <TableCell>R$ {(p.amount_cents / 100).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge className={p.status === "paid" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-amber-500/10 text-amber-400 border-amber-500/30"}>
                      {p.status === "paid" ? "Pago" : "Pendente"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">{format(new Date(p.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    {p.status === "pending" && (
                      <Button variant="ghost" size="sm" onClick={() => markAsPaid(p.id)}>Pagar</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Form Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Profissional</Label>
              <Select value={formData.staff_id} onValueChange={(v) => setFormData(prev => ({ ...prev, staff_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={formData.type} onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="commission">Comissão</SelectItem>
                  <SelectItem value="advance">Adiantamento</SelectItem>
                  <SelectItem value="bonus">Bônus</SelectItem>
                  <SelectItem value="deduction">Desconto</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" value={formData.amount} onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v) => setFormData(prev => ({ ...prev, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando..." : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
