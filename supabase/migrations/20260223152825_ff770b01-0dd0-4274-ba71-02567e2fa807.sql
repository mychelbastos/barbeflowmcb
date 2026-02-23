
-- Table: service_order_bumps
CREATE TABLE public.service_order_bumps (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(service_id, product_id)
);

-- RLS
ALTER TABLE public.service_order_bumps ENABLE ROW LEVEL SECURITY;

-- Admin can manage
CREATE POLICY "Tenant scope service_order_bumps"
  ON public.service_order_bumps
  FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

-- Public can read active bumps (for public booking page)
CREATE POLICY "Public read active service_order_bumps"
  ON public.service_order_bumps
  FOR SELECT
  USING (active = true);
