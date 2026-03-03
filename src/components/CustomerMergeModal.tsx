import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Users, Merge, Phone, Mail, Calendar, AlertTriangle, Check } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DuplicateGroup {
  phone: string;
  customers: CustomerRecord[];
}

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  birthday: string | null;
  gender: string | null;
  cpf: string | null;
  created_at: string;
  notes: string | null;
  bookings_count?: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string;
  onMerged: () => void;
}

export function CustomerMergeModal({ open, onOpenChange, tenantId, onMerged }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<DuplicateGroup | null>(null);
  const [keepId, setKeepId] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [merging, setMerging] = useState(false);

  useEffect(() => {
    if (open && tenantId) loadDuplicates();
  }, [open, tenantId]);

  async function loadDuplicates() {
    setLoading(true);
    try {
      const { data: customers } = await supabase
        .from("customers")
        .select("id, name, phone, email, birthday, gender, cpf, created_at, notes")
        .eq("tenant_id", tenantId)
        .order("name");

      if (!customers) return;

      // Group by normalized phone
      const phoneMap = new Map<string, CustomerRecord[]>();
      customers.forEach((c) => {
        let digits = c.phone.replace(/\D/g, "");
        if (digits.startsWith("55") && digits.length >= 12) digits = digits.slice(2);
        if (digits.length === 10) digits = digits.slice(0, 2) + "9" + digits.slice(2);
        const arr = phoneMap.get(digits) || [];
        arr.push(c);
        phoneMap.set(digits, arr);
      });

      // Filter to only groups with duplicates
      const dupes: DuplicateGroup[] = [];
      for (const [phone, custs] of phoneMap) {
        if (custs.length > 1) {
          // Fetch booking counts
          const ids = custs.map((c) => c.id);
          const { data: bookingCounts } = await supabase
            .from("bookings")
            .select("customer_id")
            .eq("tenant_id", tenantId)
            .in("customer_id", ids);

          const countMap = new Map<string, number>();
          bookingCounts?.forEach((b) => {
            countMap.set(b.customer_id, (countMap.get(b.customer_id) || 0) + 1);
          });

          custs.forEach((c) => {
            c.bookings_count = countMap.get(c.id) || 0;
          });

          // Sort by bookings desc (most bookings = likely the main record)
          custs.sort((a, b) => (b.bookings_count || 0) - (a.bookings_count || 0));

          dupes.push({ phone, customers: custs });
        }
      }

      setGroups(dupes);
    } finally {
      setLoading(false);
    }
  }

  function startMerge(group: DuplicateGroup) {
    setSelectedGroup(group);
    setKeepId(group.customers[0].id); // default: most bookings
  }

  async function executeMerge() {
    if (!selectedGroup || !keepId) return;
    setMerging(true);
    try {
      const removeIds = selectedGroup.customers.filter((c) => c.id !== keepId).map((c) => c.id);

      for (const removeId of removeIds) {
        const { data, error } = await supabase.rpc("merge_customers", {
          p_tenant_id: tenantId,
          p_keep_id: keepId,
          p_remove_id: removeId,
        });

        if (error) throw error;
        if (data && !(data as any).success) throw new Error((data as any).error);
      }

      toast({ title: "Clientes unificados com sucesso!" });
      setSelectedGroup(null);
      setConfirmOpen(false);
      onMerged();
      loadDuplicates();
    } catch (err: any) {
      toast({ title: "Erro ao unificar", description: err.message, variant: "destructive" });
    } finally {
      setMerging(false);
    }
  }

  const keepCustomer = selectedGroup?.customers.find((c) => c.id === keepId);
  const removeCustomers = selectedGroup?.customers.filter((c) => c.id !== keepId) || [];

  return (
    <>
      <Dialog open={open && !selectedGroup} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Clientes Duplicados
            </DialogTitle>
            <DialogDescription>
              Clientes com o mesmo telefone que podem ser unificados.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <Check className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Nenhum cliente duplicado encontrado!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {groups.length} grupo{groups.length > 1 ? "s" : ""} de duplicados encontrado{groups.length > 1 ? "s" : ""}
              </p>
              {groups.map((group) => (
                <div
                  key={group.phone}
                  className="border border-border rounded-xl p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{group.phone}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {group.customers.length} registros
                      </Badge>
                    </div>
                    <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => startMerge(group)}>
                      <Merge className="h-3 w-3 mr-1" />
                      Unificar
                    </Button>
                  </div>
                  <div className="space-y-1">
                    {group.customers.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">{c.name}</span>
                        <span>{c.bookings_count || 0} agendamentos</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Merge detail dialog */}
      <Dialog open={!!selectedGroup} onOpenChange={(v) => !v && setSelectedGroup(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Merge className="h-5 w-5 text-primary" />
              Unificar Clientes
            </DialogTitle>
            <DialogDescription>
              Selecione qual registro manter. Os dados e agendamentos dos outros serão transferidos para ele.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4">
              <RadioGroup value={keepId} onValueChange={setKeepId}>
                {selectedGroup.customers.map((c, i) => (
                  <div
                    key={c.id}
                    className={`border rounded-xl p-3 cursor-pointer transition-colors ${
                      keepId === c.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    onClick={() => setKeepId(c.id)}
                  >
                    <div className="flex items-start gap-3">
                      <RadioGroupItem value={c.id} id={c.id} className="mt-1" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Label htmlFor={c.id} className="font-semibold text-sm cursor-pointer">
                            {c.name}
                          </Label>
                          {i === 0 && (
                            <Badge variant="default" className="text-[10px] h-4">
                              Recomendado
                            </Badge>
                          )}
                          {keepId === c.id && (
                            <Badge className="text-[10px] h-4 bg-emerald-500">
                              Manter
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" /> {c.phone}
                          </span>
                          {c.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {c.email}
                            </span>
                          )}
                          {c.birthday && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(parseISO(c.birthday), "dd/MM/yyyy", { locale: ptBR })}
                            </span>
                          )}
                          <span>{c.bookings_count || 0} agendamentos</span>
                          {c.gender && <span>Gênero: {c.gender}</span>}
                          {c.cpf && <span>CPF: {c.cpf}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </RadioGroup>

              <div className="bg-muted/40 border border-border rounded-xl p-3 text-xs text-muted-foreground space-y-1">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                  O que vai acontecer:
                </div>
                <ul className="list-disc ml-5 space-y-0.5">
                  <li>
                    <strong>{keepCustomer?.name}</strong> será mantido
                  </li>
                  {removeCustomers.map((c) => (
                    <li key={c.id}>
                      <strong>{c.name}</strong> será removido (agendamentos e dados transferidos)
                    </li>
                  ))}
                  <li>Dados faltantes serão preenchidos a partir dos registros removidos</li>
                </ul>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedGroup(null)}>
              Cancelar
            </Button>
            <Button onClick={() => setConfirmOpen(true)} className="bg-primary">
              Unificar Clientes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar unificação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Os registros duplicados serão removidos e todos os dados
              transferidos para <strong>{keepCustomer?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={merging}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={executeMerge} disabled={merging}>
              {merging ? "Unificando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
