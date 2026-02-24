import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props { tenantId: string; }

export default function DuplicatePhoneReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-duplicate-phone", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, email").eq("tenant_id", tenantId).order("phone");
      if (!data) return [];
      const byPhone: Record<string, any[]> = {};
      for (const c of data) { const p = c.phone.replace(/\D/g, ""); if (!byPhone[p]) byPhone[p] = []; byPhone[p].push(c); }
      return Object.entries(byPhone).filter(([, v]) => v.length > 1).flatMap(([, v]) => v);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum celular duplicado encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead className="hidden md:table-cell">Email</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="hidden md:table-cell text-sm text-muted-foreground">{d.email || "—"}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
