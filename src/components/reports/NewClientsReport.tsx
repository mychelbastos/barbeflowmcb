import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportCard } from "./ReportCard";
import { UserPlus } from "lucide-react";
import { format } from "date-fns";

interface Props { tenantId: string; startDate: string; endDate: string; }

export default function NewClientsReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-new-clients", tenantId, startDate, endDate],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, email, created_at").eq("tenant_id", tenantId).gte("created_at", startDate).lt("created_at", endDate).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={(data || []).map(d => ({ Nome: d.name, Telefone: d.phone, Email: d.email || "", Cadastro: format(new Date(d.created_at), "dd/MM/yy HH:mm") }))} columns={[{ key: "Nome", label: "Nome" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Cadastro", label: "Cadastro" }]} filename="clientes-novos" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ReportCard icon={UserPlus} label="Novos Clientes" value={String(data?.length || 0)} /></div>
      {!data?.length ? <div className="text-sm text-muted-foreground p-4">Nenhum cliente cadastrado no período.</div> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell><TableCell className="text-sm">{format(new Date(d.created_at), "dd/MM/yy")}</TableCell></TableRow>))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}
