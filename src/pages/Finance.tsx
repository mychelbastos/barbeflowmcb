import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { useDateRange } from "@/contexts/DateRangeContext";
import { DateRangeSelector } from "@/components/DateRangeSelector";
import { supabase } from "@/integrations/supabase/client";
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
  Target
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
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Finance() {
  const { user } = useAuth();
  const { currentTenant } = useTenant();
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
      calculateFinanceMetrics(bookingsData || []);
    } catch (error) {
      console.error('Error loading finance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateFinanceMetrics = (bookingsData: any[]) => {
    // All bookings are already confirmed (filtered in query)
    const confirmedBookings = bookingsData;
    
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

    // Revenue metrics
    const revenueExpected = confirmedBookings.reduce((sum, booking) => 
      sum + (booking.service?.price_cents || 0), 0
    );

    // For demo purposes, assume 80% received (in real app, use payments table)
    const revenueReceived = Math.round(revenueExpected * 0.8);

    const bookingsCount = confirmedBookings.length;
    const avgTicket = bookingsCount > 0 ? revenueExpected / bookingsCount : 0;

    // Daily revenue chart
    const dailyRevenue = generateDailyRevenue(confirmedBookings);

    // Top services
    const serviceStats = confirmedBookings.reduce((acc, booking) => {
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

    // Staff performance
    const staffStats = confirmedBookings.reduce((acc, booking) => {
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

    // Load no-show rate asynchronously
    loadAllBookingsForNoShow().then(noShowRate => {
      setData({
        revenue_expected: revenueExpected,
        revenue_received: revenueReceived,
        bookings_count: bookingsCount,
        no_show_rate: noShowRate,
        avg_ticket: avgTicket,
        daily_revenue: dailyRevenue,
        top_services: topServices as any,
        staff_performance: staffPerformance as any,
      });
    });
  };

  const generateDailyRevenue = (bookings: any[]) => {
    const days = [];
    const current = new Date(dateRange.from);
    
    while (current <= dateRange.to) {
      const dayString = format(current, 'yyyy-MM-dd');
      const dayBookings = bookings.filter(b => 
        format(new Date(b.starts_at), 'yyyy-MM-dd') === dayString
      );
      
      const expected = dayBookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0);
      const received = Math.round(expected * 0.8); // Demo calculation
      
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

  if (loading) {
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

  return (
    <div className="space-y-6">
      {/* Date Range Selector */}
      <DateRangeSelector />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Financeiro</h1>
          <p className="text-muted-foreground">
            Análise de receitas e performance do negócio
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <Button variant="outline" onClick={exportToCSV}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Additional Filters */}
      {staff.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros Adicionais</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Profissional</Label>
                <Select value={staffFilter} onValueChange={setStaffFilter}>
                  <SelectTrigger>
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
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturamento Previsto</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {data ? (data.revenue_expected / 100).toFixed(2) : '0,00'}
                </p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="h-3 w-3 text-success mr-1" />
                  <span className="text-xs text-success">Meta do período</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Target className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Recebido</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {data ? (data.revenue_received / 100).toFixed(2) : '0,00'}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    {data && data.revenue_expected > 0 
                      ? `${((data.revenue_received / data.revenue_expected) * 100).toFixed(1)}% do previsto`
                      : '0% do previsto'
                    }
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
                <p className="text-2xl font-bold text-foreground">
                  {data?.bookings_count || 0}
                </p>
                <div className="flex items-center mt-1">
                  <Calendar className="h-3 w-3 text-primary mr-1" />
                  <span className="text-xs text-primary">Confirmados e Concluídos</span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-2xl font-bold text-foreground">
                  R$ {data ? (data.avg_ticket / 100).toFixed(2) : '0,00'}
                </p>
                <div className="flex items-center mt-1">
                  <span className="text-xs text-muted-foreground">
                    Por agendamento
                  </span>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Faturamento Diário</CardTitle>
            <CardDescription>Previsto vs Recebido</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={data?.daily_revenue || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Line
                  type="monotone" 
                  dataKey="expected" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Previsto"
                />
                <Line 
                  type="monotone" 
                  dataKey="received" 
                  stroke="hsl(var(--success))" 
                  strokeWidth={2}
                  name="Recebido"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Serviços</CardTitle>
            <CardDescription>Por faturamento no período</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data?.top_services || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="name" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis />
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
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance da Equipe</CardTitle>
            <CardDescription>Faturamento por profissional</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Agendamentos</CardTitle>
            <CardDescription>Agendamentos recentes do período</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}