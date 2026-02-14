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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Users, DollarSign, ChevronRight, Info } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";

type CommissionBasis = "theoretical" | "received";

interface BookingDetail {
  id: string;
  starts_at: string;
  service_name: string;
  price_cents: number;
  received_cents: number;
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
  const { currentTenant, setCurrentTenant } = useTenant();
  const { dateRange } = useDateRange();
  const [commissions, setCommissions] = useState<StaffCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState<StaffCommission | null>(null);

  const commissionBasis: CommissionBasis =
    (currentTenant?.settings as any)?.commission_basis || "theoretical";

  useEffect(() => {
    if (currentTenant) calculateCommissions();
  }, [currentTenant, dateRange]);

  const handleBasisChange = async (value: CommissionBasis) => {
    if (!currentTenant) return;
    const newSettings = { ...(currentTenant.settings as any), commission_basis: value };
    const { error } = await supabase
      .from("tenants")
      .update({ settings: newSettings })
      .eq("id", currentTenant.id);
    if (!error) {
      setCurrentTenant({ ...currentTenant, settings: newSettings });
    }
  };

  const calculateCommissions = async () => {
    if (!currentTenant) return;
    try {
      setLoading(true);
      const basis: CommissionBasis =
        (currentTenant.settings as any)?.commission_basis || "theoretical";

      const fromISO = dateRange.from.toISOString();
      const toISO = dateRange.to.toISOString();

      // 1) Staff with their commission config
      const { data: staffData } = await supabase
        .from("staff")
        .select("id, name, default_commission_percent, product_commission_percent, is_owner, staff_services(service_id, commission_percent)")
        .eq("tenant_id", currentTenant.id)
        .eq("active", true);

      // 2) Completed bookings in period
      const { data: bookings } = await supabase
        .from("bookings")
        .select("id, staff_id, service_id, starts_at, customer_package_id, customer_subscription_id, service:services(name, price_cents)")
        .eq("tenant_id", currentTenant.id)
        .eq("status", "completed")
        .gte("starts_at", fromISO)
        .lte("starts_at", toISO);

      // 3) Product sales (always theoretical)
      const { data: productSales } = await supabase
        .from("product_sales")
        .select("id, staff_id, sale_price_snapshot_cents, quantity, sale_date, product:products(name)")
        .eq("tenant_id", currentTenant.id)
        .gte("sale_date", fromISO)
        .lte("sale_date", toISO);

      // 4) If "received", use the consolidated SQL view filtered by same period
      let receivedByBooking: Record<string, number> = {};

      if (basis === "received") {
        const { data: receivedData } = await supabase
          .from("v_booking_received_amount")
          .select("booking_id, received_cents")
          .eq("tenant_id", currentTenant.id)
          .gte("starts_at", fromISO)
          .lte("starts_at", toISO);

        (receivedData || []).forEach((r: any) => {
          receivedByBooking[r.booking_id] = r.received_cents ?? 0;
        });
      }

      // 5) Calculate commissions per staff
      const commissionMap: Record<string, StaffCommission> = {};

      (staffData || []).forEach((s: any) => {
        if (s.is_owner) return;

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

        // Service commissions
        const staffBookings = (bookings || []).filter((b: any) => b.staff_id === s.id);
        staffBookings.forEach((b: any) => {
          const theoreticalPrice = b.service?.price_cents || 0;

          let commissionBase: number;
          if (basis === "received") {
            commissionBase = receivedByBooking[b.id] ?? 0;
          } else {
            commissionBase = theoreticalPrice;
          }

          commissionMap[s.id].serviceRevenue += commissionBase;

          const staffService = s.staff_services?.find((ss: any) => ss.service_id === b.service_id);
          const commPercent = staffService?.commission_percent ?? servicePercent;
          const commCents = Math.round(commissionBase * commPercent / 100);
          commissionMap[s.id].serviceCommission += commCents;

          commissionMap[s.id].bookingDetails.push({
            id: b.id,
            starts_at: b.starts_at,
            service_name: b.service?.name || "Serviço",
            price_cents: theoreticalPrice,
            received_cents: basis === "received" ? (receivedByBooking[b.id] ?? 0) : theoreticalPrice,
            commission_cents: commCents,
          });
        });

        // Product commissions (always theoretical — no received tracking per product yet)
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

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      {/* Mode Selector */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-medium">Base de cálculo:</span>
              <Select value={commissionBasis} onValueChange={(v) => handleBasisChange(v as CommissionBasis)}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="theoretical">Teórico (preço tabela)</SelectItem>
                  <SelectItem value="received">Recebido (valor pago)</SelectItem>
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>Teórico:</strong> comissão sobre o preço do serviço na tabela.</p>
                    <p><strong>Recebido:</strong> comissão sobre o valor efetivamente pago (online ou local).</p>
                    <p className="text-xs text-muted-foreground mt-1">Produtos sempre usam valor teórico.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge variant={commissionBasis === "received" ? "success" : "secondary"} className="self-start">
              {commissionBasis === "received" ? "💰 Recebido" : "📋 Teórico"}
            </Badge>
          </div>
        </CardContent>
      </Card>

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
        <div className="overflow-x-auto rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Serviços (R$)</TableHead>
                <TableHead>Com. Serv.</TableHead>
                <TableHead>Produtos (R$)</TableHead>
                <TableHead>Com. Prod.</TableHead>
                <TableHead>Total</TableHead>
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

      {/* Detail Modal */}
      <Dialog open={!!selectedStaff} onOpenChange={() => setSelectedStaff(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Detalhes — {selectedStaff?.staffName}
              <Badge variant="secondary" className="text-xs">
                {commissionBasis === "received" ? "Recebido" : "Teórico"}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {selectedStaff && (
            <div className="space-y-6">
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

              {selectedStaff.bookingDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Serviços ({selectedStaff.bookingDetails.length})</h4>
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
                          {commissionBasis === "received" && b.received_cents !== b.price_cents && (
                            <span className="text-xs text-muted-foreground line-through">
                              R$ {(b.price_cents / 100).toFixed(2)}
                            </span>
                          )}
                          <span>R$ {(b.received_cents / 100).toFixed(2)}</span>
                          <span className="text-emerald-400 text-xs">+R$ {(b.commission_cents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedStaff.productDetails.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-2">Produtos ({selectedStaff.productDetails.length})</h4>
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
                  {commissionBasis === "received" && (
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Produtos usam valor teórico (sem rastreio de recebimento por venda).
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
