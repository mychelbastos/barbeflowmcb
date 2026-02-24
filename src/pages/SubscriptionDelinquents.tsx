import { useTenant } from "@/hooks/useTenant";
import { useDelinquents } from "@/hooks/useSubscriptionInsights";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ReportCard } from "@/components/reports/ReportCard";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertTriangle, DollarSign, Clock, MessageCircle, Pause, X, Loader2, CheckCircle2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const formatBRL = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function SubscriptionDelinquents() {
  const { currentTenant } = useTenant();
  const { data, isLoading } = useDelinquents(currentTenant?.id);
  const { toast } = useToast();
  const qc = useQueryClient();

  const handleWhatsApp = (sub: any) => {
    const customer = sub.customer as any;
    const plan = sub.plan as any;
    const msg = encodeURIComponent(
      `Olá ${customer?.name}! 👋\n\nIdentificamos que o pagamento da sua assinatura "${plan?.name}" no valor de ${formatBRL(plan?.price_cents || 0)} está pendente.\n\nPor favor, verifique seu método de pagamento para continuar aproveitando seus benefícios.\n\nQualquer dúvida, estamos à disposição!`
    );
    window.open(`https://wa.me/55${customer?.phone}?text=${msg}`, "_blank");
  };

  const handlePause = async (subId: string) => {
    const { error } = await supabase
      .from("customer_subscriptions")
      .update({ status: "paused" })
      .eq("id", subId);
    if (error) {
      toast({ title: "Erro ao pausar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assinatura pausada" });
      qc.invalidateQueries({ queryKey: ["subscription-delinquents"] });
    }
  };

  const handleCancel = async (subId: string) => {
    const { error } = await supabase
      .from("customer_subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", subId);
    if (error) {
      toast({ title: "Erro ao cancelar", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Assinatura cancelada" });
      qc.invalidateQueries({ queryKey: ["subscription-delinquents"] });
    }
  };

  const daysOverdue = (nextPaymentDate: string) =>
    Math.max(0, Math.floor((Date.now() - new Date(nextPaymentDate).getTime()) / 86400000));

  return (
    <div className="space-y-5 px-4 md:px-0">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Inadimplentes</h1>
        <p className="text-sm text-muted-foreground">Assinantes com pagamento em atraso</p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ReportCard icon={AlertTriangle} label="Inadimplentes" value={String(data?.delinquents.length || 0)} />
            <ReportCard icon={DollarSign} label="Valor em atraso" value={formatBRL(data?.totalOverdue || 0)} />
            <ReportCard icon={Clock} label="Atraso médio" value={`${data?.avgDays || 0} dias`} />
          </div>

          {!data?.delinquents.length ? (
            <div className="text-center py-12 space-y-2">
              <CheckCircle2 className="h-10 w-10 mx-auto text-emerald-500" />
              <p className="text-sm font-medium text-foreground">Nenhum assinante inadimplente!</p>
              <p className="text-xs text-muted-foreground">Todos os pagamentos estão em dia.</p>
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="space-y-3 md:hidden">
                {data.delinquents.map((sub) => {
                  const customer = sub.customer as any;
                  const plan = sub.plan as any;
                  const days = daysOverdue(sub.next_payment_date!);
                  return (
                    <div key={sub.id} className="bg-card border border-border rounded-2xl p-4 space-y-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{customer?.name}</p>
                        <p className="text-xs text-muted-foreground">{plan?.name}</p>
                        <p className="text-sm font-medium text-foreground mt-1">
                          {formatBRL(plan?.price_cents || 0)} · <span className="text-red-500">Venceu há {days} dias</span>
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => handleWhatsApp(sub)}>
                          <MessageCircle className="h-3.5 w-3.5 mr-1" /> WhatsApp
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handlePause(sub.id)}>
                          <Pause className="h-3.5 w-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-destructive hover:text-destructive">
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                              <AlertDialogDescription>
                                A assinatura de {customer?.name} no plano "{plan?.name}" será cancelada permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Voltar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleCancel(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Cancelar assinatura
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden md:block bg-card border border-border rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead>Atraso</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.delinquents.map((sub) => {
                      const customer = sub.customer as any;
                      const plan = sub.plan as any;
                      const days = daysOverdue(sub.next_payment_date!);
                      return (
                        <TableRow key={sub.id}>
                          <TableCell className="font-medium text-sm">{customer?.name}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{plan?.name}</TableCell>
                          <TableCell className="text-sm text-right font-medium">{formatBRL(plan?.price_cents || 0)}</TableCell>
                          <TableCell className="text-sm text-red-500">{days} dias</TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-1 justify-end">
                              <Button size="sm" variant="ghost" onClick={() => handleWhatsApp(sub)} title="WhatsApp">
                                <MessageCircle className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handlePause(sub.id)} title="Pausar">
                                <Pause className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" title="Cancelar">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      A assinatura de {customer?.name} no plano "{plan?.name}" será cancelada permanentemente.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleCancel(sub.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                      Cancelar assinatura
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
