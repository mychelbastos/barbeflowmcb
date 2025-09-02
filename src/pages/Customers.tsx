import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Search, 
  User, 
  Phone, 
  Mail,
  Calendar,
  Eye,
  Clock,
  DollarSign
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function Customers() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      loadCustomers();
    }
  }, [currentTenant]);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  const loadCustomers = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('customers')
        .select(`
          *
        `)
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get booking stats for each customer
      const customersWithStats = await Promise.all((data || []).map(async (customer) => {
        const { data: bookings } = await supabase
          .from('bookings')
          .select(`
            id,
            starts_at,
            service:services(price_cents)
          `)
          .eq('customer_id', customer.id);

        const totalBookings = bookings?.length || 0;
        const totalSpent = bookings?.reduce((sum: number, booking: any) => 
          sum + (booking.service?.price_cents || 0), 0
        ) || 0;
        const lastVisit = bookings && bookings.length > 0 
          ? new Date(Math.max(...bookings.map((b: any) => new Date(b.starts_at).getTime())))
          : null;

        return {
          ...customer,
          totalBookings,
          totalSpent,
          lastVisit,
        };
      }));

      setCustomers(customersWithStats);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    setFilteredCustomers(filtered);
  };

  const loadCustomerDetails = async (customer: any) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setShowDetails(true);

    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, color, price_cents),
          staff:staff(name)
        `)
        .eq('customer_id', customer.id)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      setCustomerBookings(data || []);
    } catch (error) {
      console.error('Error loading customer bookings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar histórico do cliente",
        variant: "destructive",
      });
    } finally {
      setDetailsLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      confirmed: 'Confirmado',
      cancelled: 'Cancelado',
      completed: 'Concluído',
      no_show: 'Faltou'
    };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string) => {
    const variants: Record<string, "default" | "destructive" | "secondary"> = {
      confirmed: 'default',
      cancelled: 'destructive',
      completed: 'secondary',
      no_show: 'destructive'
    };
    return variants[status] || 'secondary';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie a base de clientes da barbearia
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              className="pl-10 w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-2xl font-bold text-foreground">
                  {customers.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Novos Este Mês</p>
                <p className="text-2xl font-bold text-foreground">
                  {customers.filter(c => {
                    const created = new Date(c.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Plus className="h-6 w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-2xl font-bold text-foreground">
                  {customers.filter(c => c.totalBookings > 0).length}
                </p>
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
                  R$ {customers.length > 0 
                    ? (customers.reduce((sum, c) => sum + c.totalSpent, 0) / 100 / customers.filter(c => c.totalBookings > 0).length || 0).toFixed(0)
                    : '0'
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Clientes ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Agendamentos</TableHead>
                <TableHead>Total Gasto</TableHead>
                <TableHead>Última Visita</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCustomers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                  </TableCell>
                </TableRow>
              ) : (
                filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Cliente desde {format(parseISO(customer.created_at), "MMM yyyy", { locale: ptBR })}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1 text-muted-foreground" />
                          {customer.phone}
                        </div>
                        {customer.email && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Mail className="h-3 w-3 mr-1" />
                            {customer.email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {customer.totalBookings} agendamentos
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-success">
                        R$ {(customer.totalSpent / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {customer.lastVisit ? (
                        <div className="text-sm">
                          {format(customer.lastVisit, "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-sm">Nunca</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadCustomerDetails(customer)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações e histórico de agendamentos
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Customer Info */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardContent className="p-4">
                    <div className="text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <User className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="font-semibold">{selectedCustomer.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        Cliente desde {format(parseISO(selectedCustomer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="text-sm">{selectedCustomer.phone}</span>
                      </div>
                      {selectedCustomer.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{selectedCustomer.email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Total Agendamentos</Label>
                        <p className="text-xl font-bold">{selectedCustomer.totalBookings}</p>
                      </div>
                      <div>
                        <Label className="text-xs font-medium text-muted-foreground">Total Gasto</Label>
                        <p className="text-xl font-bold text-success">
                          R$ {(selectedCustomer.totalSpent / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Booking History */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Histórico de Agendamentos</h3>
                {detailsLoading ? (
                  <div className="h-64 bg-muted rounded animate-pulse" />
                ) : customerBookings.length === 0 ? (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground">Nenhum agendamento encontrado</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {customerBookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div 
                                className="w-10 h-10 rounded-lg flex items-center justify-center"
                                style={{ 
                                  backgroundColor: `${booking.service?.color}20`,
                                  color: booking.service?.color 
                                }}
                              >
                                <Calendar className="h-5 w-5" />
                              </div>
                              <div>
                                <h4 className="font-medium">{booking.service?.name}</h4>
                                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                                  <div className="flex items-center">
                                    <Clock className="h-3 w-3 mr-1" />
                                    {format(parseISO(booking.starts_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                  </div>
                                  <span>{booking.staff?.name || 'Qualquer profissional'}</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-3">
                              <Badge variant={getStatusVariant(booking.status)}>
                                {getStatusLabel(booking.status)}
                              </Badge>
                              <span className="font-medium text-success">
                                R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetails(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}