import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Users, DollarSign, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BookingDetail {
  id: string;
  starts_at: string;
  service_name: string;
  price_cents: number;
  commission_cents: number;
}

interface ProductSaleDetail {
  id: string;
  sale_date: string;
  product_name: string;
  revenue_cents: number;
  commission_cents: number;
}

interface StaffCommission {
  staffId: string;
  staffName: string;
  isOwner: boolean;
  serviceRevenue: number;
  serviceCommission: number;
  servicePercent: number;
  productRevenue: number;
  productCommission: number;
  productPercent: number;
  totalCommission: number;
  bookingDetails: BookingDetail[];
  productDetails: ProductSaleDetail[];
}

export function CommissionsTab() {
  const { currentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommission | null>(null);

  useEffect(() => {
    if (currentTenant) calculateCommissions();
  }, [currentTenant, dateRange]);

  const calculateCommissions = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, default_commission_percent, product_commission_percent, is_owner, staff_services(service_id, commission_percent)")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true);

      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, staff_id, service_id, starts_at, service:services(name, price_cents)")
        .eq("tenant_id", currentTenant.id)
        .in("status", ["confirmed", "completed"])
        .gte("starts_at", dateRange.from.toISOString())
        .lte("starts_at", dateRange.to.toISOString());

      const { data: productSales } = await supabase
        .from("product_sales")
        .select("id, staff_id, sale_price_snapshot_cents, quantity, sale_date, product:products(name)")
        .eq("tenant_id", currentTenant.id)
        .gte("sale_date", dateRange.from.toISOString())
        .lte("sale_date", dateRange.to.toISOString());

      const commissionMap: Record<string, StaffCommission> = {};

      (staffData || []).forEach((s: any) => {
        if (s.is_owner) return; // Owner doesn't get commission

        const servicePercent = s.default_commission_percent ?? 0;
        const productPercent = s.product_commission_percent ?? 0;

        commissionMap[s.id] = {
          staffId: s.id,
          staffName: s.name,
          isOwner: s.is_owner || false,
          serviceRevenue: 0,
          serviceCommission: 0,
          servicePercent,
          productRevenue: 0,
          productCommission: 0,
          productPercent,
          totalCommission: 0,
          bookingDetails: [],
          productDetails: [],
        };

        // Calculate service commissions
        const staffBookings = (bookings || []).filter((b: any) => b.staff_id === s.id);
        staffBookings.forEach((b: any) => {
          const price = b.service?.price_cents || 0;
          commissionMap[s.id].serviceRevenue += price;

          const staffService = s.staff_services?.find((ss: any) => ss.service_id === b.service_id);
          const commPercent = staffService?.commission_percent ?? servicePercent;
          const commCents = Math.round(price * commPercent / 100);
          commissionMap[s.id].serviceCommission += commCents;

          commissionMap[s.id].bookingDetails.push({
            id: b.id,
            starts_at: b.starts_at,
            service_name: b.service?.name || "Serviço",
            price_cents: price,
            commission_cents: commCents,
          });
        });

        // Calculate product commissions
        const staffSales = (productSales || []).filter((ps: any) => ps.staff_id === s.id);
        staffSales.forEach((ps: any) => {
          const revenue = ps.sale_price_snapshot_cents * ps.quantity;
          commissionMap[s.id].productRevenue += revenue;
          const commCents = Math.round(revenue * productPercent / 100);
          commissionMap[s.id].productCommission += commCents;

          commissionMap[s.id].productDetails.push({
            id: ps.id,
            sale_date: ps.sale_date,
            product_name: ps.product?.name || "Produto",
            revenue_cents: revenue,
            commission_cents: commCents,
          });
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
                <p className="text-lg font-bold text-emerald-400">R$ {(totalCommission / 100).toFixed(2)}</p>
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
                <TableHead>Com. Serv. ({`%`})</TableHead>
                <TableHead>Produtos (R$)</TableHead>
                <TableHead>Com. Prod. ({`%`})</TableHead>
                <TableHead>Total Comissão</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {commissions.map((c) => (
                <TableRow
                  key={c.staffId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedStaff(c)}
                >
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {c.staffName}
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </TableCell>
                  <TableCell>R$ {(c.serviceRevenue / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-400">
                    R$ {(c.serviceCommission / 100).toFixed(2)}
                    <span className="text-xs text-muted-foreground ml-1">({c.servicePercent}%)</span>
                  </TableCell>
                  <TableCell>R$ {(c.productRevenue / 100).toFixed(2)}</TableCell>
                  <TableCell className="text-emerald-400">
                    R$ {(c.productCommission / 100).toFixed(2)}
                    {c.productPercent > 0 && <span className="text-xs text-muted-foreground ml-1">({c.productPercent}%)</span>}
                  </TableCell>
                  <TableCell>
                    <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30">
                      R$ {(c.totalCommission / 100).toFixed(2)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Detail Breakdown Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes — {selectedStaff?.staffName}
            </DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Serviços</p>
                  <p className="font-bold">R$ {(selectedStaff.serviceRevenue / 100).toFixed(2)}</p>
                  <p className="text-xs text-emerald-400">Com: R$ {(selectedStaff.serviceCommission / 100).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Produtos</p>
                  <p className="font-bold">R$ {(selectedStaff.productRevenue / 100).toFixed(2)}</p>
                  <p className="text-xs text-emerald-400">Com: R$ {(selectedStaff.productCommission / 100).toFixed(2)}</p>
                </div>
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-center">
                  <p className="text-xs text-muted-foreground">Total a Pagar</p>
                  <p className="font-bold text-emerald-400">R$ {(selectedStaff.totalCommission / 100).toFixed(2)}</p>
                </div>
              </div>

              {/* Services breakdown */}
              {selectedStaff.bookingDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Serviços Realizados ({selectedStaff.bookingDetails.length})</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStaff.bookingDetails.map((b) => (
                      <div key={b.id} className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-muted/20">
                        <div>
                          <span className="font-medium">{b.service_name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {format(new Date(b.starts_at), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>R$ {(b.price_cents / 100).toFixed(2)}</span>
                          <span className="text-emerald-400 text-xs">+R$ {(b.commission_cents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Products breakdown */}
              {selectedStaff.productDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Produtos Vendidos ({selectedStaff.productDetails.length})</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {selectedStaff.productDetails.map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 px-3 text-sm rounded-lg bg-muted/20">
                        <div>
                          <span className="font-medium">{p.product_name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {format(new Date(p.sale_date), "dd/MM", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span>R$ {(p.revenue_cents / 100).toFixed(2)}</span>
                          <span className="text-emerald-400 text-xs">+R$ {(p.commission_cents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
