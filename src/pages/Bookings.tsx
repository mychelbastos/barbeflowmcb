import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Search,
  Filter,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Bookings() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (currentTenant) {
      loadBookings();
    }
  }, [currentTenant]);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter, dateFilter]);

  const loadBookings = async () => {
    if (!currentTenant) return;

    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          service:services(name, color, duration_minutes, price_cents),
          staff:staff(name, color),
          customer:customers(name, phone, email)
        `)
        .eq('tenant_id', currentTenant.id)
        .order('starts_at', { ascending: false });

      if (error) throw error;

      setBookings(data || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar agendamentos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterBookings = () => {
    let filtered = [...bookings];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.customer?.phone.includes(searchTerm) ||
        booking.service?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.staff?.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    // Date filter
    if (dateFilter) {
      filtered = filtered.filter(booking => {
        const bookingDate = format(parseISO(booking.starts_at), 'yyyy-MM-dd');
        return bookingDate === dateFilter;
      });
    }

    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: newStatus })
        .eq('id', bookingId);

      if (error) throw error;

      toast({
        title: "Status atualizado",
        description: `Agendamento marcado como ${getStatusLabel(newStatus)}`,
      });

      loadBookings();
    } catch (error) {
      console.error('Error updating booking status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do agendamento",
        variant: "destructive",
      });
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
          <h1 className="text-2xl font-bold text-foreground">Agendamentos</h1>
          <p className="text-muted-foreground">
            Gerencie todos os agendamentos da barbearia
          </p>
        </div>
        
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Agendamento
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Cliente, serviço, profissional..."
                  className="pl-10"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label>Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                  <SelectItem value="no_show">Faltou</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data</Label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
                  setDateFilter("");
                }}
              >
                Limpar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Agendamentos ({filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Serviço</TableHead>
                <TableHead>Profissional</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum agendamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.customer?.name}</div>
                        <div className="text-sm text-muted-foreground flex items-center">
                          <Phone className="h-3 w-3 mr-1" />
                          {booking.customer?.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: booking.service?.color || '#3B82F6' }}
                        />
                        <div>
                          <div className="font-medium">{booking.service?.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {booking.service?.duration_minutes}min
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>{booking.staff?.name || 'Qualquer profissional'}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(booking.starts_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1 text-muted-foreground" />
                          <span className="text-sm">
                            {format(parseISO(booking.starts_at), "HH:mm")} - 
                            {format(parseISO(booking.ends_at), "HH:mm")}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-success">
                        R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(booking.status)}>
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowDetails(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        
                        {booking.status === 'confirmed' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'completed')}
                          >
                            <CheckCircle className="h-4 w-4 text-success" />
                          </Button>
                        )}
                        
                        {booking.status !== 'cancelled' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            <XCircle className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              Informações completas do agendamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Cliente</Label>
                  <p className="text-sm">{selectedBooking.customer?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm">{selectedBooking.customer?.phone}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Serviço</Label>
                  <p className="text-sm">{selectedBooking.service?.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Profissional</Label>
                  <p className="text-sm">{selectedBooking.staff?.name || 'Qualquer profissional'}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data</Label>
                  <p className="text-sm">
                    {format(parseISO(selectedBooking.starts_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Horário</Label>
                  <p className="text-sm">
                    {format(parseISO(selectedBooking.starts_at), "HH:mm")} - 
                    {format(parseISO(selectedBooking.ends_at), "HH:mm")}
                  </p>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="mt-1">
                  <Badge variant={getStatusVariant(selectedBooking.status)}>
                    {getStatusLabel(selectedBooking.status)}
                  </Badge>
                </div>
              </div>
              
              {selectedBooking.notes && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
              
              <div>
                <Label className="text-sm font-medium">Valor</Label>
                <p className="text-sm font-semibold text-success">
                  R$ {((selectedBooking.service?.price_cents || 0) / 100).toFixed(2)}
                </p>
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