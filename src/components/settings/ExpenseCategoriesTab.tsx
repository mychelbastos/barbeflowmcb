import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

type ExpenseCategory = {
  id: string;
  name: string;
  icon: string | null;
  active: boolean;
  is_default: boolean;
  sort_order: number | null;
};

const EMOJI_OPTIONS = ["🏠", "⚡", "💧", "🌐", "📱", "🧴", "🔧", "🧹", "📢", "📋", "💰", "📦", "🛡️", "🚗", "🍽️", "🎓", "💊", "🏥", "🔒", "✂️"];

export function ExpenseCategoriesTab() {
  const { currentTenant } = useTenant();
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📦");
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    if (!currentTenant) return;
    setLoading(true);
    const { data } = await supabase
      .from("expense_categories")
      .select("*")
      .eq("tenant_id", currentTenant.id)
      .order("sort_order");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { loadCategories(); }, [currentTenant]);

  const toggleActive = async (cat: ExpenseCategory) => {
    const { error } = await supabase
      .from("expense_categories")
      .update({ active: !cat.active })
      .eq("id", cat.id);
    if (error) { toast.error("Erro ao atualizar"); return; }
    setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, active: !c.active } : c));
  };

  const handleDelete = async (cat: ExpenseCategory) => {
    if (cat.is_default) return;
    // Check if category has entries
    const { count } = await supabase
      .from("cash_entries")
      .select("id", { count: "exact", head: true })
      .eq("expense_category_id", cat.id);
    if (count && count > 0) {
      toast.error("Categoria possui despesas vinculadas e não pode ser removida.");
      return;
    }
    const { error } = await supabase.from("expense_categories").delete().eq("id", cat.id);
    if (error) { toast.error("Erro ao remover"); return; }
    setCategories(prev => prev.filter(c => c.id !== cat.id));
    toast.success("Categoria removida");
  };

  const handleCreate = async () => {
    if (!currentTenant || !newName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("expense_categories").insert({
      tenant_id: currentTenant.id,
      name: newName.trim(),
      icon: newIcon,
      is_default: false,
      sort_order: 50,
    });
    if (error) { toast.error("Erro ao criar categoria"); setSaving(false); return; }
    toast.success("Categoria criada!");
    setShowNewModal(false);
    setNewName("");
    setNewIcon("📦");
    setSaving(false);
    await loadCategories();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categorias de Despesas
          </div>
          <Button size="sm" onClick={() => setShowNewModal(true)} className="gap-1">
            <Plus className="h-4 w-4" /> Nova
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {categories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border">
              <div className="flex items-center gap-3">
                <span className="text-lg">{cat.icon || "📦"}</span>
                <span className={`text-sm font-medium ${!cat.active ? "text-muted-foreground line-through" : ""}`}>
                  {cat.name}
                </span>
                {cat.is_default && <Badge variant="outline" className="text-[10px]">Padrão</Badge>}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={cat.active} onCheckedChange={() => toggleActive(cat)} />
                {!cat.is_default && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleDelete(cat)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Nova Categoria</DialogTitle>
              <DialogDescription>Crie uma categoria personalizada para despesas.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Nome</label>
                <Input placeholder="Ex: Seguro" value={newName} onChange={e => setNewName(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Ícone</label>
                <div className="grid grid-cols-10 gap-1">
                  {EMOJI_OPTIONS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg transition-all ${newIcon === emoji ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-muted"}`}
                      onClick={() => setNewIcon(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewModal(false)}>Cancelar</Button>
              <Button onClick={handleCreate} disabled={saving || !newName.trim()}>
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Criar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
