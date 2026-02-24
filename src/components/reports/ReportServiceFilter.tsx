import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  tenantId: string;
  value: string;
  onChange: (v: string) => void;
}

export function ReportServiceFilter({ tenantId, value, onChange }: Props) {
  const { data: services } = useQuery({
    queryKey: ["report-services", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (!services?.length) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]">
        <SelectValue placeholder="Todos os serviços" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os serviços</SelectItem>
        {services.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
