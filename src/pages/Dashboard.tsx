import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  Users, 
  Clock, 
  TrendingUp, 
  Scissors,
  Star,
  Phone,
  Plus,
  MoreHorizontal
} from "lucide-react";

const Dashboard = () => {
  // Mock data
  const stats = [
    {
      title: "Agendamentos Hoje",
      value: "12",
      change: "+2",
      icon: Calendar,
      color: "text-primary"
    },
    {
      title: "Clientes Ativos",
      value: "156",
      change: "+8",
      icon: Users,
      color: "text-accent"
    },
    {
      title: "Taxa de Comparecimento",
      value: "87%",
      change: "+5%",
      icon: TrendingUp,
      color: "text-success"
    },
    {
      title: "Tempo Médio",
      value: "45min",
      change: "-3min",
      icon: Clock,
      color: "text-warning"
    }
  ];

  const upcomingBookings = [
    {
      id: 1,
      client: "João Silva",
      service: "Corte + Barba",
      staff: "Carlos",
      time: "09:30",
      phone: "(11) 99999-9999",
      status: "confirmado"
    },
    {
      id: 2,
      client: "Pedro Santos",
      service: "Corte Tradicional",
      staff: "Roberto",
      time: "10:15",
      phone: "(11) 88888-8888",
      status: "confirmado"
    },
    {
      id: 3,
      client: "Ana Costa",
      service: "Corte Feminino",
      staff: "Maria",
      time: "11:00",
      phone: "(11) 77777-7777",
      status: "pendente"
    }
  ];

  const topServices = [
    { name: "Corte + Barba", bookings: 45, revenue: "R$ 1.350" },
    { name: "Corte Tradicional", bookings: 32, revenue: "R$ 800" },
    { name: "Barba", bookings: 28, revenue: "R$ 560" }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center mr-3">
                <Scissors className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Barbearia Premium</h1>
                <p className="text-xs text-muted-foreground">Dashboard</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm">
                <Calendar className="h-4 w-4 mr-2" />
                Agenda
              </Button>
              <Button variant="default" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Bom dia! 👋
          </h2>
          <p className="text-muted-foreground">
            Você tem 12 agendamentos hoje. Vamos começar!
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-border shadow-soft hover:shadow-medium transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="text-xs px-2 py-1">
                        {stat.change}
                      </Badge>
                    </div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-opacity-10 flex items-center justify-center ${stat.color}`}>
                    <stat.icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
                  <Button variant="outline" size="sm">
                    Ver Todos
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingBookings.map((booking) => (
                    <div key={booking.id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-muted/50 transition-colors">
                      <div className="flex items-center space-x-4">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium text-foreground">{booking.client}</h4>
                          <p className="text-sm text-muted-foreground">{booking.service}</p>
                          <div className="flex items-center mt-1 space-x-3">
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {booking.time}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {booking.phone}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        <Badge 
                          variant={booking.status === "confirmado" ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {booking.status}
                        </Badge>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
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
                  {topServices.map((service, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                          <Star className="h-4 w-4 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground text-sm">{service.name}</p>
                          <p className="text-xs text-muted-foreground">{service.bookings} agendamentos</p>
                        </div>
                      </div>
                      <p className="font-medium text-success text-sm">{service.revenue}</p>
                    </div>
                  ))}
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
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Serviço
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Users className="h-4 w-4 mr-2" />
                    Adicionar Profissional
                  </Button>
                  <Button variant="outline" className="w-full justify-start" size="sm">
                    <Calendar className="h-4 w-4 mr-2" />
                    Bloquear Horário
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;