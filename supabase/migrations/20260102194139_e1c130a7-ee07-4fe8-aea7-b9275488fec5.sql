-- Criar tabela para conexões OAuth do Mercado Pago (1 por tenant)
CREATE TABLE public.mercadopago_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid UNIQUE NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  mp_user_id text,
  access_token text NOT NULL,
  refresh_token text,
  token_expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.mercadopago_connections ENABLE ROW LEVEL SECURITY;

-- Política: apenas membros do tenant podem visualizar/gerenciar conexão
CREATE POLICY "Tenant members can view their MP connection"
ON public.mercadopago_connections
FOR SELECT
USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant admins can manage MP connection"
ON public.mercadopago_connections
FOR ALL
USING (public.is_tenant_admin(tenant_id));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_mercadopago_connections_updated_at
BEFORE UPDATE ON public.mercadopago_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para busca por tenant
CREATE INDEX idx_mercadopago_connections_tenant_id ON public.mercadopago_connections(tenant_id);