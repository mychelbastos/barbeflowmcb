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

export function ReportStaffFilter({ tenantId, value, onChange }: Props) {
  const { data: staff } = useQuery({
    queryKey: ["report-staff", tenantId],
    queryFn: async () => {
      const { data } = await supabase
        .from("staff")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name");
      return data || [];
    },
    enabled: !!tenantId,
  });

  if (!staff?.length) return null;

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 text-sm w-full sm:w-[200px]">
        <SelectValue placeholder="Todos os profissionais" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos os profissionais</SelectItem>
        {staff.map((s) => (
          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
