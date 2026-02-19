
CREATE TABLE IF NOT EXISTS public.platform_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  payment_id UUID REFERENCES public.payments(id),
  mp_payment_id TEXT,
  transaction_amount_cents INTEGER NOT NULL,
  commission_rate NUMERIC(5,4) NOT NULL,
  fee_amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_platform_fees_tenant ON public.platform_fees(tenant_id);
CREATE INDEX idx_platform_fees_created ON public.platform_fees(created_at);

ALTER TABLE public.platform_fees ENABLE ROW LEVEL SECURITY;

-- Only service role can access (edge functions use service_role key)
CREATE POLICY "Service role only platform_fees"
  ON public.platform_fees
  FOR ALL
  USING (false);
