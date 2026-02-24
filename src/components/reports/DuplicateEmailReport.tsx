import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Props { tenantId: string; }

export default function DuplicateEmailReport({ tenantId }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["rpt-duplicate-email", tenantId],
    queryFn: async () => {
      const { data } = await supabase.from("customers").select("id, name, phone, email").eq("tenant_id", tenantId).not("email", "is", null).order("email");
      if (!data) return [];
      const byEmail: Record<string, any[]> = {};
      for (const c of data) { if (!c.email) continue; const e = c.email.toLowerCase().trim(); if (!byEmail[e]) byEmail[e] = []; byEmail[e].push(c); }
      return Object.entries(byEmail).filter(([, v]) => v.length > 1).flatMap(([, v]) => v);
    },
    enabled: !!tenantId,
  });

  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  if (!data?.length) return <div className="text-sm text-muted-foreground p-4">Nenhum e-mail duplicado encontrado.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Telefone</TableHead><TableHead>Email</TableHead></TableRow></TableHeader>
          <TableBody>{data.map(d => (<TableRow key={d.id}><TableCell className="font-medium text-sm">{d.name}</TableCell><TableCell className="text-sm">{d.phone}</TableCell><TableCell className="text-sm text-muted-foreground">{d.email}</TableCell></TableRow>))}</TableBody></Table>
      </div>
    </div>
  );
}
