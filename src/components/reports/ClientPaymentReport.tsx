import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function ClientPaymentReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-client-payment", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("cash_entries").select("payment_method, amount_cents, occurred_at, booking:booking_id(customer:customer_id(name))").eq("tenant_id", tenantId).eq("kind", "income").gte("occurred_at", startDate).lt("occurred_at", endDate).order("occurred_at", { ascending: false });
      return (data || []).map((e: any) => ({ id: Math.random().toString(), date: e.occurred_at, customer: e.booking?.customer?.name || "—", method: e.payment_method || "—", amount: e.amount_cents }));
    },
    enabled: !!tenantId,
  });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum dado no período.</div>;
  const methodLabels: Record<string,string> = { cash:"Dinheiro", pix:"Pix", credit_card:"Crédito", debit_card:"Débito", online:"Online" };
  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Data: format(new Date(d.date), "dd/MM/yy"), Cliente: d.customer, "Forma Pagamento": methodLabels[d.method]||d.method, Valor: formatBRL(d.amount) }))} columns={[{key:"Data",label:"Data"},{key:"Cliente",label:"Cliente"},{key:"Forma Pagamento",label:"Pagamento"},{key:"Valor",label:"Valor"}]} filename="pagamento-cliente" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Data</TableHead><TableHead>Cliente</TableHead><TableHead>Pagamento</TableHead><TableHead className="text-right">Valor</TableHead></TableRow></TableHeader>
          <TableBody>{data.slice(0,100).map(d => (<TableRow key={d.id}><TableCell className="text-sm">{format(new Date(d.date), "dd/MM/yy")}</TableCell><TableCell className="font-medium text-sm">{d.customer}</TableCell><TableCell className="text-sm">{methodLabels[d.method]||d.method}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.amount)}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
