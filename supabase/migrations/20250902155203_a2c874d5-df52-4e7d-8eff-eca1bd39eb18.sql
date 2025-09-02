-- Adicionar comissão opcional por serviço/profissional
ALTER TABLE public.staff_services
  ADD COLUMN IF NOT EXISTS commission_percent numeric CHECK (commission_percent BETWEEN 0 AND 100);

-- Caixa manual (entradas/saídas) — opcional, se quiser Recebido sem gateway
CREATE TABLE IF NOT EXISTS public.cash_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  source text CHECK (source IN ('booking','manual','payout','fee')),
  amount_cents int NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Políticas RLS para cash_entries
ALTER TABLE public.cash_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope cash_entries" 
ON public.cash_entries 
FOR ALL 
USING (user_belongs_to_tenant(tenant_id));

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_cash_entries_tenant ON public.cash_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_when ON public.cash_entries(occurred_at);
CREATE INDEX IF NOT EXISTS idx_services_tenant ON public.services(tenant_id);
CREATE INDEX IF NOT EXISTS idx_staff_tenant ON public.staff(tenant_id);
CREATE INDEX IF NOT EXISTS idx_schedules_tenant ON public.schedules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_blocks_tenant ON public.blocks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tenant ON public.bookings(tenant_id);

-- Trigger para update_updated_at_column na tabela cash_entries
CREATE TRIGGER update_cash_entries_updated_at
  BEFORE UPDATE ON public.cash_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Índice único para slug dos tenants
CREATE UNIQUE INDEX IF NOT EXISTS tenants_slug_uidx ON public.tenants (slug);