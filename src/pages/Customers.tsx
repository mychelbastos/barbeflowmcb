import { useState, useEffect, useCallback, useRef } from "react";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerBalanceTab } from "@/components/CustomerBalanceTab";
import { CustomerPackagesTab } from "@/components/CustomerPackagesTab";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Trash2,
  FileText
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

// Helper functions for duplicate detection
const normalizePhoneNumbers = (phone: string): string => {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) digits = digits.slice(2);
  if (digits.length === 10) digits = digits.slice(0, 2) + '9' + digits.slice(2);
  return digits;
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

const PAGE_SIZE = 50;

export default function Customers() {
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout>>();
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerBookings, setCustomerBookings] = useState<any[]>([]);
  const [showDetails, setShowDetails] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  
  // Edit/Delete states
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<any>(null);
  const [customerToDelete, setCustomerToDelete] = useState<any>(null);
  const [editForm, setEditForm] = useState({ name: '', phone: '', email: '', birthday: '', notes: '' });
  const [addForm, setAddForm] = useState({ name: '', phone: '', email: '', birthday: '', notes: '' });
  const [saving, setSaving] = useState(false);

  // Debounce search
  useEffect(() => {
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setPage(0);
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchTerm]);

  useEffect(() => {
    if (currentTenant) {
      loadCustomers(0, true);
    }
  }, [currentTenant, debouncedSearch]);

  const loadCustomers = async (pageNum: number = 0, reset: boolean = false) => {
    if (!currentTenant) return;

    try {
      if (reset) setLoading(true);
      else setLoadingMore(true);

      const from = pageNum * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Build query with server-side search
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' })
        .eq('tenant_id', currentTenant.id)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%`);
      }

      const [customersResult, recurringResult, packageResult] = await Promise.all([
        query,
        supabase
          .from('recurring_clients')
          .select('customer_id')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true),
        supabase
          .from('customer_packages')
          .select('customer_id')
          .eq('tenant_id', currentTenant.id)
          .eq('status', 'active')
      ]);

      if (customersResult.error) throw customersResult.error;

      setTotalCount(customersResult.count || 0);

      const recurringCustomerIds = new Set(
        (recurringResult.data || []).map((r: any) => r.customer_id)
      );
      const packageCustomerIds = new Set(
        (packageResult.data || []).map((r: any) => r.customer_id)
      );

      // Get stats in bulk with a single RPC call
      const { data: statsData } = await supabase.rpc('get_customer_stats', {
        p_tenant_id: currentTenant.id,
      });

      const statsMap = new Map<string, any>();
      (statsData || []).forEach((s: any) => {
        statsMap.set(s.customer_id, s);
      });

      const customersWithStats = (customersResult.data || []).map((customer) => {
        const stats = statsMap.get(customer.id);
        return {
          ...customer,
          totalBookings: stats?.total_bookings || 0,
          totalSpent: stats?.total_spent || 0,
          lastVisit: stats?.last_visit ? new Date(stats.last_visit) : null,
          isRecurring: recurringCustomerIds.has(customer.id),
          hasPackage: packageCustomerIds.has(customer.id),
        };
      });

      if (reset) {
        setCustomers(customersWithStats);
      } else {
        setCustomers(prev => [...prev, ...customersWithStats]);
      }
      setHasMore(customersResult.data?.length === PAGE_SIZE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error loading customers:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      loadCustomers(page + 1, false);
    }
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
      email: customer.email || '',
      birthday: customer.birthday || '',
      notes: customer.notes || ''
    });
    setShowEditModal(true);
  };

  const handleAddCustomer = async () => {
    if (!currentTenant) return;
    
    const trimmedName = addForm.name.trim();
    const trimmedPhone = addForm.phone.trim();
    
    if (!trimmedName || !trimmedPhone) {
      toast({
        title: "Erro",
        description: "Nome e telefone são obrigatórios",
        variant: "destructive",
      });
      return;
    }

    const { isDuplicate, existingCustomer } = isCustomerDuplicate(
      trimmedName,
      trimmedPhone,
      customers
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
      const normalizedPhone = trimmedPhone.replace(/\D/g, '');
      const { error } = await supabase
        .from('customers')
        .insert({
          tenant_id: currentTenant.id,
          name: trimmedName,
          phone: normalizedPhone,
          email: addForm.email.trim() || null,
          birthday: addForm.birthday || null,
          notes: addForm.notes.trim() || null,
        });

      if (error) throw error;

      toast({ title: "Sucesso", description: "Cliente cadastrado com sucesso" });
      setShowAddModal(false);
      setAddForm({ name: '', phone: '', email: '', birthday: '', notes: '' });
      loadCustomers(0, true);
    } catch (error) {
      console.error('Error creating customer:', error);
      toast({ title: "Erro", description: "Erro ao cadastrar cliente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
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
          birthday: editForm.birthday || null,
          notes: editForm.notes.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customerToEdit.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Cliente atualizado com sucesso",
      });

      setShowEditModal(false);
      loadCustomers(0, true);
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
      loadCustomers(0, true);
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Clientes</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie a base de clientes da barbearia
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Novo Cliente</span>
            <span className="sm:hidden">Novo</span>
          </Button>
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
                  {totalCount}
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

      </div>

      {/* Customers - Mobile Cards / Desktop Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">
            Clientes ({totalCount})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Mobile: Card Layout */}
          <div className="md:hidden space-y-3">
            {customers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </div>
            ) : (
              customers.map((customer) => (
                <div key={customer.id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-medium text-foreground truncate">{customer.name}</p>
                          {customer.isRecurring && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary flex-shrink-0">Fixo</Badge>
                          )}
                          {customer.hasPackage && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/50 text-emerald-400 flex-shrink-0">Pacote</Badge>
                          )}
                        </div>
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
                {customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      {searchTerm ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{customer.name}</span>
                              {customer.isRecurring && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-primary/50 text-primary">Fixo</Badge>
                              )}
                              {customer.hasPackage && (
                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-emerald-500/50 text-emerald-400">Pacote</Badge>
                              )}
                            </div>
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

          {/* Load More */}
          {hasMore && customers.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button variant="outline" size="sm" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Carregando..." : `Carregar mais (${customers.length} de ${totalCount})`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-4xl max-h-[85vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
            <DialogDescription>
              Informações e histórico de agendamentos
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Customer Info - Compact on mobile */}
              <div className="flex items-center gap-3 pb-3 border-b border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground">{selectedCustomer.name}</h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground mt-0.5">
                    <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{selectedCustomer.phone}</span>
                    {selectedCustomer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{selectedCustomer.email}</span>}
                  </div>
                   <p className="text-xs text-muted-foreground mt-0.5">
                    Cliente desde {format(parseISO(selectedCustomer.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
              </div>

              {selectedCustomer.notes && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center gap-1.5 mb-1">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-medium text-muted-foreground">Observações / Anamnese</p>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{selectedCustomer.notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Agendamentos</p>
                  <p className="text-lg font-bold">{selectedCustomer.totalBookings}</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/30 border border-border text-center">
                  <p className="text-xs text-muted-foreground">Total Gasto</p>
                  <p className="text-lg font-bold text-success">
                    R$ {(selectedCustomer.totalSpent / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Tabs: Histórico + Saldo */}
              <Tabs defaultValue="history" className="space-y-3">
                <TabsList>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="packages">Pacotes</TabsTrigger>
                  <TabsTrigger value="balance">Saldo</TabsTrigger>
                </TabsList>

                <TabsContent value="history">
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
                        <div key={booking.id} className="p-3 rounded-lg border border-border bg-card/50">
                          <div className="flex items-start gap-3">
                            <div 
                              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ 
                                backgroundColor: `${booking.service?.color}20`,
                                color: booking.service?.color 
                              }}
                            >
                              <Calendar className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <h4 className="font-medium text-sm truncate">{booking.service?.name}</h4>
                                <Badge variant={getStatusVariant(booking.status)} className="text-[10px] flex-shrink-0">
                                  {getStatusLabel(booking.status)}
                                </Badge>
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {format(parseISO(booking.starts_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                                </span>
                                <span>{booking.staff?.name || 'Qualquer'}</span>
                                <span className="font-medium text-success">
                                  R$ {((booking.service?.price_cents || 0) / 100).toFixed(0)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="packages">
                  <CustomerPackagesTab customerId={selectedCustomer.id} />
                </TabsContent>

                <TabsContent value="balance">
                  <CustomerBalanceTab customerId={selectedCustomer.id} />
                </TabsContent>
              </Tabs>
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
            
            <div className="space-y-2">
              <Label htmlFor="edit-birthday">Data de Nascimento</Label>
              <Input
                id="edit-birthday"
                type="date"
                value={editForm.birthday}
                onChange={(e) => setEditForm(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-notes">Observações / Anamnese</Label>
              <Textarea
                id="edit-notes"
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Alergias, preferências, informações relevantes..."
                className="resize-none"
                rows={3}
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

      {/* Add Customer Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>
              Cadastre um novo cliente na barbearia
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-name">Nome *</Label>
              <Input
                id="add-name"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Nome do cliente"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-phone">WhatsApp *</Label>
              <Input
                id="add-phone"
                value={addForm.phone}
                onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(00) 00000-0000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="add-email">Email</Label>
              <Input
                id="add-email"
                type="email"
                value={addForm.email}
                onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-birthday">Data de Nascimento</Label>
              <Input
                id="add-birthday"
                type="date"
                value={addForm.birthday}
                onChange={(e) => setAddForm(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="add-notes">Observações / Anamnese</Label>
              <Textarea
                id="add-notes"
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Alergias, preferências, informações relevantes..."
                className="resize-none"
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleAddCustomer} disabled={saving}>
              {saving ? "Salvando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
