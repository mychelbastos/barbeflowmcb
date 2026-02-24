import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { formatBRL } from "@/utils/formatBRL";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props { tenantId: string; }

export default function ClientBalanceReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-client-balance", tenantId],
    queryFn: async () => {
      const { data: entries } = await supabase.from("customer_balance_entries").select("customer_id, type, amount_cents, customer:customer_id(name, phone)").eq("tenant_id", tenantId);
      if (!entries) return [];
      const grouped: Record<string, { name: string; phone: string; credit: number; debit: number }> = {};
      for (const e of entries) {
        const c = e.customer as any;
        if (!grouped[e.customer_id]) grouped[e.customer_id] = { name: c?.name || "—", phone: c?.phone || "", credit: 0, debit: 0 };
        if (e.type === "credit") grouped[e.customer_id].credit += e.amount_cents;
        else grouped[e.customer_id].debit += e.amount_cents;
      }
      return Object.entries(grouped).map(([id, v]) => ({ id, ...v, balance: v.credit - v.debit })).filter(v => v.balance !== 0).sort((a, b) => b.balance - a.balance);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum cliente com saldo.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Cliente: d.name, Telefone: d.phone, Crédito: formatBRL(d.credit), Débito: formatBRL(d.debit), Saldo: formatBRL(d.balance) }))} columns={[{ key: "Cliente", label: "Cliente" }, { key: "Telefone", label: "Telefone" }, { key: "Crédito", label: "Crédito" }, { key: "Débito", label: "Débito" }, { key: "Saldo", label: "Saldo" }]} filename="saldo-clientes" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Telefone</TableHead><TableHead className="text-right">Crédito</TableHead><TableHead className="text-right">Débito</TableHead><TableHead className="text-right">Saldo</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.credit)}</TableCell><TableCell className="text-right text-sm">{formatBRL(d.debit)}</TableCell><TableCell className="text-right"><Badge variant={d.balance > 0 ? "default" : "destructive"} className="text-xs">{formatBRL(d.balance)}</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
