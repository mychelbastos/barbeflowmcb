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

      const [customersResult, recurringResult, packageResult, subscriptionResult] = await Promise.all([
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
          .eq('status', 'active'),
        supabase
          .from('customer_subscriptions')
          .select('customer_id')
          .eq('tenant_id', currentTenant.id)
          .in('status', ['active', 'authorized'])
      ]);

      if (customersResult.error) throw customersResult.error;

      setTotalCount(customersResult.count || 0);

      const recurringCustomerIds = new Set(
        (recurringResult.data || []).map((r: any) => r.customer_id)
      );
      const packageCustomerIds = new Set(
        (packageResult.data || []).map((r: any) => r.customer_id)
      );
      const subscriptionCustomerIds = new Set(
        (subscriptionResult.data || []).map((r: any) => r.customer_id)
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
          hasSubscription: subscriptionCustomerIds.has(customer.id),
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
              Gerencie a base de clientes do seu estabelecimento
            </p>
          </div>
          <Button onClick={() => setShowAddModal(true)} size="sm" className="shrink-0">
            <Plus className="h-4 w-4 mr-1" />
            Adicionar
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            className="pl-10 h-11"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead className="hidden md:table-cell">Contatos</TableHead>
              <TableHead className="hidden sm:table-cell">Última Visita</TableHead>
              <TableHead className="hidden lg:table-cell text-right">Total Gasto</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  <User className="h-12 w-12 mx-auto mb-3 opacity-20" />
                  <p>Nenhum cliente encontrado</p>
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id} className="cursor-pointer hover:bg-muted/50" onClick={() => loadCustomerDetails(customer)}>
                  <TableCell>
                    <div className="flex flex-col">
                      <div className="font-medium text-foreground flex items-center gap-2">
                        {customer.name}
                        {customer.isRecurring && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-violet-500/10 text-violet-500 border-violet-200 dark:border-violet-500/30">
                            Fixo
                          </Badge>
                        )}
                        {customer.hasPackage && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-500 dark:border-amber-500/30">
                            Pacote
                          </Badge>
                        )}
                        {customer.hasSubscription && (
                          <Badge variant="secondary" className="text-[10px] h-5 bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-500 dark:border-violet-500/30">
                            Assinatura
                          </Badge>
                        )}
                      </div>
                      <div className="md:hidden text-xs text-muted-foreground mt-0.5">
                        {customer.phone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col text-sm text-muted-foreground gap-1">
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                    {customer.lastVisit ? format(customer.lastVisit, "dd/MM/yyyy", { locale: ptBR }) : "Nunca"}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-right font-medium">
                    R$ {(customer.totalSpent / 100).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => handleEditClick(customer)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteClick(customer)}>
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

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" onClick={loadMore} disabled={loadingMore}>
            {loadingMore ? "Carregando..." : "Carregar mais"}
          </Button>
        </div>
      )}

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Cliente</DialogTitle>
            <DialogDescription>Cadastre um novo cliente manualmente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                placeholder="Ex: João Silva"
                value={addForm.name}
                onChange={(e) => setAddForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                placeholder="Ex: 11999999999"
                value={addForm.phone}
                onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                placeholder="Ex: joao@email.com"
                value={addForm.email}
                onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={addForm.birthday}
                onChange={(e) => setAddForm(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Preferências, alergias, etc."
                value={addForm.notes}
                onChange={(e) => setAddForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleAddCustomer} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Telefone (WhatsApp) *</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={editForm.email}
                onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Data de Nascimento</Label>
              <Input
                type="date"
                value={editForm.birthday}
                onChange={(e) => setEditForm(prev => ({ ...prev, birthday: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{customerToDelete?.name}</strong>? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} disabled={saving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {saving ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Details Sheet/Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Cliente</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedCustomer.name}</h3>
                    <div className="text-sm text-muted-foreground flex flex-col gap-1 mt-1">
                      <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {selectedCustomer.phone}</div>
                      {selectedCustomer.email && <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {selectedCustomer.email}</div>}
                      {selectedCustomer.birthday && <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5" /> {format(parseISO(selectedCustomer.birthday), "dd/MM/yyyy")}</div>}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Total Gasto</p>
                        <p className="text-lg font-bold text-primary">R$ {(selectedCustomer.totalSpent / 100).toFixed(2)}</p>
                      </CardContent>
                    </Card>
                    <Card className="bg-muted/30">
                      <CardContent className="p-3">
                        <p className="text-xs text-muted-foreground">Agendamentos</p>
                        <p className="text-lg font-bold">{selectedCustomer.totalBookings}</p>
                      </CardContent>
                    </Card>
                  </div>

                  {selectedCustomer.notes && (
                    <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
                      <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Observações:</p>
                      <p className="text-sm text-amber-800 dark:text-amber-200">{selectedCustomer.notes}</p>
                    </div>
                  )}
                </div>
              </div>

              <Tabs defaultValue="bookings">
                <TabsList className="w-full">
                  <TabsTrigger value="bookings" className="flex-1">Histórico</TabsTrigger>
                  <TabsTrigger value="packages" className="flex-1">Pacotes</TabsTrigger>
                  <TabsTrigger value="balance" className="flex-1">Saldo</TabsTrigger>
                </TabsList>
                
                <TabsContent value="bookings" className="mt-4">
                  {detailsLoading ? (
                    <div className="h-32 bg-muted/30 rounded animate-pulse" />
                  ) : customerBookings.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhum agendamento registrado</div>
                  ) : (
                    <div className="space-y-3">
                      {customerBookings.map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                          <div>
                            <p className="font-medium text-sm">{booking.service?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(booking.starts_at), "dd/MM/yyyy HH:mm")} • {booking.staff?.name}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</p>
                            <Badge variant={getStatusVariant(booking.status)} className="text-[10px] h-5">
                              {getStatusLabel(booking.status)}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="packages" className="mt-4">
                  <CustomerPackagesTab customerId={selectedCustomer.id} />
                </TabsContent>

                <TabsContent value="balance" className="mt-4">
                  <CustomerBalanceTab customerId={selectedCustomer.id} />
                </TabsContent>
              </Tabs>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
