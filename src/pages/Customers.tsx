import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NoTenantState } from "@/components/NoTenantState";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  DollarSign,
  Edit,
  Trash2
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper functions for duplicate detection
const normalizePhoneNumbers = (phone: string): string => {
  return phone.replace(/\D/g, '');
};

const normalizeNameForComparison = (name: string): string => {
  return name.toLowerCase().trim();
};

const isCustomerDuplicate = (
  name: string, 
  phone: string, 
  customers: any[], 
  excludeId?: string
): { isDuplicate: boolean; existingCustomer?: any } => {
  const normalizedName = normalizeNameForComparison(name);
  const normalizedPhone = normalizePhoneNumbers(phone);
  
  const existingCustomer = customers.find(customer => {
    if (excludeId && customer.id === excludeId) return false;
    
    const customerName = normalizeNameForComparison(customer.name);
    const customerPhone = normalizePhoneNumbers(customer.phone);
    
    return customerName === normalizedName && customerPhone === normalizedPhone;
  });
  
  return {
    isDuplicate: !!existingCustomer,
    existingCustomer
  };
};

export default function Customers() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Edit/Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

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

  const handleEditClick = (customer: any) => {
    setCustomerToEdit(customer);
    setEditForm({
      name: customer.name,
      phone: customer.phone,
      email: customer.email || ''
    });
    setShowEditModal(true);
  };

  const handleDeleteClick = (customer: any) => {
    setCustomerToDelete(customer);
    setShowDeleteDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!customerToEdit || !currentTenant) return;
    
    const trimmedName = editForm.name.trim();
    const trimmedPhone = editForm.phone.trim();
    
    if (!trimmedName || !trimmedPhone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicates
    const { isDuplicate, existingCustomer } = isCustomerDuplicate(
      trimmedName,
      trimmedPhone,
      customers,
      customerToEdit.id
    );

    if (isDuplicate) {
      toast({
        title: "Cliente duplicado",
        description: `Já existe um cliente com esse nome e telefone: ${existingCustomer.name}`,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: trimmedName,
          phone: trimmedPhone,
          email: editForm.email.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerToEdit.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });

      setShowEditModal(false);
      loadCustomers();
    } catch (error) {
      console.error('Error updating customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar cliente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!customerToDelete) return;

    setSaving(true);
    try {
      // Check if customer has bookings
      const { data: bookings } = await supabase
        .from('bookings')
        .select('id')
        .eq('customer_id', customerToDelete.id)
        .limit(1);

      if (bookings && bookings.length > 0) {
        toast({
          title: "Não é possível excluir",
          description: "Este cliente possui agendamentos vinculados. Exclua os agendamentos primeiro.",
          variant: "destructive",
        });
        setShowDeleteDialog(false);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customerToDelete.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente excluído com sucesso",
      });

      setShowDeleteDialog(false);
      loadCustomers();
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir cliente",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  if (tenantLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) {
    return <NoTenantState />;
  }

  return (
    <div className="space-y-4 md:space-y-6 px-4 md:px-0">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Clientes</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Gerencie a base de clientes da barbearia
          </p>
        </div>
        
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar cliente..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {customers.length}
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 md:h-6 md:w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Novos Este Mês</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {customers.filter(c => {
                    const created = new Date(c.created_at);
                    const now = new Date();
                    return created.getMonth() === now.getMonth() && 
                           created.getFullYear() === now.getFullYear();
                  }).length}
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-success/10 flex items-center justify-center">
                <Plus className="h-5 w-5 md:h-6 md:w-6 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Clientes Ativos</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  {customers.filter(c => c.totalBookings > 0).length}
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-accent/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs md:text-sm text-muted-foreground">Ticket Médio</p>
                <p className="text-lg md:text-2xl font-bold text-foreground">
                  R$ {customers.length > 0 
                    ? (customers.reduce((sum, c) => sum + c.totalSpent, 0) / 100 / customers.filter(c => c.totalBookings > 0).length || 0).toFixed(0)
                    : '0'
                  }
                </p>
              </div>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 md:h-6 md:w-6 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Customers - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">
            Clientes ({filteredCustomers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card Layout */}
          <div className="md:hidden space-y-3">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </div>
            ) : (
              filteredCustomers.map((customer) => (
                <div key={customer.id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-foreground truncate">{customer.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Cliente desde {format(parseISO(customer.created_at), "MMM yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </div>
                    {customer.email && (
                      <div className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{customer.email}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between pt-2 border-t border-border">
                    <div className="flex items-center gap-3 text-xs">
                      <Badge variant="secondary" className="text-xs">
                        {customer.totalBookings} agend.
                      </Badge>
                      <span className="font-medium text-success">
                        R$ {(customer.totalSpent / 100).toFixed(0)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => loadCustomerDetails(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(customer)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(customer)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop: Table Layout */}
          <div className="hidden md:block overflow-x-auto">
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
                        <div className="flex items-center space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => loadCustomerDetails(customer)}
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditClick(customer)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteClick(customer)}
                            title="Excluir"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
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

      {/* Edit Customer Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
            <DialogDescription>
              Atualize as informações do cliente
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome *</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Telefone *</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o cliente <strong>{customerToDelete?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete} 
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
