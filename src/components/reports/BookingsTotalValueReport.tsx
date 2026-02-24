import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatBRL } from "@/utils/formatBRL";
import { ReportCard } from "./ReportCard";
import { DollarSign, Receipt } from "lucide-react";
interface Props { tenantId: string; startDate: string; endDate: string; }
export default function BookingsTotalValueReport({ tenantId, startDate, endDate }: Props) {
  const { data, isLoading } = useQuery({ queryKey: ["rpt-bookings-total", tenantId, startDate, endDate], queryFn: async () => { const { data } = await supabase.from("bookings").select("id, booking_items(total_price_cents)").eq("tenant_id", tenantId).neq("status", "cancelled").gte("starts_at", startDate).lt("starts_at", endDate); if (!data) return { total: 0, count: 0 }; const total = data.reduce((s, b) => s + (b.booking_items || []).reduce((s2: number, i: any) => s2 + (i.total_price_cents || 0), 0), 0); return { total, count: data.length }; }, enabled: !!tenantId });
  if (isLoading) return <div className="text-sm text-muted-foreground p-4">Carregando...</div>;
  return (<div className="grid grid-cols-2 gap-3"><ReportCard icon={DollarSign} label="Valor Total" value={formatBRL(data?.total || 0)} /><ReportCard icon={Receipt} label="Agendamentos" value={String(data?.count || 0)} /></div>);
}
