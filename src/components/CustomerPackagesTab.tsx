import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Package, CheckCircle, Clock, Loader2, XCircle, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CustomerPackagesTabProps {
  customerId: string;
}

export function CustomerPackagesTab({ customerId }: CustomerPackagesTabProps) {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customerPackages, setCustomerPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Add package
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedPkgId, setSelectedPkgId] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (customerId && currentTenant) loadData();
  }, [customerId, currentTenant]);

  const loadData = async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      // Load customer packages with package info
      const { data: cpData } = await supabase
        .from("customer_packages")
        .select("*, package:service_packages(name, price_cents)")
        .eq("customer_id", customerId)
        .eq("tenant_id", currentTenant.id)
        .order("created_at", { ascending: false });

      const pkgs = cpData || [];

      // Load per-service usage for each customer package
      for (const cp of pkgs) {
        const { data: svcUsage } = await supabase
          .from("customer_package_services")
          .select("*, service:services(name)")
          .eq("customer_package_id", cp.id);
        (cp as any).services = svcUsage || [];
      }

      setCustomerPackages(pkgs);

      // Load available packages for adding
      const { data: available } = await supabase
        .from("service_packages")
        .select("id, name, price_cents, total_sessions")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true)
        .order("name");
      setAvailablePackages(available || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmPayment = async () => {
    if (!confirmingId) return;
    try {
      const { error } = await supabase
        .from("customer_packages")
        .update({ payment_status: "confirmed" })
        .eq("id", confirmingId);
      if (error) throw error;
      toast({ title: "Pagamento confirmado!" });
      setShowConfirmDialog(false);
      setConfirmingId(null);
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAddPackage = async () => {
    if (!selectedPkgId || !currentTenant) return;
    setAdding(true);
    try {
      const pkg = availablePackages.find(p => p.id === selectedPkgId);
      if (!pkg) return;

      // Load package services
      const { data: pkgSvcs } = await supabase
        .from("package_services")
        .select("service_id, sessions_count")
        .eq("package_id", pkg.id);

      const totalSessions = (pkgSvcs || []).reduce((sum: number, s: any) => sum + s.sessions_count, 0);

      const { data: newCp, error } = await supabase
        .from("customer_packages")
        .insert({
          customer_id: customerId,
          package_id: pkg.id,
          tenant_id: currentTenant.id,
          sessions_total: totalSessions,
          sessions_used: 0,
          status: "active",
          payment_status: "pending",
        })
        .select()
        .single();
      if (error) throw error;

      // Create per-service tracking
      if (newCp && pkgSvcs && pkgSvcs.length > 0) {
        await supabase.from("customer_package_services").insert(
          pkgSvcs.map((ps: any) => ({
            customer_package_id: newCp.id,
            service_id: ps.service_id,
            sessions_total: ps.sessions_count,
            sessions_used: 0,
          }))
        );
      }

      toast({ title: "Pacote adicionado ao cliente" });
      setShowAddForm(false);
      setSelectedPkgId("");
      loadData();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">Pacotes</h3>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
        </Button>
      </div>

      {/* Add package form */}
      {showAddForm && (
        <Card>
          <CardContent className="p-3 space-y-3">
            <Select value={selectedPkgId} onValueChange={setSelectedPkgId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione um pacote" />
              </SelectTrigger>
              <SelectContent>
                {availablePackages.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} - R$ {(p.price_cents / 100).toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleAddPackage} disabled={!selectedPkgId || adding}>
                {adding ? "Adicionando..." : "Confirmar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setSelectedPkgId(""); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {customerPackages.length === 0 ? (
        <div className="text-center py-6">
          <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum pacote adquirido</p>
        </div>
      ) : (
        <div className="space-y-3">
          {customerPackages.map((cp) => (
            <Card key={cp.id} className={cp.status === "completed" ? "opacity-60" : ""}>
              <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-medium text-sm truncate">{cp.package?.name || "Pacote"}</h4>
                    <p className="text-xs text-muted-foreground">
                      Adquirido em {format(parseISO(cp.purchased_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {cp.payment_status === "confirmed" ? (
                      <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                        <CheckCircle className="h-3 w-3 mr-1" /> Pago
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] text-amber-400 bg-amber-500/10 border-amber-500/20">
                        <Clock className="h-3 w-3 mr-1" /> Pendente
                      </Badge>
                    )}
                    {cp.status === "completed" && (
                      <Badge variant="secondary" className="text-[10px]">
                        <XCircle className="h-3 w-3 mr-1" /> Esgotado
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Services usage */}
                <div className="space-y-2">
                  {(cp.services || []).map((svc: any) => {
                    const remaining = svc.sessions_total - svc.sessions_used;
                    const pct = svc.sessions_total > 0 ? (svc.sessions_used / svc.sessions_total) * 100 : 0;
                    return (
                      <div key={svc.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{svc.service?.name}</span>
                          <span className="font-medium shrink-0 ml-2">
                            {remaining}/{svc.sessions_total} restantes
                          </span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${100 - pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Actions */}
                {cp.payment_status !== "confirmed" && cp.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                    onClick={() => {
                      setConfirmingId(cp.id);
                      setShowConfirmDialog(true);
                    }}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Confirmar Pagamento
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Confirm payment dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja confirmar o pagamento deste pacote? Após confirmado, as sessões serão liberadas para uso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmingId(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPayment}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
