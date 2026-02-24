import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ExportCSVButton } from "./ExportCSVButton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface Props { tenantId: string; }

export default function IncompleteClientsReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-incomplete-clients", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, email, birthday").eq("tenant_id", tenantId).order("name");
      return (data || []).filter(c => !c.email || !c.birthday).map(c => ({ ...c, missing: [!c.email && "Email", !c.birthday && "Aniversário"].filter(Boolean).join(", ") }));
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Todos os clientes possuem dados completos.</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><ExportCSVButton data={data.map(d => ({ Nome: d.name, Telefone: d.phone, Email: d.email || "—", Aniversário: d.birthday || "—", "Dados Faltantes": d.missing }))} columns={[{ key: "Nome", label: "Nome" }, { key: "Telefone", label: "Telefone" }, { key: "Email", label: "Email" }, { key: "Aniversário", label: "Aniversário" }, { key: "Dados Faltantes", label: "Faltante" }]} filename="clientes-incompletos" /></div>
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead><TableHead>Dados Faltantes</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell><TableCell><Badge variant="secondary" className="text-xs">{d.missing}</Badge></TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
