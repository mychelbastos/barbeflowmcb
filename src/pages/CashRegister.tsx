import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useAuth } from "@/hooks/useAuth";
import { NoTenantState } from "@/components/NoTenantState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Loader2, DollarSign, ArrowUpCircle, ArrowDownCircle, Lock, Unlock,
  Plus, Minus, Receipt, AlertTriangle, Clock, Banknote, CreditCard, Smartphone,
  Wifi, WifiOff,
} from "lucide-react";
import { format, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { motion } from "framer-motion";

const PAYMENT_METHODS = [
  { value: "cash", label: "Dinheiro", icon: Banknote },
  { value: "pix", label: "PIX", icon: Smartphone },
  { value: "credit_card", label: "Cartão Crédito", icon: CreditCard },
  { value: "debit_card", label: "Cartão Débito", icon: CreditCard },
  { value: "other", label: "Outro", icon: Receipt },
];

const KIND_LABELS: Record<string, string> = {
  income: "Entrada",
  expense: "Saída",
  supply: "Suprimento",
  withdrawal: "Sangria",
};

const SOURCE_LABELS: Record<string, string> = {
  booking: "Agendamento",
  booking_service: "Serviço",
  booking_product: "Produto",
  product: "Produto",
  product_sale: "Produto",
  subscription: "Assinatura",
  package: "Pacote",
  package_sale: "Pacote",
  manual: "Manual",
  online: "Online",
  supply: "Suprimento",
  withdrawal: "Sangria",
  expense: "Despesa",
};

type CashSession = {
  id: string;
  tenant_id: string;
  opened_at: string;
  closed_at: string | null;
  opening_amount_cents: number;
  closing_amount_cents: number | null;
  expected_amount_cents: number | null;
  difference_cents: number | null;
  difference_reason: string | null;
  status: string;
  notes: string | null;
};

type CashEntry = {
  id: string;
  amount_cents: number;
  kind: string;
  source: string | null;
  notes: string | null;
  occurred_at: string;
  payment_method: string | null;
  session_id: string | null;
  staff_id: string | null;
  booking_id: string | null;
};

type StaffMember = {
  id: string;
  name: string;
};

export default function CashRegister() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<CashSession | null>(null);
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [history, setHistory] = useState<CashSession[]>([]);
  const [orphanEntries, setOrphanEntries] = useState<CashEntry[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  // Modals
  const [openCashModal, setOpenCashModal] = useState(false);
  const [closeCashModal, setCloseCashModal] = useState(false);
  const [entryModal, setEntryModal] = useState<"supply" | "withdrawal" | "expense" | "income" | null>(null);

  // Form state
  const [openingAmount, setOpeningAmount] = useState("");
  const [closingAmount, setClosingAmount] = useState("");
  const [closingReason, setClosingReason] = useState("");
  const [entryAmount, setEntryAmount] = useState("");
  const [entryNotes, setEntryNotes] = useState("");
  const [entryPaymentMethod, setEntryPaymentMethod] = useState("cash");
  const [entryStaffId, setEntryStaffId] = useState<string>("none");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentTenant) return;
    setLoading(true);
    try {
      // Load staff
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true)
        .order("name");
      setStaffList(staffData || []);

      // Get open session
      const { data: openSession } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "open")
        .order("opened_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      setSession(openSession);

      // Get entries for current session
      if (openSession) {
        const { data: sessionEntries } = await supabase
          .from("cash_entries")
          .select("*")
          .eq("session_id", openSession.id)
          .order("occurred_at", { ascending: false });
        setEntries(sessionEntries || []);

        // Get orphan entries (session_id IS NULL, kind=income, today)
        const todayStart = startOfDay(new Date()).toISOString();
        const todayEnd = endOfDay(new Date()).toISOString();
        const { data: orphans } = await supabase
          .from("cash_entries")
          .select("*")
          .eq("tenant_id", currentTenant.id)
          .eq("kind", "income")
          .is("session_id", null)
          .gte("occurred_at", todayStart)
          .lte("occurred_at", todayEnd)
          .order("occurred_at", { ascending: false });
        setOrphanEntries(orphans || []);
      } else {
        setEntries([]);
        setOrphanEntries([]);
      }

      // Get recent closed sessions
      const { data: recentSessions } = await supabase
        .from("cash_sessions")
        .select("*")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(10);
      setHistory(recentSessions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentTenant]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleOpenCash = async () => {
    if (!currentTenant || !user) return;
    setSubmitting(true);
    try {
      const cents = Math.round(parseFloat(openingAmount || "0") * 100);
      const { error } = await supabase.from("cash_sessions").insert({
        tenant_id: currentTenant.id,
        opening_amount_cents: cents,
        opened_by: user.id,
        status: "open",
      });
      if (error) throw error;
      toast.success("Caixa aberto com sucesso!");
      setOpenCashModal(false);
      setOpeningAmount("");
      await loadData();
    } catch (err: any) {
      toast.error("Erro ao abrir caixa: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseCash = async () => {
    if (!session || !user) return;
    setSubmitting(true);
    try {
      const closingCents = Math.round(parseFloat(closingAmount || "0") * 100);
      
      const totalIn = entries.filter(e => e.kind === "income" || e.source === "supply")
        .reduce((s, e) => s + e.amount_cents, 0);
      const totalOut = entries.filter(e => e.kind === "expense" || e.source === "withdrawal")
        .reduce((s, e) => s + e.amount_cents, 0);
      const expectedCents = session.opening_amount_cents + totalIn - totalOut;
      const diffCents = closingCents - expectedCents;

      const { error } = await supabase.from("cash_sessions").update({
        closed_at: new Date().toISOString(),
        closing_amount_cents: closingCents,
        expected_amount_cents: expectedCents,
        difference_cents: diffCents,
        difference_reason: closingReason || null,
        closed_by: user.id,
        status: "closed",
      }).eq("id", session.id);
      if (error) throw error;
      toast.success("Caixa fechado com sucesso!");
      setCloseCashModal(false);
      setClosingAmount("");
      setClosingReason("");
      await loadData();
    } catch (err: any) {
      toast.error("Erro ao fechar caixa: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddEntry = async () => {
    if (!session || !currentTenant || !entryModal) return;
    setSubmitting(true);
    try {
      const cents = Math.round(parseFloat(entryAmount || "0") * 100);
      if (cents <= 0) { toast.error("Valor deve ser maior que zero"); setSubmitting(false); return; }

      let kind: string;
      let source: string;
      if (entryModal === "supply") { kind = "income"; source = "supply"; }
      else if (entryModal === "withdrawal") { kind = "expense"; source = "withdrawal"; }
      else if (entryModal === "expense") { kind = "expense"; source = "expense"; }
      else { kind = "income"; source = "manual"; }

      // Only send staff_id for income entries (not supply/withdrawal/expense admin)
      const staffId = entryModal === "income" && entryStaffId !== "none" ? entryStaffId : null;

      const { error } = await supabase.from("cash_entries").insert({
        tenant_id: currentTenant.id,
        session_id: session.id,
        amount_cents: cents,
        kind,
        source,
        notes: entryNotes || null,
        payment_method: entryPaymentMethod,
        occurred_at: new Date().toISOString(),
        staff_id: staffId,
      });
      if (error) throw error;
      toast.success("Lançamento registrado!");
      setEntryModal(null);
      setEntryAmount("");
      setEntryNotes("");
      setEntryPaymentMethod("cash");
      setEntryStaffId("none");
      await loadData();
    } catch (err: any) {
      toast.error("Erro: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Calculations for open session
  const totalIn = entries.filter(e => e.kind === "income" || e.source === "supply")
    .reduce((s, e) => s + e.amount_cents, 0);
  const totalOut = entries.filter(e => e.kind === "expense" || e.source === "withdrawal")
    .reduce((s, e) => s + e.amount_cents, 0);
  const currentBalance = session ? session.opening_amount_cents + totalIn - totalOut : 0;

  // Group entries by payment method
  const byMethod = entries.reduce((acc, e) => {
    const m = e.payment_method || "cash";
    if (!acc[m]) acc[m] = { income: 0, expense: 0 };
    if (e.kind === "income" || e.source === "supply") acc[m].income += e.amount_cents;
    else acc[m].expense += e.amount_cents;
    return acc;
  }, {} as Record<string, { income: number; expense: number }>);

  if (tenantLoading || loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const fmt = (cents: number) => `R$ ${(cents / 100).toFixed(2)}`;

  return (
    <div className="space-y-5 px-4 md:px-0">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Caixa</h1>
          <p className="text-sm text-muted-foreground">
            Controle de caixa diário
          </p>
        </div>
        {!session ? (
          <Button onClick={() => setOpenCashModal(true)} className="gap-2">
            <Unlock className="h-4 w-4" /> Abrir Caixa
          </Button>
        ) : (
          <Button variant="destructive" onClick={() => setCloseCashModal(true)} className="gap-2">
            <Lock className="h-4 w-4" /> Fechar Caixa
          </Button>
        )}
      </div>

      {/* Active Session */}
      {session && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          {/* Status bar */}
          <Card className="border-emerald-500/30 bg-emerald-500/5">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
                <span className="font-medium text-sm">Caixa aberto</span>
                <span className="text-xs text-muted-foreground">
                  desde {format(new Date(session.opened_at), "dd/MM HH:mm", { locale: ptBR })}
                </span>
              </div>
              <Badge variant="outline" className="text-emerald-400 border-emerald-500/30">
                Abertura: {fmt(session.opening_amount_cents)}
              </Badge>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpCircle className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs text-muted-foreground">Entradas</span>
                </div>
                <p className="text-lg font-bold text-emerald-400">{fmt(totalIn)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownCircle className="h-4 w-4 text-red-400" />
                  <span className="text-xs text-muted-foreground">Saídas</span>
                </div>
                <p className="text-lg font-bold text-red-400">{fmt(totalOut)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Saldo Atual</span>
                </div>
                <p className="text-lg font-bold">{fmt(currentBalance)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Movimentações</span>
                </div>
                <p className="text-lg font-bold">{entries.length}</p>
              </CardContent>
            </Card>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="gap-2 h-12" onClick={() => setEntryModal("income")}>
              <Plus className="h-4 w-4 text-emerald-400" /> Entrada
            </Button>
            <Button variant="outline" className="gap-2 h-12" onClick={() => setEntryModal("supply")}>
              <ArrowUpCircle className="h-4 w-4 text-blue-400" /> Suprimento
            </Button>
            <Button variant="outline" className="gap-2 h-12" onClick={() => setEntryModal("withdrawal")}>
              <ArrowDownCircle className="h-4 w-4 text-amber-400" /> Sangria
            </Button>
            <Button variant="outline" className="gap-2 h-12" onClick={() => setEntryModal("expense")}>
              <Minus className="h-4 w-4 text-red-400" /> Despesa
            </Button>
          </div>

          {/* ========== Orphan entries (online without session) ========== */}
          {orphanEntries.length > 0 && (
            <Card className="border-blue-500/30 bg-blue-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <WifiOff className="h-4 w-4 text-blue-400" />
                  <h3 className="text-sm font-semibold text-blue-400">
                    Receitas Online (fora da sessão)
                  </h3>
                  <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-[10px]">
                    {orphanEntries.length}
                  </Badge>
                </div>
                <p className="text-[11px] text-muted-foreground mb-3">
                  Pagamentos recebidos quando o caixa estava fechado. Não entram no saldo da sessão.
                </p>
                <div className="space-y-1.5">
                  {orphanEntries.map(e => (
                    <div key={e.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
                      <div className="flex items-center gap-2">
                        <Wifi className="h-3 w-3 text-blue-400" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(e.occurred_at), "HH:mm")}
                        </span>
                        <span className="text-xs">
                          {SOURCE_LABELS[e.source || ""] || e.source || "Online"}
                        </span>
                        {e.booking_id && (
                          <span className="text-[10px] text-muted-foreground/70 font-mono">
                            {e.booking_id.substring(0, 8)}…
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-blue-400 border-blue-500/20 text-[10px]">
                          Online sem sessão
                        </Badge>
                        <span className="text-sm font-bold text-blue-400">+{fmt(e.amount_cents)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-1">
                    <span className="text-xs text-muted-foreground">
                      Total: <span className="font-bold text-blue-400">
                        {fmt(orphanEntries.reduce((s, e) => s + e.amount_cents, 0))}
                      </span>
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Breakdown by payment method */}
          {Object.keys(byMethod).length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Por Meio de Pagamento</h3>
                <div className="space-y-2">
                  {Object.entries(byMethod).map(([method, vals]) => {
                    const methodInfo = PAYMENT_METHODS.find(m => m.value === method);
                    const Icon = methodInfo?.icon || Receipt;
                    return (
                      <div key={method} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/20">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{methodInfo?.label || method}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          {vals.income > 0 && <span className="text-emerald-400">+{fmt(vals.income)}</span>}
                          {vals.expense > 0 && <span className="text-red-400">-{fmt(vals.expense)}</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entries list */}
          {entries.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Movimentações do Dia</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Hora</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Origem</TableHead>
                        <TableHead>Meio</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Obs</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-xs">
                            {format(new Date(e.occurred_at), "HH:mm")}
                          </TableCell>
                          <TableCell>
                            <Badge variant={e.kind === "income" || e.source === "supply" ? "default" : "destructive"} className="text-xs">
                              {KIND_LABELS[e.kind] || e.kind}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs">
                            {SOURCE_LABELS[e.source || ""] || e.source || "-"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {PAYMENT_METHODS.find(m => m.value === e.payment_method)?.label || e.payment_method || "-"}
                          </TableCell>
                          <TableCell className={`font-medium ${e.kind === "income" || e.source === "supply" ? "text-emerald-400" : "text-red-400"}`}>
                            {e.kind === "income" || e.source === "supply" ? "+" : "-"}{fmt(e.amount_cents)}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                            {e.notes || "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* No active session */}
      {!session && (
        <div className="space-y-4">
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Lock className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold mb-1">Caixa Fechado</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Abra o caixa para começar a registrar movimentações do dia.
              </p>
              <Button onClick={() => setOpenCashModal(true)} className="gap-2">
                <Unlock className="h-4 w-4" /> Abrir Caixa
              </Button>
            </CardContent>
          </Card>

          {/* History */}
          {history.length > 0 && (
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">Histórico de Caixas</h3>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Abertura</TableHead>
                        <TableHead>Fechamento</TableHead>
                        <TableHead>Esperado</TableHead>
                        <TableHead>Diferença</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell className="text-xs">
                            {format(new Date(s.opened_at), "dd/MM/yyyy", { locale: ptBR })}
                          </TableCell>
                          <TableCell className="text-xs">{fmt(s.opening_amount_cents)}</TableCell>
                          <TableCell className="text-xs">{s.closing_amount_cents != null ? fmt(s.closing_amount_cents) : "-"}</TableCell>
                          <TableCell className="text-xs">{s.expected_amount_cents != null ? fmt(s.expected_amount_cents) : "-"}</TableCell>
                          <TableCell>
                            {s.difference_cents != null ? (
                              <span className={`text-xs font-medium ${s.difference_cents === 0 ? "text-emerald-400" : s.difference_cents > 0 ? "text-blue-400" : "text-red-400"}`}>
                                {s.difference_cents > 0 ? "+" : ""}{fmt(s.difference_cents)}
                              </span>
                            ) : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Open Cash Modal */}
      <Dialog open={openCashModal} onOpenChange={setOpenCashModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Abrir Caixa</DialogTitle>
            <DialogDescription>Informe o valor inicial em dinheiro no caixa.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor Inicial (R$)</label>
              <Input
                type="number" step="0.01" min="0" placeholder="0,00"
                value={openingAmount} onChange={e => setOpeningAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCashModal(false)}>Cancelar</Button>
            <Button onClick={handleOpenCash} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Unlock className="h-4 w-4 mr-2" />}
              Abrir Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Cash Modal */}
      <Dialog open={closeCashModal} onOpenChange={setCloseCashModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Fechar Caixa</DialogTitle>
            <DialogDescription>Informe o valor contado para fechamento.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground">Abertura</p>
                <p className="font-bold">{fmt(session?.opening_amount_cents || 0)}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border">
                <p className="text-xs text-muted-foreground">Esperado</p>
                <p className="font-bold">{fmt(currentBalance)}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Valor Contado (R$)</label>
              <Input
                type="number" step="0.01" min="0" placeholder="0,00"
                value={closingAmount} onChange={e => setClosingAmount(e.target.value)}
              />
            </div>
            {closingAmount && Math.round(parseFloat(closingAmount) * 100) !== currentBalance && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-4 w-4 text-amber-400" />
                  <span className="text-sm font-medium text-amber-400">
                    Diferença: {fmt(Math.round(parseFloat(closingAmount) * 100) - currentBalance)}
                  </span>
                </div>
                <Textarea
                  placeholder="Motivo da diferença..."
                  value={closingReason} onChange={e => setClosingReason(e.target.value)}
                  rows={2}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCloseCashModal(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={handleCloseCash} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              Fechar Caixa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Entry Modal (supply/withdrawal/expense/income) */}
      <Dialog open={!!entryModal} onOpenChange={() => setEntryModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {entryModal === "supply" && "Suprimento"}
              {entryModal === "withdrawal" && "Sangria"}
              {entryModal === "expense" && "Despesa"}
              {entryModal === "income" && "Entrada Manual"}
            </DialogTitle>
            <DialogDescription>
              {entryModal === "supply" && "Registrar entrada de dinheiro no caixa."}
              {entryModal === "withdrawal" && "Registrar retirada de dinheiro do caixa."}
              {entryModal === "expense" && "Registrar despesa com motivo obrigatório."}
              {entryModal === "income" && "Registrar recebimento manual."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Valor (R$)</label>
              <Input
                type="number" step="0.01" min="0" placeholder="0,00"
                value={entryAmount} onChange={e => setEntryAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Meio de Pagamento</label>
              <Select value={entryPaymentMethod} onValueChange={setEntryPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map(m => (
                    <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Staff selector — only for manual income */}
            {entryModal === "income" && (
              <div>
                <label className="text-sm font-medium mb-1 block">Profissional (opcional)</label>
                <Select value={entryStaffId} onValueChange={setEntryStaffId}>
                  <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {staffList.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <label className="text-sm font-medium mb-1 block">
                Observação {entryModal === "expense" && <span className="text-red-400">*</span>}
              </label>
              <Textarea
                placeholder={entryModal === "expense" ? "Motivo da despesa (obrigatório)" : "Observação (opcional)"}
                value={entryNotes} onChange={e => setEntryNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEntryModal(null)}>Cancelar</Button>
            <Button
              onClick={handleAddEntry}
              disabled={submitting || (entryModal === "expense" && !entryNotes.trim())}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
