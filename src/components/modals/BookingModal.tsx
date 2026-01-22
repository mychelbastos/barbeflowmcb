import { useState, useEffect } from "react";
import { useTenant } from "@/hooks/useTenant";
import { useBookingModal } from "@/hooks/useBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const bookingFormSchema = z.object({
  customer_name: z.string().min(1, "Nome é obrigatório"),
  customer_phone: z.string().min(1, "Telefone é obrigatório"),
  customer_email: z.string().email("Email inválido").optional().or(z.literal("")),
  service_id: z.string().min(1, "Serviço é obrigatório"),
  staff_id: z.string().optional(),
  date: z.string().min(1, "Data é obrigatória"),
  time: z.string().min(1, "Horário é obrigatório"),
  notes: z.string().optional(),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export function BookingModal() {
  const { currentTenant } = useTenant();
  const { isOpen, closeBookingModal } = useBookingModal();
  const { toast } = useToast();
  const [services, setServices] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [formLoading, setFormLoading] = useState(false);

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      service_id: "",
      staff_id: "",
      date: "",
      time: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (isOpen && currentTenant) {
      loadFormData();
    }
  }, [isOpen, currentTenant]);

  const loadFormData = async () => {
    if (!currentTenant) return;

    try {
      const [servicesResult, staffResult] = await Promise.all([
        supabase
          .from('services')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name'),
        supabase
          .from('staff')
          .select('*')
          .eq('tenant_id', currentTenant.id)
          .eq('active', true)
          .order('name')
      ]);

      if (servicesResult.error) throw servicesResult.error;
      if (staffResult.error) throw staffResult.error;

      setServices(servicesResult.data || []);
      setStaff(staffResult.data || []);
    } catch (error) {
      console.error('Error loading form data:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados do formulário",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (data: BookingFormData) => {
    if (!currentTenant) return;

    try {
      setFormLoading(true);

      // Create or get customer
      let customerId;
      
      // First try to find existing customer by phone
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('tenant_id', currentTenant.id)
        .eq('phone', data.customer_phone)
        .single();

      if (existingCustomer) {
        customerId = existingCustomer.id;
        
        // Update customer info if needed
        await supabase
          .from('customers')
          .update({
            name: data.customer_name,
            email: data.customer_email || null,
          })
          .eq('id', customerId);
      } else {
        // Create new customer
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            tenant_id: currentTenant.id,
            name: data.customer_name,
            phone: data.customer_phone,
            email: data.customer_email || null,
          })
          .select()
          .single();

        if (customerError) throw customerError;
        customerId = newCustomer.id;
      }

      // Get service details for duration
      const { data: service } = await supabase
        .from('services')
        .select('duration_minutes')
        .eq('id', data.service_id)
        .single();

      // Create booking
      const startsAt = new Date(`${data.date}T${data.time}`);
      const endsAt = new Date(startsAt.getTime() + (service?.duration_minutes || 60) * 60000);

      const { error: bookingError } = await supabase
        .from('bookings')
        .insert({
          tenant_id: currentTenant.id,
          customer_id: customerId,
          service_id: data.service_id,
          staff_id: data.staff_id === "none" ? null : data.staff_id,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          status: 'confirmed',
          notes: data.notes || null,
        });

      if (bookingError) throw bookingError;

      toast({
        title: "Sucesso",
        description: "Agendamento criado com sucesso!",
      });

      form.reset();
      closeBookingModal();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar agendamento",
        variant: "destructive",
      });
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={closeBookingModal}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Agendamento</DialogTitle>
          <DialogDescription>
            Criar um novo agendamento para cliente
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3 md:space-y-4">
            {/* Customer Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="customer_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Cliente *</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: João Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customer_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="customer_email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email (Opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="cliente@email.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Service and Staff */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="service_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serviço *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um serviço" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: service.color }}
                              />
                              <span>{service.name} - {service.duration_minutes}min - R$ {(service.price_cents / 100).toFixed(2)}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="staff_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Profissional</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Qualquer profissional" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Qualquer profissional</SelectItem>
                        {staff.map((member) => (
                          <SelectItem key={member.id} value={member.id}>
                            {member.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Date and Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="time"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Horário *</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações sobre o agendamento..." 
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => closeBookingModal()}
                disabled={formLoading}
                className="w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={formLoading} className="w-full sm:w-auto">
                {formLoading ? "Criando..." : "Criar Agendamento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}