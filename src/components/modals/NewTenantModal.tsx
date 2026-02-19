import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackEvent } from "@/utils/metaTracking";
import { getFbp, getPersistedFbc } from "@/utils/metaTracking";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useTenant } from "@/hooks/useTenant";

const formSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  slug: z.string()
    .min(2, "Slug deve ter pelo menos 2 caracteres")
    .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  phone: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  address: z.string().optional(),
});

interface NewTenantModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewTenantModal({ open, onOpenChange }: NewTenantModalProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      slug: "",
      phone: "",
      email: "",
      address: "",
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Verificar se o slug já existe
      const { data: existingTenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', values.slug)
        .single();

      if (existingTenant) {
        toast({
          title: "Erro",
          description: "Este slug já está em uso. Escolha outro.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Criar novo tenant
      const { data: newTenant, error: tenantError } = await supabase
        .from('tenants')
        .insert([
          {
            name: values.name,
            slug: values.slug,
            phone: values.phone || null,
            email: values.email || null,
            address: values.address || null,
          }
        ])
        .select()
        .single();

      if (tenantError) throw tenantError;

      // Associar usuário como admin do novo tenant
      const { error: userTenantError } = await supabase
        .from('users_tenant')
        .insert([
          {
            user_id: user.id,
            tenant_id: newTenant.id,
            role: 'admin'
          }
        ]);

      if (userTenantError) throw userTenantError;

      toast({
        title: "Sucesso!",
        description: "Novo estabelecimento criado com sucesso.",
      });

      // Track CompleteRegistration
      trackEvent('CompleteRegistration', {
        content_name: 'Cadastro modoGESTOR',
        status: 'complete',
        value: 30.00,
        currency: 'BRL',
      }, {
        email: values.email || undefined,
        external_id: newTenant.id,
      });

      // Save Meta cookies to tenant
      const fbp = getFbp();
      const fbc = getPersistedFbc();
      if (fbp || fbc) {
        await supabase.from('tenants').update({
          meta_fbp: fbp,
          meta_fbc: fbc,
        } as any).eq('id', newTenant.id);
      }

      form.reset();
      onOpenChange(false);
      
      // Recarregar a página para atualizar os tenants
      window.location.reload();
    } catch (error) {
      console.error('Error creating tenant:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar novo estabelecimento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Estabelecimento</DialogTitle>
          <DialogDescription>
            Crie um novo estabelecimento para gerenciar separadamente.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Estabelecimento *</FormLabel>
                  <FormControl>
                    <Input placeholder="Meu Estabelecimento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="slug"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Slug (URL) *</FormLabel>
                  <FormControl>
                    <Input placeholder="meu-estabelecimento" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone</FormLabel>
                  <FormControl>
                    <Input placeholder="(11) 99999-9999" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="contato@empresa.com" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Endereço</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Rua das Flores, 123 - Centro"
                      className="resize-none"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando..." : "Criar Estabelecimento"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}