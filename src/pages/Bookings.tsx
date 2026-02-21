import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { BookingDetailsModal } from "@/components/modals/BookingDetailsModal";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { useTenant } from "@/hooks/useTenant";
import { supabase } from "@/integrations/supabase/client";
import { NoTenantState } from "@/components/NoTenantState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
} from "@/components/ui/dialog";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  Search,
  Filter,
  Edit,
  CheckCircle,
  XCircle,
  CreditCard,
  Banknote,
  AlertCircle,
  Ban,
  MessageCircle,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useBookingsByDate, type BookingData } from "@/hooks/useBookingsByDate";
import { useBookingModal } from "@/hooks/useBookingModal";
import { DateNavigator } from "@/components/calendar/DateNavigator";
import { ScheduleGrid } from "@/components/calendar/ScheduleGrid";
import { BlockDialog } from "@/components/calendar/BlockDialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useIsMobile } from "@/hooks/use-mobile";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export default function Bookings() {
  const navigate = useNavigate();
  const { currentTenant, loading: tenantLoading } = useTenant();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { isOpen: modalIsOpen } = useBookingModal();

  // View state
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visibleStaffIds, setVisibleStaffIds] = useState<string[]>([]);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  // Detail dialog
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ service_id: "", staff_id: "", date: "", time: "", end_time: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editServices, setEditServices] = useState<any[]>([]);
  const [editStaff, setEditStaff] = useState<any[]>([]);
  const [conflictWarning, setConflictWarning] = useState<{ open: boolean; conflicts: any[] }>({ open: false, conflicts: [] });
  

  // List view state
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Grid data
  const {
    staff,
    schedules,
    bookings: gridBookings,
    blocks,
    settings,
    timeRange,
    loading: gridLoading,
    refetch,
    recurringCustomerIds,
  } = useBookingsByDate(currentTenant?.id, selectedDate);

  // Initialize visible staff when staff loads
  useEffect(() => {
    if (staff.length > 0 && visibleStaffIds.length === 0) {
      setVisibleStaffIds(staff.map((s) => s.id));
    }
  }, [staff]);

  // Refetch grid when booking modal closes (new booking created)
  const prevModalOpen = useRef(modalIsOpen);
  useEffect(() => {
    if (prevModalOpen.current && !modalIsOpen) {
      refetch();
    }
    prevModalOpen.current = modalIsOpen;
  }, [modalIsOpen]);

  // Helper to check if a booking is virtual (recurring)
  const isVirtualBooking = (bookingId: string) => bookingId.startsWith("recurring-");

  // Filtered list from grid data (includes virtual recurring bookings)
  const filteredBookings = useMemo(() => {
    let filtered = [...gridBookings];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((b) =>
        b.customer?.name?.toLowerCase().includes(term) ||
        b.customer?.phone?.includes(searchTerm) ||
        b.service?.name?.toLowerCase().includes(term)
      );
    }
    if (statusFilter !== "all") filtered = filtered.filter((b) => b.status === statusFilter);
    return filtered.sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime());
  }, [gridBookings, searchTerm, statusFilter]);

  // Materialize a virtual recurring booking into a real one in the database
  const materializeVirtualBooking = async (booking: BookingData): Promise<string | null> => {
    if (!currentTenant) return null;
    try {
      const { data, error } = await supabase
        .from("bookings")
        .insert({
          tenant_id: currentTenant.id,
          customer_id: booking.customer_id,
          service_id: booking.service_id,
          staff_id: booking.staff_id,
          starts_at: booking.starts_at,
          ends_at: booking.ends_at,
          status: "confirmed",
          notes: booking.notes,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id;
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao criar agendamento real", variant: "destructive" });
      return null;
    }
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string, booking?: BookingData) => {
    let realId = bookingId;

    // If it's a virtual booking, materialize it first
    if (isVirtualBooking(bookingId)) {
      if (!booking) {
        toast({ title: "Erro", description: "Dados do agendamento não encontrados", variant: "destructive" });
        return;
      }
      const id = await materializeVirtualBooking(booking);
      if (!id) return;
      realId = id;
    }

    try {
      // Use atomic DB functions for cancellation and no_show
      if (newStatus === "cancelled" && currentTenant) {
        const cancellationMinHours = currentTenant.settings?.cancellation_min_hours ?? 4;
        const { data: result, error: rpcError } = await supabase.rpc("cancel_booking_with_refund", {
          p_booking_id: realId,
          p_tenant_id: currentTenant.id,
          p_cancellation_min_hours: cancellationMinHours,
        });
        if (rpcError) throw rpcError;
        const res = result as any;
        if (!res?.success) throw new Error(res?.error || "Erro ao cancelar");
        
        // Show appropriate message based on session outcome
        if (res.session_outcome === 'refunded') {
          toast({ title: "Sessão devolvida", description: `Cancelado com ${res.hours_until_start}h de antecedência. Sessão devolvida ao cliente.` });
        } else if (res.session_outcome === 'forfeited') {
          toast({ title: "Sessão consumida", description: `Cancelamento tardio (menos de ${cancellationMinHours}h). Sessão não devolvida.`, variant: "destructive" });
        }
      } else if (newStatus === "no_show" && currentTenant) {
        const { data: result, error: rpcError } = await supabase.rpc("mark_booking_no_show", {
          p_booking_id: realId,
          p_tenant_id: currentTenant.id,
        });
        if (rpcError) throw rpcError;
        const res = result as any;
        if (!res?.success) throw new Error(res?.error || "Erro ao marcar falta");
      } else {
        const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", realId);
        if (error) throw error;
      }

      // Mark completed bookings with benefits as consumed
      if (newStatus === "completed") {
        await supabase.from("bookings").update({ session_outcome: "consumed" }).eq("id", realId).not("customer_package_id", "is", null).or("customer_subscription_id.not.is.null");
      }

      const notificationTypeMap: Record<string, string | null> = {
        cancelled: "booking_cancelled",
        confirmed: "booking_confirmed",
        completed: null,
        no_show: "booking_no_show",
      };
      const notificationType = notificationTypeMap[newStatus];
      if (notificationType && currentTenant) {
        try {
          await supabase.functions.invoke("send-whatsapp-notification", {
            body: { type: notificationType, booking_id: realId, tenant_id: currentTenant.id },
          });
        } catch (e) { console.error(e); }
      }

      toast({ title: "Status atualizado", description: `Agendamento marcado como ${getStatusLabel(newStatus)}` });

      // When completing, keep modal open and show comanda
      if (newStatus === "completed") {
        // Refetch the updated booking with all joins
        const { data: updated } = await supabase
          .from("bookings")
          .select(`
            *,
            service:services(name, color, duration_minutes, price_cents),
            staff:staff(name, color, is_owner, default_commission_percent, product_commission_percent),
            customer:customers(name, phone, notes)
          `)
          .eq("id", realId)
          .single();

        if (updated) {
          setSelectedBooking(updated);
          // showDetails stays true — modal remains open in "completed" state
        }
        refetch();
      } else {
        setShowDetails(false);
        setSelectedBooking(null);
        refetch();
      }
    } catch (err) {
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = { confirmed: "Confirmado", pending: "Aguardando Pagamento", cancelled: "Cancelado", completed: "Concluído", no_show: "Faltou" };
    return labels[status] || status;
  };

  const getStatusVariant = (status: string) => {
    const v: Record<string, "default" | "destructive" | "secondary" | "outline"> = { confirmed: "default", pending: "outline", cancelled: "destructive", completed: "secondary", no_show: "destructive" };
    return v[status] || "secondary";
  };

  const getPaymentStatusLabel = (payment: any) => {
    if (!payment) return "Não requer";
    const l: Record<string, string> = { paid: "Pago", pending: "Pendente", failed: "Falhou" };
    return l[payment.status] || payment.status;
  };

  const getPaymentStatusVariant = (payment: any) => {
    if (!payment) return "secondary" as const;
    const v: Record<string, "default" | "destructive" | "secondary" | "outline"> = { paid: "default", pending: "outline", failed: "destructive" };
    return v[payment.status] || ("secondary" as const);
  };

  const toggleStaffVisibility = (staffId: string) => {
    setVisibleStaffIds((prev) =>
      prev.includes(staffId) ? prev.filter((id) => id !== staffId) : [...prev, staffId]
    );
  };

  const handleBookingClick = (booking: BookingData) => {
    setSelectedBooking(booking);
    setEditMode(false);
    setShowDetails(true);
  };

  const startEditMode = async () => {
    if (!selectedBooking || !currentTenant) return;
    // Materialize virtual booking if needed
    if (isVirtualBooking(selectedBooking.id)) {
      const realId = await materializeVirtualBooking(selectedBooking);
      if (!realId) return;
      setSelectedBooking({ ...selectedBooking, id: realId });
    }
    const endTime = format(parseISO(selectedBooking.ends_at), "HH:mm");
    setEditForm({
      service_id: selectedBooking.service_id,
      staff_id: selectedBooking.staff_id || "none",
      date: format(parseISO(selectedBooking.starts_at), "yyyy-MM-dd"),
      time: format(parseISO(selectedBooking.starts_at), "HH:mm"),
      end_time: endTime,
    });
    // Load services and staff for editing
    const [sRes, stRes] = await Promise.all([
      supabase.from("services").select("*").eq("tenant_id", currentTenant.id).eq("active", true).order("name"),
      supabase.from("staff").select("*").eq("tenant_id", currentTenant.id).eq("active", true).order("name"),
    ]);
    setEditServices(sRes.data || []);
    setEditStaff(stRes.data || []);
    setEditMode(true);
  };

  const saveBookingEdit = async () => {
    if (!selectedBooking || !currentTenant) return;
    setEditLoading(true);
    try {
      const startsAt = new Date(`${editForm.date}T${editForm.time}`);
      const endsAt = new Date(`${editForm.date}T${editForm.end_time}`);

      if (endsAt <= startsAt) {
        toast({ title: "Erro", description: "Horário de término deve ser após o início", variant: "destructive" });
        setEditLoading(false);
        return;
      }

      // Check for conflicts
      const staffId = editForm.staff_id === "none" ? null : editForm.staff_id;
      if (staffId) {
        const { data: conflicts } = await supabase
          .from("bookings")
          .select("id, starts_at, ends_at, customer:customers(name)")
          .eq("staff_id", staffId)
          .neq("id", selectedBooking.id)
          .neq("status", "cancelled")
          .lt("starts_at", endsAt.toISOString())
          .gt("ends_at", startsAt.toISOString());

        if (conflicts && conflicts.length > 0) {
          setConflictWarning({ open: true, conflicts });
          setEditLoading(false);
          return;
        }
      }

      const { error } = await supabase
        .from("bookings")
        .update({
          service_id: editForm.service_id,
          staff_id: staffId,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Agendamento atualizado" });
      setShowDetails(false);
      setEditMode(false);
      refetch();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message || "Erro ao atualizar", variant: "destructive" });
    } finally {
      setEditLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-muted rounded animate-pulse" />
        <div className="h-96 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  if (!currentTenant) return <NoTenantState />;

  const loading = gridLoading;

  const StaffFilter = () => (
    <div className="space-y-2">
      <button
        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() =>
          setVisibleStaffIds(visibleStaffIds.length === staff.length ? [] : staff.map((s) => s.id))
        }
      >
        {visibleStaffIds.length === staff.length ? "Desmarcar todos" : "Selecionar todos"}
      </button>
      {staff.map((s) => (
        <label key={s.id} className="flex items-center gap-2.5 cursor-pointer group py-1">
          <Checkbox
            checked={visibleStaffIds.includes(s.id)}
            onCheckedChange={() => toggleStaffVisibility(s.id)}
          />
          <Avatar className="h-6 w-6">
            <AvatarImage src={s.photo_url || undefined} />
            <AvatarFallback
              className="text-[9px] font-semibold"
              style={{ backgroundColor: `${s.color || "#10B981"}30`, color: s.color || "#10B981" }}
            >
              {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm text-foreground group-hover:text-foreground/80 truncate">{s.name}</span>
        </label>
      ))}
    </div>
  );

  return (
    <div className="space-y-4 px-4 md:px-0">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-foreground">Agendamentos</h1>
        <p className="text-sm text-muted-foreground">Grade visual de agendamentos por profissional</p>
      </div>

      {/* Navigation bar */}
      <DateNavigator
        date={selectedDate}
        onDateChange={setSelectedDate}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      >
        <Button variant="outline" size="sm" onClick={() => setBlockDialogOpen(true)} className="h-8">
          <Ban className="h-3.5 w-3.5 mr-1.5" />
          Bloquear
        </Button>
      </DateNavigator>

      {/* Main content */}
      {viewMode === "grid" ? (
        <div className="flex gap-4">
          {/* Desktop staff sidebar */}
          {!isMobile && staff.length > 0 && (
            <div className="w-48 flex-shrink-0">
              <Card className="sticky top-4">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="text-xs text-muted-foreground uppercase tracking-wider">Profissionais</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <StaffFilter />
                </CardContent>
              </Card>
            </div>
          )}

          {/* Mobile staff filter as sheet */}
          {isMobile && staff.length > 1 && (
            <div className="mb-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 w-full">
                    <Filter className="h-3.5 w-3.5 mr-1.5" />
                    Filtrar Profissionais ({visibleStaffIds.length}/{staff.length})
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72">
                  <SheetHeader>
                    <SheetTitle>Profissionais</SheetTitle>
                  </SheetHeader>
                  <div className="mt-4">
                    <StaffFilter />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="h-96 bg-muted/30 rounded-xl animate-pulse" />
            ) : (
              <ScheduleGrid
                staff={staff}
                schedules={schedules}
                bookings={gridBookings}
                blocks={blocks}
                settings={settings}
                timeRange={timeRange}
                date={selectedDate}
                onBookingClick={handleBookingClick}
                visibleStaffIds={visibleStaffIds}
                recurringCustomerIds={recurringCustomerIds}
              />
            )}
          </div>
        </div>
      ) : (
        /* List view */
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-4">
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Buscar cliente, serviço..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="confirmed">Confirmado</SelectItem>
                    <SelectItem value="pending">Aguardando</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="cancelled">Cancelado</SelectItem>
                    <SelectItem value="no_show">Faltou</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setStatusFilter("all"); }}>
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Agendamentos ({filteredBookings.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="h-48 bg-muted/30 rounded animate-pulse" />
              ) : (
                <>
                  {/* Mobile cards */}
                   <div className="md:hidden space-y-3">
                    {filteredBookings.length === 0 ? (
                      <p className="text-center py-8 text-muted-foreground text-sm">Nenhum agendamento</p>
                    ) : filteredBookings.map((booking) => (
                      <div key={booking.id} className="p-4 rounded-lg border border-border bg-card space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-1 h-10 rounded-full flex-shrink-0"
                              style={{ backgroundColor: booking.staff?.color || "#94a3b8" }}
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <p className="font-medium text-foreground truncate">{booking.customer?.name}</p>
                                {recurringCustomerIds.has(booking.customer_id) && (
                                  <span className="flex-shrink-0 text-[9px] font-semibold bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">Fixo</span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{booking.service?.name}</p>
                            </div>
                          </div>
                          <Badge variant={getStatusVariant(booking.status)} className="text-xs flex-shrink-0">{getStatusLabel(booking.status)}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1"><Clock className="h-3 w-3" />{format(parseISO(booking.starts_at), "HH:mm")} - {format(parseISO(booking.ends_at), "HH:mm")}</div>
                          <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: booking.staff?.color || "#94a3b8" }} />
                            <span>{booking.staff?.name || "Qualquer"}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-medium text-sm">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setShowDetails(true); }} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                            {booking.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "completed", booking)} className="h-8 w-8 p-0"><CheckCircle className="h-4 w-4 text-emerald-500" /></Button>}
                            {booking.status !== "cancelled" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "cancelled", booking)} className="h-8 w-8 p-0"><XCircle className="h-4 w-4 text-destructive" /></Button>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Cliente</TableHead>
                          <TableHead>Serviço</TableHead>
                          <TableHead>Profissional</TableHead>
                          <TableHead>Horário</TableHead>
                          <TableHead>Valor</TableHead>
                          <TableHead>Pagamento</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredBookings.length === 0 ? (
                          <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum agendamento</TableCell></TableRow>
                        ) : filteredBookings.map((booking) => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium">{booking.customer?.name}</span>
                                {recurringCustomerIds.has(booking.customer_id) && (
                                  <span className="text-[9px] font-semibold bg-violet-500/20 text-violet-400 px-1.5 py-0.5 rounded">Fixo</span>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center"><Phone className="h-3 w-3 mr-1" />{booking.customer?.phone}</div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: booking.service?.color || "#3B82F6" }} />
                                <div>
                                  <div className="font-medium">{booking.service?.name}</div>
                                  <div className="text-sm text-muted-foreground">{booking.service?.duration_minutes}min</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: booking.staff?.color || "#94a3b8" }} />
                                <span className="font-medium">{booking.staff?.name || "Qualquer"}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">{format(parseISO(booking.starts_at), "HH:mm")} - {format(parseISO(booking.ends_at), "HH:mm")}</div>
                            </TableCell>
                            <TableCell><span className="font-medium">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span></TableCell>
                            <TableCell>
                              {(booking as any).payment ? (
                                <Badge variant={getPaymentStatusVariant((booking as any).payment)}>{getPaymentStatusLabel((booking as any).payment)}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">No local</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant={getStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setShowDetails(true); }}><Edit className="h-4 w-4" /></Button>
                                {booking.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "completed", booking)}><CheckCircle className="h-4 w-4 text-emerald-500" /></Button>}
                                {booking.status !== "cancelled" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "cancelled", booking)}><XCircle className="h-4 w-4 text-destructive" /></Button>}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Block Dialog */}
      <BlockDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        staff={staff}
        defaultDate={format(selectedDate, "yyyy-MM-dd")}
        onCreated={refetch}
      />

      {/* Booking Details - Unified Modal (view mode) */}
      {currentTenant && !editMode && (
        <BookingDetailsModal
          booking={selectedBooking}
          tenantId={currentTenant.id}
          open={showDetails && !editMode}
          onOpenChange={(open) => { setShowDetails(open); if (!open) { setEditMode(false); setSelectedBooking(null); } }}
          showActions
          onEdit={startEditMode}
          onStatusChange={updateBookingStatus}
        />
      )}

      {/* Edit Mode Dialog */}
      <Dialog open={showDetails && editMode} onOpenChange={(open) => { if (!open) { setEditMode(false); setShowDetails(false); } }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Agendamento</DialogTitle>
            <DialogDescription>Altere os dados do agendamento</DialogDescription>
          </DialogHeader>
          {selectedBooking && editMode && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Serviço</Label>
                <Select value={editForm.service_id} onValueChange={(v) => {
                  const svc = editServices.find((s) => s.id === v);
                  setEditForm((f) => {
                    if (svc && f.time) {
                      const [h, m] = f.time.split(":").map(Number);
                      const endMins = h * 60 + m + (svc.duration_minutes || 30);
                      const endH = Math.floor(endMins / 60).toString().padStart(2, "0");
                      const endM = (endMins % 60).toString().padStart(2, "0");
                      return { ...f, service_id: v, end_time: `${endH}:${endM}` };
                    }
                    return { ...f, service_id: v };
                  });
                }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {editServices.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} - {s.duration_minutes}min - R$ {(s.price_cents / 100).toFixed(2)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm font-medium">Profissional</Label>
                <Select value={editForm.staff_id} onValueChange={(v) => setEditForm((f) => ({ ...f, staff_id: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Qualquer profissional</SelectItem>
                    {editStaff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className="text-sm font-medium">Data</Label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Início</Label>
                  <Input type="time" value={editForm.time} onChange={(e) => {
                    const newTime = e.target.value;
                    setEditForm((f) => {
                      const svc = editServices.find((s) => s.id === f.service_id);
                      if (svc && newTime) {
                        const [h, m] = newTime.split(":").map(Number);
                        const endMins = h * 60 + m + (svc.duration_minutes || 30);
                        const endH = Math.floor(endMins / 60).toString().padStart(2, "0");
                        const endM = (endMins % 60).toString().padStart(2, "0");
                        return { ...f, time: newTime, end_time: `${endH}:${endM}` };
                      }
                      return { ...f, time: newTime };
                    });
                  }} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Término</Label>
                  <Input type="time" value={editForm.end_time} onChange={(e) => setEditForm((f) => ({ ...f, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 pt-2 border-t border-border">
                <Button size="sm" onClick={saveBookingEdit} disabled={editLoading}>
                  {editLoading ? "Salvando..." : "Salvar"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditMode(false)} disabled={editLoading}>
                  Voltar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Conflict Warning Dialog */}
      <AlertDialog open={conflictWarning.open} onOpenChange={(open) => setConflictWarning((c) => ({ ...c, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Conflito de horário
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2">
                <p>Não é possível salvar. Os seguintes agendamentos ocupam este horário:</p>
                <ul className="list-disc pl-4 space-y-1">
                  {conflictWarning.conflicts.map((c) => (
                    <li key={c.id} className="text-sm">
                      <span className="font-medium">{(c.customer as any)?.name || "Cliente"}</span>
                      {" — "}
                      {format(parseISO(c.starts_at), "HH:mm")} - {format(parseISO(c.ends_at), "HH:mm")}
                    </li>
                  ))}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Entendi</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
