
-- =============================================
-- ETAPA 2: CAIXA ERP - Schema
-- =============================================

-- 1) Criar tabela cash_sessions (sessões diárias de caixa)
CREATE TABLE public.cash_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  opened_at timestamp with time zone NOT NULL DEFAULT now(),
  closed_at timestamp with time zone,
  opening_amount_cents integer NOT NULL DEFAULT 0,
  closing_amount_cents integer,
  expected_amount_cents integer,
  difference_cents integer,
  difference_reason text,
  opened_by uuid REFERENCES auth.users(id),
  closed_by uuid REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'open',
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS for cash_sessions
ALTER TABLE public.cash_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope cash_sessions"
  ON public.cash_sessions FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Index for quick lookups
CREATE INDEX idx_cash_sessions_tenant_status ON public.cash_sessions(tenant_id, status);
CREATE INDEX idx_cash_sessions_opened_at ON public.cash_sessions(tenant_id, opened_at DESC);

-- 2) Expandir cash_entries com colunas de rastreabilidade
ALTER TABLE public.cash_entries
  ADD COLUMN IF NOT EXISTS session_id uuid REFERENCES public.cash_sessions(id),
  ADD COLUMN IF NOT EXISTS booking_id uuid REFERENCES public.bookings(id),
  ADD COLUMN IF NOT EXISTS payment_id uuid REFERENCES public.payments(id),
  ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';

-- Indexes for cash_entries lookups
CREATE INDEX IF NOT EXISTS idx_cash_entries_session ON public.cash_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_booking ON public.cash_entries(booking_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_payment ON public.cash_entries(payment_id);
CREATE INDEX IF NOT EXISTS idx_cash_entries_payment_method ON public.cash_entries(tenant_id, payment_method);
