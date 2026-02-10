import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Loader2, Users, DollarSign, Percent } from "lucide-react";

interface StaffCommission {
  staffId: string;
  staffName: string;
  serviceRevenue: number;
  serviceCommission: number;
  productRevenue: number;
  productCommission: number;
  totalCommission: number;
}

export function CommissionsTab() {
  const { currentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentTenant) calculateCommissions();
  }, [currentTenant, dateRange]);

  const calculateCommissions = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);

      // Load staff with commission settings
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, default_commission_percent, staff_services(service_id, commission_percent)")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true);

      // Load completed bookings in period
      const { data: bookings } = await supabase
        .from("bookings")
        .select("staff_id, service_id, service:services(price_cents)")
        .eq("tenant_id", currentTenant.id)
        .in("status", ["confirmed", "completed"])
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());

      // Load product sales in period
      const { data: productSales } = await supabase
        .from("product_sales")
        .select("staff_id, sale_price_snapshot_cents, quantity")
        .eq("tenant_id", currentTenant.id)
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString());

      const commissionMap: Record<string, StaffCommission> = {};

      (staffData || []).forEach((s: any) => {
        commissionMap[s.id] = {
          staffId: s.id,
          staffName: s.name,
          serviceRevenue: 0,
          serviceCommission: 0,
          productRevenue: 0,
          productCommission: 0,
          totalCommission: 0,
        };

        // Calculate service commissions
        const staffBookings = (bookings || []).filter((b: any) => b.staff_id === s.id);
        staffBookings.forEach((b: any) => {
          const price = b.service?.price_cents || 0;
          commissionMap[s.id].serviceRevenue += price;

          const staffService = s.staff_services?.find((ss: any) => ss.service_id === b.service_id);
          const commPercent = staffService?.commission_percent ?? s.default_commission_percent ?? 0;
          commissionMap[s.id].serviceCommission += Math.round(price * commPercent / 100);
        });

        // Calculate product commissions
        const staffSales = (productSales || []).filter((ps: any) => ps.staff_id === s.id);
        staffSales.forEach((ps: any) => {
          const revenue = ps.sale_price_snapshot_cents * ps.quantity;
          commissionMap[s.id].productRevenue += revenue;
          const commPercent = s.default_commission_percent ?? 0;
          commissionMap[s.id].productCommission += Math.round(revenue * commPercent / 100);
        });

        commissionMap[s.id].totalCommission =
          commissionMap[s.id].serviceCommission + commissionMap[s.id].productCommission;
      });

      setCommissions(Object.values(commissionMap).filter(c => c.serviceRevenue > 0 || c.productRevenue > 0));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalCommission = commissions.reduce((s, c) => s + c.totalCommission, 0);

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-zinc-500" /></div>;

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profissionais</p>
                <p className="text-lg font-bold">{commissions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Comissões</p>
                <p className="text-lg font-bold text-emerald-400">R$ {(totalCommission / 100).toFixed(0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {commissions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          Nenhuma comissão calculada no período. Configure os percentuais de comissão nos profissionais.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-zinc-800/50">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviços (R$)</TableHead>
                <TableHead>Comissão Serv.</TableHead>
                <TableHead>Produtos (R$)</TableHead>
                <TableHead>Comissão Prod.</TableHead>
                <TableHead>Total Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow key={c.staffId}>
                  <TableCell className="font-medium">{c.staffName}</TableCell>
                  <TableCell>R$ {(c.serviceRevenue / 100).toFixed(0)}</TableCell>
                  <TableCell className="text-emerald-400">R$ {(c.serviceCommission / 100).toFixed(0)}</TableCell>
                  <TableCell>R$ {(c.productRevenue / 100).toFixed(0)}</TableCell>
                  <TableCell className="text-emerald-400">R$ {(c.productCommission / 100).toFixed(0)}</TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      R$ {(c.totalCommission / 100).toFixed(0)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
