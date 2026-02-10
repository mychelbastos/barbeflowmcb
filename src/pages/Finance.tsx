import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Products from "@/pages/Products";
import { CommissionsTab } from "@/components/CommissionsTab";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  Users,
  FileText,
  Download,
  DollarSign,
  Clock,
  Target,
  Package,
  ShoppingCart
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinanceData {
  revenue_expected: number;
  revenue_received: number;
  bookings_count: number;
  no_show_rate: number;
  avg_ticket: number;
  daily_revenue: { date: string; expected: number; received: number; }[];
  top_services: { name: string; revenue: number; count: number; }[];
  staff_performance: { name: string; revenue: number; bookings: number; }[];
  product_sales_revenue: number;
  product_sales_profit: number;
  top_products: { name: string; revenue: number; profit: number; quantity: number; }[];
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Finance() {
  const { user } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { dateRange } = useDateRange();
  const [data, setData] = useState<FinanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [staffFilter, setStaffFilter] = useState<string>('all');
  const [staff, setStaff] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  useEffect(() => {
    if (currentTenant) {
      loadFinanceData();
      loadStaff();
    }
  }, [currentTenant, dateRange, staffFilter]);

  const loadStaff = async () => {
    if (!currentTenant) return;

    const { data } = await supabase
      .from('staff')
      .select('id, name')
      .eq('tenant_id', currentTenant.id)
      .eq('active', true)
      .order('name');

    setStaff(data || []);
  };

  const loadFinanceData = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);

      // Build query filters using global date range
      let query = supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, price_cents),
          staff:staff(name),
          customer:customers(name, phone)
        `)
        .eq('tenant_id', currentTenant.id)
        .in('status', ['confirmed', 'completed']) // Confirmed and completed bookings for financial calculations
        .gte('starts_at', dateRange.from.toISOString())
        .lte('starts_at', dateRange.to.toISOString());

      if (staffFilter && staffFilter !== 'all') {
        query = query.eq('staff_id', staffFilter);
      }

      const { data: bookingsData, error } = await query.order('starts_at');

      if (error) throw error;

      setBookings(bookingsData || []);
      await calculateFinanceMetrics(bookingsData || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinanceMetrics = async (bookingsData: any[]) => {
    // Separate confirmed (future) from completed (past) bookings
    const now = new Date();
    const confirmedBookings = bookingsData.filter(b => b.status === 'confirmed');
    const completedBookings = bookingsData.filter(b => b.status === 'completed');
    
    // Load all bookings in period to calculate no-show rate
    const loadAllBookingsForNoShow = async () => {
      const { data: allBookings } = await supabase
        .from('bookings')
        .select('status')
        .eq('tenant_id', currentTenant!.id)
        .gte('starts_at', dateRange.from.toISOString())
        .lte('starts_at', dateRange.to.toISOString());
        
      const noShowBookings = allBookings?.filter(b => b.status === 'no_show') || [];
      const totalBookings = allBookings?.length || 0;
      
      return totalBookings > 0 ? (noShowBookings.length / totalBookings) * 100 : 0;
    };

    // Revenue expected from all confirmed and completed bookings
    let revenueExpected = bookingsData.reduce((sum, booking) => 
      sum + (booking.service?.price_cents || 0), 0
    );

    // Calculate actual revenue received from payments table
    const loadPaymentsData = async () => {
      const bookingIds = completedBookings.map(b => b.id);
      
      if (bookingIds.length === 0) {
        return 0;
      }

      const { data: payments } = await supabase
        .from('payments')
        .select('amount_cents, status')
        .in('booking_id', bookingIds)
        .eq('status', 'paid');

      return payments?.reduce((sum, payment) => sum + payment.amount_cents, 0) || 0;
    };

    // Load product sales for the period
    const loadProductSales = async () => {
      const { data: productSales } = await supabase
        .from('product_sales')
        .select('sale_price_snapshot_cents, purchase_price_snapshot_cents, quantity, product:products(name)')
        .eq('tenant_id', currentTenant!.id)
        .gte('sale_date', dateRange.from.toISOString())
        .lte('sale_date', dateRange.to.toISOString());
      
      const totalRevenue = productSales?.reduce((sum, sale) => sum + (sale.sale_price_snapshot_cents * sale.quantity), 0) || 0;
      const totalProfit = productSales?.reduce((sum, sale) => sum + ((sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity), 0) || 0;
      
      // Calculate top products
      const productStats = (productSales || []).reduce((acc: Record<string, { name: string; revenue: number; profit: number; quantity: number }>, sale: any) => {
        const productName = sale.product?.name || 'Produto';
        const saleRevenue = sale.sale_price_snapshot_cents * sale.quantity;
        const saleProfit = (sale.sale_price_snapshot_cents - sale.purchase_price_snapshot_cents) * sale.quantity;
        
        if (!acc[productName]) {
          acc[productName] = { name: productName, revenue: 0, profit: 0, quantity: 0 };
        }
        
        acc[productName].revenue += saleRevenue;
        acc[productName].profit += saleProfit;
        acc[productName].quantity += sale.quantity;
        
        return acc;
      }, {});
      
      const topProducts = Object.values(productStats)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
      
      return { revenue: totalRevenue, profit: totalProfit, topProducts };
    };

    // Fallback: use completed bookings value if no payments data
    let revenueReceived = completedBookings.reduce((sum, booking) => 
      sum + (booking.service?.price_cents || 0), 0
    );

    const bookingsCount = bookingsData.length;

    // Daily revenue chart
    const dailyRevenue = generateDailyRevenue(bookingsData);

    // Top services from all bookings
    const serviceStats = bookingsData.reduce((acc, booking) => {
      const serviceName = booking.service?.name || 'Serviço';
      const price = booking.service?.price_cents || 0;
      
      if (!acc[serviceName]) {
        acc[serviceName] = { name: serviceName, revenue: 0, count: 0 };
      }
      
      acc[serviceName].revenue += price;
      acc[serviceName].count += 1;
      
      return acc;
    }, {} as any);

    const topServices = Object.values(serviceStats)
      .sort((a: any, b: any) => b.revenue - a.revenue)
      .slice(0, 5);

    // Staff performance from all bookings
    const staffStats = bookingsData.reduce((acc, booking) => {
      const staffName = booking.staff?.name || 'Staff';
      const price = booking.service?.price_cents || 0;
      
      if (!acc[staffName]) {
        acc[staffName] = { name: staffName, revenue: 0, bookings: 0 };
      }
      
      acc[staffName].revenue += price;
      acc[staffName].bookings += 1;
      
      return acc;
    }, {} as any);

    const staffPerformance = Object.values(staffStats)
      .sort((a: any, b: any) => b.revenue - a.revenue);

    // Load payments, no-show rate, and product sales asynchronously
    try {
      const [actualPayments, noShowRate, productSalesData] = await Promise.all([
        loadPaymentsData(),
        loadAllBookingsForNoShow(),
        loadProductSales()
      ]);

      // Add product sales to expected and received revenue
      revenueExpected += productSalesData.revenue;
      
      // Use actual payments if available, otherwise use completed bookings value
      const finalRevenueReceived = (actualPayments > 0 ? actualPayments : revenueReceived) + productSalesData.revenue;
      
      // Recalculate avg ticket including product sales
      const avgTicket = bookingsCount > 0 ? revenueExpected / bookingsCount : 0;

      setData({
        revenue_expected: revenueExpected,
        revenue_received: finalRevenueReceived,
        bookings_count: bookingsCount,
        no_show_rate: noShowRate,
        avg_ticket: avgTicket,
        daily_revenue: dailyRevenue,
        top_services: topServices as any,
        staff_performance: staffPerformance as any,
        product_sales_revenue: productSalesData.revenue,
        product_sales_profit: productSalesData.profit,
        top_products: productSalesData.topProducts,
      });
    } catch (error) {
      console.error('Error calculating finance metrics:', error);
    }
  };

  const generateDailyRevenue = (bookings: any[]) => {
    const days = [];
    const current = new Date(dateRange.from);
    
    while (current <= dateRange.to) {
      const dayString = format(current, 'yyyy-MM-dd');
      const dayBookings = bookings.filter(b => 
        format(new Date(b.starts_at), 'yyyy-MM-dd') === dayString
      );
      
      // Expected from all bookings, received only from completed ones
      const expected = dayBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
      const completedBookings = dayBookings.filter(b => b.status === 'completed');
      const received = completedBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
      
      days.push({
        date: format(current, 'dd/MM'),
        expected: expected / 100,
        received: received / 100,
      });
      
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const exportToCSV = () => {
    if (!data || bookings.length === 0) return;

    const csvContent = [
      ['Data', 'Cliente', 'Serviço', 'Profissional', 'Valor', 'Status'],
      ...bookings.map(booking => [
        format(new Date(booking.starts_at), 'dd/MM/yyyy HH:mm'),
        booking.customer?.name || '',
        booking.service?.name || '',
        booking.staff?.name || '',
        `R$ ${((booking.service?.price_cents || 0) / 100).toFixed(2)}`,
        booking.status === 'completed' ? 'Concluído' :
        booking.status === 'confirmed' ? 'Confirmado' : 
        booking.status === 'cancelled' ? 'Cancelado' : 
        booking.status === 'no_show' ? 'Faltou' : booking.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `financeiro-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-8 bg-muted rounded animate-pulse" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Date Range Selector */}
      <DateRangeSelector className="overflow-x-auto" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Análise de receitas e performance do negócio
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="products">Produtos</TabsTrigger>
          <TabsTrigger value="commissions">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 md:space-y-6">

      {/* Additional Filters */}
      {staff.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base md:text-lg">Filtros Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label className="text-sm">Profissional</Label>
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {staff.map(member => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Faturamento Previsto</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  R$ {data ? (data.revenue_expected / 100).toFixed(0) : '0'}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1 flex-shrink-0" />
                  <span className="text-xs text-success truncate">Meta do período</span>
                </div>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                <Target className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Recebido</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  R$ {data ? (data.revenue_received / 100).toFixed(0) : '0'}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    {data && data.revenue_expected > 0 
                      ? `${((data.revenue_received / data.revenue_expected) * 100).toFixed(0)}% do previsto`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 ml-2">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {data?.bookings_count || 0}
                </p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                  <span className="text-xs text-primary truncate">Confirmados</span>
                </div>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 ml-2">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs md:text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  R$ {data ? (data.avg_ticket / 100).toFixed(0) : '0'}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground truncate">
                    Por agendamento
                  </span>
                </div>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-warning/10 flex items-center justify-center flex-shrink-0 ml-2">
                <Wallet className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Product Sales Cards */}
      {(data?.product_sales_revenue || 0) > 0 && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Faturamento Produtos</p>
                  <p className="text-lg md:text-2xl font-bold text-foreground">
                    R$ {data ? (data.product_sales_revenue / 100).toFixed(0) : '0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <ShoppingCart className="h-3 w-3 text-primary mr-1 flex-shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">Vendas no período</span>
                  </div>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <ShoppingCart className="h-5 w-5 md:h-6 md:w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs md:text-sm text-muted-foreground truncate">Lucro Produtos</p>
                  <p className="text-lg md:text-2xl font-bold text-success">
                    R$ {data ? (data.product_sales_profit / 100).toFixed(0) : '0'}
                  </p>
                  <div className="flex items-center mt-1">
                    <TrendingUp className="h-3 w-3 text-success mr-1 flex-shrink-0" />
                    <span className="text-xs text-success truncate">
                      {data && data.product_sales_revenue > 0 
                        ? `${((data.product_sales_profit / data.product_sales_revenue) * 100).toFixed(0)}% margem`
                        : '0%'
                      }
                    </span>
                  </div>
                </div>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-success/10 flex items-center justify-center flex-shrink-0 ml-2">
                  <TrendingUp className="h-5 w-5 md:h-6 md:w-6 text-success" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Faturamento Diário</CardTitle>
            <CardDescription className="text-xs md:text-sm">Previsto vs Recebido</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
            <ResponsiveContainer width="100%" height={200} className="md:!h-[300px]">
              <LineChart data={data?.daily_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={40} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Line
                  type="monotone" 
                  dataKey="expected" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Previsto"
                  dot={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Recebido"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Top Serviços</CardTitle>
            <CardDescription className="text-xs md:text-sm">Por faturamento no período</CardDescription>
          </CardHeader>
          <CardContent className="pl-0 pr-2 md:pl-2 md:pr-4">
            {/* Mobile: List view instead of chart */}
            <div className="md:hidden space-y-3">
              {(data?.top_services || []).map((service, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{service.name}</p>
                      <p className="text-xs text-muted-foreground">{service.count} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-success">
                    R$ {(service.revenue / 100).toFixed(0)}
                  </span>
                </div>
              ))}
              {(!data?.top_services || data.top_services.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
            {/* Desktop: Chart */}
            <div className="hidden md:block">
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={data?.top_services || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    tick={{ fontSize: 11 }}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${(value / 100).toFixed(2)}`, 'Faturamento']}
                  />
                  <Bar
                    dataKey="revenue" 
                    fill="hsl(var(--accent))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Products Section */}
      {data?.top_products && data.top_products.length > 0 && (
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Produtos Mais Vendidos
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">Por quantidade vendida no período</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: Card list */}
            <div className="md:hidden space-y-3">
              {data.top_products.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: `${COLORS[index % COLORS.length]}20`, color: COLORS[index % COLORS.length] }}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.quantity} unidades</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-sm text-foreground block">
                      R$ {(product.revenue / 100).toFixed(0)}
                    </span>
                    <span className="text-xs text-success">
                      +R$ {(product.profit / 100).toFixed(0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                    <TableHead className="text-right">Lucro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.top_products.map((product, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell className="text-right">R$ {(product.revenue / 100).toFixed(2)}</TableCell>
                      <TableCell className="text-right text-success font-medium">R$ {(product.profit / 100).toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      <div className="grid gap-4 md:gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Performance da Equipe</CardTitle>
            <CardDescription className="text-xs md:text-sm">Faturamento por profissional</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: Card list */}
            <div className="md:hidden space-y-3">
              {data?.staff_performance.map((staff, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{staff.name}</p>
                      <p className="text-xs text-muted-foreground">{staff.bookings} agendamentos</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sm text-success">
                    R$ {(staff.revenue / 100).toFixed(0)}
                  </span>
                </div>
              )) || (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum dado disponível</p>
              )}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead className="text-right">Agendamentos</TableHead>
                    <TableHead className="text-right">Faturamento</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.staff_performance.map((staff, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{staff.name}</TableCell>
                      <TableCell className="text-right">{staff.bookings}</TableCell>
                      <TableCell className="text-right font-medium">
                        R$ {(staff.revenue / 100).toFixed(2)}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Nenhum dado disponível
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Últimos Agendamentos</CardTitle>
            <CardDescription className="text-xs md:text-sm">Agendamentos recentes do período</CardDescription>
          </CardHeader>
          <CardContent>
            {/* Mobile: Card list */}
            <div className="md:hidden space-y-3">
              {bookings.slice(0, 5).map((booking) => (
                <div key={booking.id} className="p-3 rounded-lg bg-muted/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm text-foreground">{booking.customer?.name}</p>
                      <p className="text-xs text-muted-foreground">{booking.service?.name}</p>
                    </div>
                    <Badge variant={
                      booking.status === 'confirmed' ? 'default' :
                      booking.status === 'cancelled' ? 'destructive' :
                      'secondary'
                    } className="text-xs">
                      {booking.status === 'completed' ? 'Concluído' :
                       booking.status === 'confirmed' ? 'Confirmado' :
                       booking.status === 'cancelled' ? 'Cancelado' :
                       booking.status === 'no_show' ? 'Faltou' : booking.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      {format(new Date(booking.starts_at), 'dd/MM/yyyy HH:mm')}
                    </span>
                    <span className="font-semibold text-success">
                      R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            {/* Desktop: Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead className="text-right">Valor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{booking.customer?.name}</p>
                          <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(booking.starts_at), 'dd/MM/yyyy')}</p>
                          <p className="text-muted-foreground">
                            {format(new Date(booking.starts_at), 'HH:mm')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div>
                          <p className="font-medium">
                            R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}
                          </p>
                          <Badge variant={
                            booking.status === 'confirmed' ? 'default' :
                            booking.status === 'cancelled' ? 'destructive' :
                            'secondary'
                          } className="text-xs">
                            {booking.status === 'completed' ? 'Concluído' :
                             booking.status === 'confirmed' ? 'Confirmado' :
                             booking.status === 'cancelled' ? 'Cancelado' :
                             booking.status === 'no_show' ? 'Faltou' : booking.status}
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
        </TabsContent>

        <TabsContent value="products">
          <Products />
        </TabsContent>

        <TabsContent value="commissions">
          <CommissionsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}