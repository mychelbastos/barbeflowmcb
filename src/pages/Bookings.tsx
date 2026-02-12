import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  const [editForm, setEditForm] = useState({ service_id: "", staff_id: "", date: "", time: "" });
  const [editLoading, setEditLoading] = useState(false);
  const [editServices, setEditServices] = useState<any[]>([]);
  const [editStaff, setEditStaff] = useState<any[]>([]);

  // List view state
  const [listBookings, setListBookings] = useState<any[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false);
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
      if (viewMode === "list") loadListData();
    }
    prevModalOpen.current = modalIsOpen;
  }, [modalIsOpen]);

  // Load list view data
  useEffect(() => {
    if (viewMode === "list" && currentTenant) {
      loadListData();
    }
  }, [viewMode, currentTenant, selectedDate]);

  useEffect(() => {
    if (viewMode === "list") filterListBookings();
  }, [listBookings, searchTerm, statusFilter]);

  const loadListData = async () => {
    if (!currentTenant) return;
    setListLoading(true);
    try {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      const dayStart = `${dateStr}T00:00:00-03:00`;
      const dayEnd = `${dateStr}T23:59:59-03:00`;

      const { data, error } = await supabase
        .from("bookings")
        .select(`*, service:services(name, color, duration_minutes, price_cents), staff:staff(name, color), customer:customers(name, phone, email)`)
        .eq("tenant_id", currentTenant.id)
        .gte("starts_at", dayStart)
        .lte("starts_at", dayEnd)
        .neq("status", "cancelled")
        .order("starts_at", { ascending: true });

      if (error) throw error;

      const bookingIds = (data || []).map((b) => b.id);
      let paymentsMap: Record<string, any> = {};
      if (bookingIds.length > 0) {
        const { data: payments } = await supabase.from("payments").select("*").in("booking_id", bookingIds);
        if (payments) paymentsMap = payments.reduce((acc, p) => { acc[p.booking_id] = p; return acc; }, {} as Record<string, any>);
      }

      setListBookings((data || []).map((b) => ({ ...b, payment: paymentsMap[b.id] || null })));
    } catch (err) {
      console.error("Error loading list bookings:", err);
    } finally {
      setListLoading(false);
    }
  };

  const filterListBookings = () => {
    let filtered = [...listBookings];
    if (searchTerm) {
      filtered = filtered.filter((b) =>
        b.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.customer?.phone?.includes(searchTerm) ||
        b.service?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== "all") filtered = filtered.filter((b) => b.status === statusFilter);
    setFilteredBookings(filtered);
  };

  const updateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      // If cancelling, check for benefit-linked booking and refund session
      if (newStatus === "cancelled") {
        const { data: bookingData } = await supabase
          .from("bookings")
          .select("customer_package_id, customer_subscription_id, service_id")
          .eq("id", bookingId)
          .single();

        if (bookingData?.customer_package_id) {
          // Refund package session
          const { data: cpSvc } = await supabase
            .from("customer_package_services")
            .select("id, sessions_used")
            .eq("customer_package_id", bookingData.customer_package_id)
            .eq("service_id", bookingData.service_id)
            .single();
          if (cpSvc && cpSvc.sessions_used > 0) {
            await supabase.from("customer_package_services")
              .update({ sessions_used: cpSvc.sessions_used - 1 })
              .eq("id", cpSvc.id);
            // Also update the parent customer_packages counter
            const { data: cp } = await supabase
              .from("customer_packages")
              .select("id, sessions_used, status")
              .eq("id", bookingData.customer_package_id)
              .single();
            if (cp) {
              const updates: any = { sessions_used: Math.max(0, cp.sessions_used - 1) };
              if (cp.status === "completed") updates.status = "active";
              await supabase.from("customer_packages").update(updates).eq("id", cp.id);
            }
          }
        }

        if (bookingData?.customer_subscription_id) {
          // Refund subscription session
          const todayStr = new Date().toISOString().split("T")[0];
          const { data: usage } = await supabase
            .from("subscription_usage")
            .select("id, sessions_used, booking_ids")
            .eq("subscription_id", bookingData.customer_subscription_id)
            .eq("service_id", bookingData.service_id)
            .lte("period_start", todayStr)
            .gte("period_end", todayStr)
            .maybeSingle();
          if (usage && usage.sessions_used > 0) {
            const newBookingIds = (usage.booking_ids || []).filter((id: string) => id !== bookingId);
            await supabase.from("subscription_usage")
              .update({ sessions_used: usage.sessions_used - 1, booking_ids: newBookingIds })
              .eq("id", usage.id);
          }
        }
      }

      const { error } = await supabase.from("bookings").update({ status: newStatus }).eq("id", bookingId);
      if (error) throw error;

      const notificationTypeMap: Record<string, string | null> = {
        cancelled: "booking_cancelled",
        confirmed: "booking_confirmed",
        completed: null,
        no_show: null,
      };
      const notificationType = notificationTypeMap[newStatus];
      if (notificationType && currentTenant) {
        try {
          await supabase.functions.invoke("send-whatsapp-notification", {
            body: { type: notificationType, booking_id: bookingId, tenant_id: currentTenant.id },
          });
        } catch (e) { console.error(e); }
      }

      toast({ title: "Status atualizado", description: `Agendamento marcado como ${getStatusLabel(newStatus)}` });
      refetch();
      if (viewMode === "list") loadListData();
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
    setEditForm({
      service_id: selectedBooking.service_id,
      staff_id: selectedBooking.staff_id || "none",
      date: format(parseISO(selectedBooking.starts_at), "yyyy-MM-dd"),
      time: format(parseISO(selectedBooking.starts_at), "HH:mm"),
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
      const service = editServices.find((s) => s.id === editForm.service_id);
      const startsAt = new Date(`${editForm.date}T${editForm.time}`);
      const endsAt = new Date(startsAt.getTime() + (service?.duration_minutes || 30) * 60000);

      const { error } = await supabase
        .from("bookings")
        .update({
          service_id: editForm.service_id,
          staff_id: editForm.staff_id === "none" ? null : editForm.staff_id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
        })
        .eq("id", selectedBooking.id);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Agendamento atualizado" });
      setShowDetails(false);
      setEditMode(false);
      refetch();
      if (viewMode === "list") loadListData();
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

  const loading = viewMode === "grid" ? gridLoading : listLoading;

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
                            <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: booking.service?.color || "#3B82F6" }} />
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
                          <div className="flex items-center gap-1"><User className="h-3 w-3" />{booking.staff?.name || "Qualquer"}</div>
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-border">
                          <span className="font-medium text-sm">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setShowDetails(true); }} className="h-8 w-8 p-0"><Edit className="h-4 w-4" /></Button>
                            {booking.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "completed")} className="h-8 w-8 p-0"><CheckCircle className="h-4 w-4 text-emerald-500" /></Button>}
                            {booking.status !== "cancelled" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "cancelled")} className="h-8 w-8 p-0"><XCircle className="h-4 w-4 text-destructive" /></Button>}
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
                            <TableCell>{booking.staff?.name || "Qualquer"}</TableCell>
                            <TableCell>
                              <div className="text-sm">{format(parseISO(booking.starts_at), "HH:mm")} - {format(parseISO(booking.ends_at), "HH:mm")}</div>
                            </TableCell>
                            <TableCell><span className="font-medium">R$ {((booking.service?.price_cents || 0) / 100).toFixed(2)}</span></TableCell>
                            <TableCell>
                              {booking.payment ? (
                                <Badge variant={getPaymentStatusVariant(booking.payment)}>{getPaymentStatusLabel(booking.payment)}</Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">No local</span>
                              )}
                            </TableCell>
                            <TableCell><Badge variant={getStatusVariant(booking.status)}>{getStatusLabel(booking.status)}</Badge></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => { setSelectedBooking(booking); setShowDetails(true); }}><Edit className="h-4 w-4" /></Button>
                                {booking.status === "confirmed" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "completed")}><CheckCircle className="h-4 w-4 text-emerald-500" /></Button>}
                                {booking.status !== "cancelled" && <Button variant="ghost" size="sm" onClick={() => updateBookingStatus(booking.id, "cancelled")}><XCircle className="h-4 w-4 text-destructive" /></Button>}
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

      {/* Booking Details Dialog */}
      <Dialog open={showDetails} onOpenChange={(open) => { setShowDetails(open); if (!open) setEditMode(false); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editMode ? "Editar Agendamento" : "Detalhes do Agendamento"}</DialogTitle>
            <DialogDescription>{editMode ? "Altere os dados do agendamento" : "Informações completas do agendamento"}</DialogDescription>
          </DialogHeader>
          {selectedBooking && !editMode && (
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
                  <p className="text-sm">{selectedBooking.staff?.name || "Qualquer"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Horário</Label>
                  <p className="text-sm">
                    {format(parseISO(selectedBooking.starts_at), "HH:mm")} - {format(parseISO(selectedBooking.ends_at), "HH:mm")}
                  </p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1"><Badge variant={getStatusVariant(selectedBooking.status)}>{getStatusLabel(selectedBooking.status)}</Badge></div>
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <Label className="text-sm font-medium">Observações</Label>
                  <p className="text-sm">{selectedBooking.notes}</p>
                </div>
              )}
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Valor</Label>
                  <p className="text-sm font-semibold">
                    {selectedBooking.customer_package_id || selectedBooking.customer_subscription_id
                      ? 'Incluso no plano/pacote'
                      : `R$ ${((selectedBooking.service?.price_cents || 0) / 100).toFixed(2)}`}
                  </p>
                </div>
                {selectedBooking.customer_package_id && (
                  <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">Pacote</Badge>
                )}
                {selectedBooking.customer_subscription_id && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">Assinatura</Badge>
                )}
              </div>

              {/* Quick status actions */}
              <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-border">
                {selectedBooking.status !== "cancelled" && selectedBooking.status !== "completed" && (
                  <Button size="sm" variant="outline" onClick={startEditMode}>
                    <Edit className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
                {selectedBooking.status === "confirmed" && (
                  <Button size="sm" variant="outline" onClick={() => { updateBookingStatus(selectedBooking.id, "completed"); setShowDetails(false); }}>
                    <CheckCircle className="h-4 w-4 mr-1 text-emerald-500" /> Concluir
                  </Button>
                )}
                {selectedBooking.status !== "cancelled" && (
                  <Button size="sm" variant="destructive" onClick={() => { updateBookingStatus(selectedBooking.id, "cancelled"); setShowDetails(false); }}>
                    <XCircle className="h-4 w-4 mr-1" /> Cancelar
                  </Button>
                )}
                {selectedBooking.customer?.phone && (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    type="button"
                    onClick={() => {
                      const digits = selectedBooking.customer.phone.replace(/\D/g, '');
                      const remoteJid = `${digits.startsWith('55') ? digits : '55' + digits}@s.whatsapp.net`;
                      navigate(`/app/whatsapp/inbox?contact=${encodeURIComponent(remoteJid)}`);
                    }}
                  >
                    <MessageCircle className="h-4 w-4 mr-1 text-emerald-500" /> WhatsApp
                  </Button>
                )}
              
              </div>
            </div>
          )}
          {selectedBooking && editMode && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Serviço</Label>
                <Select value={editForm.service_id} onValueChange={(v) => setEditForm((f) => ({ ...f, service_id: v }))}>
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
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data</Label>
                  <Input type="date" value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm font-medium">Horário</Label>
                  <Input type="time" value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} />
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
    </div>
  );
}
