import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, 
  Plus, 
  Clock, 
  Users, 
  TrendingUp, 
  Scissors, 
  Phone
} from "lucide-react";
import { NewServiceModal, NewStaffModal, BlockTimeModal } from "@/components/modals/QuickActions";

const Dashboard = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showNewService, setShowNewService] = useState(false);
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [showBlockTime, setShowBlockTime] = useState(false);
  
  const { user, signOut, loading: authLoading } = useAuth();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    // Load data when we have both user and tenant, or when tenant loading is complete
    if (user && !tenantLoading) {
      console.log('Loading dashboard data...', { user: !!user, currentTenant: !!currentTenant });
      loadDashboardData();
    }
  }, [user, currentTenant, tenantLoading]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      console.log('Loading dashboard data for tenant:', currentTenant?.id);
      
      // If no tenant, still load what we can
      if (!currentTenant) {
        console.log('No current tenant available');
        setBookings([]);
        setServices([]);
        setStaff([]);
        setLoading(false);
        return;
      }
      
      // Load bookings for today
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
      
      const [bookingsRes, servicesRes, staffRes] = await Promise.all([
        supabase
          .from('bookings')
          .select(`
            *,
            service:services(name, color),
            staff:staff(name),
            customer:customers(name, phone)
          `)
          .eq('tenant_id', currentTenant.id)
          .gte('starts_at', startOfDay.toISOString())
          .lt('starts_at', endOfDay.toISOString())
          .order('starts_at'),
        
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
      ]);

      console.log('Dashboard data loaded:', {
        bookings: bookingsRes.data?.length || 0,
        services: servicesRes.data?.length || 0,
        staff: staffRes.data?.length || 0,
        errors: [bookingsRes.error, servicesRes.error, staffRes.error].filter(Boolean)
      });

      if (bookingsRes.error) throw bookingsRes.error;
      if (servicesRes.error) throw servicesRes.error;
      if (staffRes.error) throw staffRes.error;

      setBookings(bookingsRes.data || []);
      setServices(servicesRes.data || []);
      setStaff(staffRes.data || []);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground mb-2">
          Bom dia! 👋
        </h1>
        <p className="text-muted-foreground">
          {loading 
            ? "Carregando dados..." 
            : `Você tem ${bookings.length} agendamentos hoje. Vamos começar!`
          }
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card 
          className="border-border shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/agenda')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Agendamentos Hoje</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : bookings.length}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    Ver agenda →
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/services')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Serviços Ativos</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : services.length}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    Gerenciar →
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                <Scissors className="h-6 w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/staff')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Profissionais</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : staff.length}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    Ver equipe →
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="border-border shadow-soft hover:shadow-medium transition-all duration-300 cursor-pointer"
          onClick={() => navigate('/app/finance')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Faturamento</p>
                <p className="text-2xl font-bold text-foreground">
                  {loading ? "..." : `R$ ${(bookings.reduce((sum, b) => sum + (b.service?.price_cents || 0), 0) / 100).toFixed(2)}`}
                </p>
                <div className="flex items-center mt-2">
                  <Badge variant="secondary" className="text-xs px-2 py-1">
                    Ver relatório →
                  </Badge>
                </div>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Upcoming Appointments */}
        <div className="lg:col-span-2">
          <Card className="border-border shadow-soft">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Próximos Agendamentos</CardTitle>
                  <CardDescription>Agendamentos de hoje</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => navigate('/app/bookings')}>
                  Ver Todos
                </Button>
              </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center text-muted-foreground py-8">
                      Carregando agendamentos...
                    </div>
                  ) : bookings.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      Nenhum agendamento para hoje
                    </div>
                  ) : (
                    bookings.slice(0, 3).map((booking) => (
                      <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <Users className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-medium text-foreground">{booking.customer?.name}</h4>
                            <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                            <div className="flex items-center mt-1 space-x-3">
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(booking.starts_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              <span className="text-xs text-muted-foreground flex items-center">
                                <Phone className="h-3 w-3 mr-1" />
                                {booking.customer?.phone}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <Badge 
                            variant={booking.status === "confirmed" ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {booking.status === 'confirmed' ? 'Confirmado' : 
                             booking.status === 'pending' ? 'Pendente' : 
                             booking.status}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
          </Card>
        </div>

        {/* Top Services */}
        <div>
          <Card className="border-border shadow-soft mb-6">
              <CardHeader>
                <CardTitle className="text-lg">Serviços Populares</CardTitle>
                <CardDescription>Este mês</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center text-muted-foreground">
                      Carregando...
                    </div>
                  ) : services.length === 0 ? (
                    <div className="text-center text-muted-foreground">
                      Nenhum serviço cadastrado
                    </div>
                  ) : (
                    services.slice(0, 3).map((service, index) => (
                      <div key={service.id} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ 
                              backgroundColor: `${service.color}20`,
                              color: service.color 
                            }}
                          >
                            <Scissors className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground text-sm">{service.name}</p>
                            <p className="text-xs text-muted-foreground">{service.duration_minutes}min</p>
                          </div>
                        </div>
                        <p className="font-medium text-success text-sm">
                          R$ {(service.price_cents / 100).toFixed(2)}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

          {/* Quick Actions */}
          <Card className="border-border shadow-soft">
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setShowNewService(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Serviço
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setShowNewStaff(true)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  Adicionar Profissional
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  size="sm"
                  onClick={() => setShowBlockTime(true)}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Bloquear Horário
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <NewServiceModal 
        open={showNewService} 
        onOpenChange={setShowNewService}
        onSuccess={() => loadDashboardData()}
      />
      <NewStaffModal 
        open={showNewStaff} 
        onOpenChange={setShowNewStaff}
        onSuccess={() => loadDashboardData()}
      />
      <BlockTimeModal 
        open={showBlockTime} 
        onOpenChange={setShowBlockTime}
        onSuccess={() => loadDashboardData()}
      />
    </div>
  );
};

export default Dashboard;