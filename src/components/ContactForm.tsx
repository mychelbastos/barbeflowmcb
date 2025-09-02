import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  notes: z.string().optional(),
});

type ContactFormData = z.infer<typeof contactSchema>;

interface ContactFormProps {
  onSubmit: (data: ContactFormData) => void;
  isLoading?: boolean;
}

export const ContactForm = ({ onSubmit, isLoading = false }: ContactFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const handleFormSubmit = (data: ContactFormData) => {
    onSubmit(data);
    toast({
      title: "Dados validados!",
      description: "Finalizando seu agendamento...",
    });
    reset();
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome completo *</Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Seu nome completo"
            className={`h-11 ${errors.name ? 'border-destructive' : ''}`}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">WhatsApp *</Label>
          <Input
            id="phone"
            type="tel"
            {...register("phone")}
            placeholder="(11) 99999-9999"
            className={`h-11 ${errors.phone ? 'border-destructive' : ''}`}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Enviaremos a confirmação por WhatsApp
          </p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">E-mail (opcional)</Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="seu@email.com"
            className={`h-11 ${errors.email ? 'border-destructive' : ''}`}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="notes">Observações (opcional)</Label>
          <Textarea
            id="notes"
            {...register("notes")}
            placeholder="Alguma observação especial?"
            rows={3}
          />
        </div>
      </div>

      <Button 
        type="submit" 
        size="lg" 
        className="w-full" 
        variant="hero"
        disabled={isLoading}
      >
        {isLoading ? "Confirmando..." : "Confirmar Agendamento"}
      </Button>
    </form>
  );
};