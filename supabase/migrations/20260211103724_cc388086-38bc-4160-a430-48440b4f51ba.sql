
-- Table to store multiple services per package
CREATE TABLE public.package_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id UUID NOT NULL REFERENCES public.service_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sessions_count INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(package_id, service_id)
);

ALTER TABLE public.package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view package_services"
  ON public.package_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.service_packages sp
      WHERE sp.id = package_services.package_id
      AND public.user_belongs_to_tenant(sp.tenant_id)
    )
  );

CREATE POLICY "Tenant admins can manage package_services"
  ON public.package_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.service_packages sp
      WHERE sp.id = package_services.package_id
      AND public.is_tenant_admin(sp.tenant_id)
    )
  );

-- Public read access for package_services (needed for booking page)
CREATE POLICY "Public can view package_services"
  ON public.package_services FOR SELECT
  USING (true);

-- Track per-service usage within a customer package
CREATE TABLE public.customer_package_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_package_id UUID NOT NULL REFERENCES public.customer_packages(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sessions_total INT NOT NULL DEFAULT 0,
  sessions_used INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(customer_package_id, service_id)
);

ALTER TABLE public.customer_package_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant members can view customer_package_services"
  ON public.customer_package_services FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_packages cp
      WHERE cp.id = customer_package_services.customer_package_id
      AND public.user_belongs_to_tenant(cp.tenant_id)
    )
  );

CREATE POLICY "Tenant admins can manage customer_package_services"
  ON public.customer_package_services FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.customer_packages cp
      WHERE cp.id = customer_package_services.customer_package_id
      AND public.is_tenant_admin(cp.tenant_id)
    )
  );

-- Public read for customer_package_services (needed for booking flow)
CREATE POLICY "Public can view customer_package_services"
  ON public.customer_package_services FOR SELECT
  USING (true);

-- Add payment_status to customer_packages
ALTER TABLE public.customer_packages ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'pending';
-- Values: pending, confirmed

-- Make service_id nullable on service_packages (now using package_services junction table)
ALTER TABLE public.service_packages ALTER COLUMN service_id DROP NOT NULL;
ALTER TABLE public.service_packages ALTER COLUMN total_sessions SET DEFAULT 0;
