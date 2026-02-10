import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  customerId: string;
}

export function CustomerBalanceTab({ customerId }: Props) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<string>("credit");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    loadEntries();
  }, [customerId]);

  const loadEntries = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customer_balance_entries")
        .select("*")
        .eq("customer_id", customerId)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const balance = entries.reduce((sum, e) => {
    return sum + (e.type === "credit" ? e.amount_cents : -e.amount_cents);
  }, 0);

  const handleSave = async () => {
    if (!currentTenant || !amount) return;
    try {
      setSaving(true);
      const amountCents = Math.round(parseFloat(amount) * 100);
      if (amountCents <= 0) {
        toast({ title: "Valor inválido", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("customer_balance_entries").insert({
        tenant_id: currentTenant.id,
        customer_id: customerId,
        type,
        amount_cents: amountCents,
        description: description.trim() || null,
      });

      if (error) throw error;
      toast({ title: type === "credit" ? "Crédito adicionado" : "Débito registrado" });
      setShowForm(false);
      setAmount("");
      setDescription("");
      loadEntries();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Balance Summary */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-zinc-800/30 border border-zinc-700/50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${balance >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
            <Wallet className={`h-5 w-5 ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`} />
          </div>
          <div>
            <p className="text-xs text-zinc-500">Saldo Atual</p>
            <p className={`text-xl font-bold ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {(Math.abs(balance) / 100).toFixed(2)}
              {balance < 0 && ' (devendo)'}
            </p>
          </div>
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-1" /> Lançamento
        </Button>
      </div>

      {/* History */}
      {loading ? (
        <div className="text-center text-zinc-500 py-6 text-sm">Carregando...</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-zinc-500 py-8 text-sm">Nenhum lançamento registrado</div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/20 border border-zinc-800/30">
              <div className="flex items-center gap-3">
                {entry.type === "credit" ? (
                  <TrendingUp className="h-4 w-4 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-400" />
                )}
                <div>
                  <p className="text-sm text-zinc-200">{entry.description || (entry.type === "credit" ? "Crédito" : "Débito")}</p>
                  <p className="text-xs text-zinc-500">{format(new Date(entry.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
                </div>
              </div>
              <Badge className={`text-xs ${entry.type === "credit" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" : "bg-red-500/10 text-red-400 border-red-500/30"}`}>
                {entry.type === "credit" ? "+" : "-"} R$ {(entry.amount_cents / 100).toFixed(2)}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Add Entry Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Novo Lançamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="credit">Crédito (pagou adiantado)</SelectItem>
                  <SelectItem value="debit">Débito (ficou devendo)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Valor (R$)</Label>
              <Input type="number" step="0.01" min="0.01" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Ex: Pagamento adiantado do mês" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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
