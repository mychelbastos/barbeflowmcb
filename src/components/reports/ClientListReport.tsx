import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportCard } from "./ReportCard";
import { Users } from "lucide-react";
import { format } from "date-fns";

interface Props { tenantId: string; }

export default function ClientListReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-client-list", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, email, birthday, created_at").eq("tenant_id", tenantId).order("name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={(data || []).map(d => ({ Nome: d.name, Telefone: d.phone, Email: d.email || "", Aniversário: d.birthday || "", Cadastro: format(new Date(d.created_at), "dd/MM/yy") }))} columns={[{ key: "Nome", label: "Nome" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Aniversário", label: "Aniversário" }, { key: "Cadastro", label: "Cadastro" }]} filename="lista-clientes" /></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><ReportCard icon={Users} label="Total de Clientes" value={String(data?.length || 0)} /></div>
      {!data?.length ? <div className="text-sm text-muted-foreground p-4">Nenhum cliente cadastrado.</div> : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead className="hidden md:table-cell">Aniversário</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader>
            <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell><TableCell className="hidden md:table-cell text-sm">{d.birthday ? format(new Date(d.birthday + "T12:00:00"), "dd/MM") : "—"}</TableCell><TableCell className="text-sm">{format(new Date(d.created_at), "dd/MM/yy")}</TableCell></TableRow>))}</TableBody></Table>
        </div>
      )}
    </div>
  );
}
