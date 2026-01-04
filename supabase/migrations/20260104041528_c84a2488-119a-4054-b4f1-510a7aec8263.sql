-- Create whatsapp_connections table for Evolution API integration
CREATE TABLE public.whatsapp_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,
  evolution_instance_name text NOT NULL UNIQUE,
  whatsapp_connected boolean NOT NULL DEFAULT false,
  whatsapp_number text,
  connected_at timestamp with time zone,
  last_status text DEFAULT 'disconnected',
  last_status_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;

-- Tenant members can view their WhatsApp connection
CREATE POLICY "Tenant members can view WhatsApp connection"
ON public.whatsapp_connections
FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

-- Only tenant admins can manage WhatsApp connection
CREATE POLICY "Tenant admins can manage WhatsApp connection"
ON public.whatsapp_connections
FOR ALL
USING (is_tenant_admin(tenant_id));

-- Create trigger for updated_at
CREATE TRIGGER update_whatsapp_connections_updated_at
BEFORE UPDATE ON public.whatsapp_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for faster lookups
CREATE INDEX idx_whatsapp_connections_tenant ON public.whatsapp_connections(tenant_id);
CREATE INDEX idx_whatsapp_connections_instance ON public.whatsapp_connections(evolution_instance_name);