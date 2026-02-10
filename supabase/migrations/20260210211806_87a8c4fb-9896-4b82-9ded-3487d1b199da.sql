
-- ============================================
-- FASE 2: customer_balance_entries
-- ============================================
CREATE TABLE public.customer_balance_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  type text NOT NULL CHECK (type IN ('credit', 'debit')),
  amount_cents integer NOT NULL,
  description text,
  staff_id uuid REFERENCES public.staff(id),
  booking_id uuid REFERENCES public.bookings(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_balance_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope customer_balance_entries"
  ON public.customer_balance_entries FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE INDEX idx_customer_balance_entries_customer ON public.customer_balance_entries(customer_id);
CREATE INDEX idx_customer_balance_entries_tenant ON public.customer_balance_entries(tenant_id);

-- ============================================
-- FASE 3: service_packages + customer_packages
-- ============================================
CREATE TABLE public.service_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  name text NOT NULL,
  service_id uuid NOT NULL REFERENCES public.services(id),
  total_sessions integer NOT NULL,
  price_cents integer NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope service_packages"
  ON public.service_packages FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE TABLE public.customer_packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  package_id uuid NOT NULL REFERENCES public.service_packages(id),
  sessions_used integer NOT NULL DEFAULT 0,
  sessions_total integer NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope customer_packages"
  ON public.customer_packages FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE INDEX idx_customer_packages_customer ON public.customer_packages(customer_id);
CREATE INDEX idx_customer_packages_status ON public.customer_packages(status);

-- ============================================
-- FASE 4: staff_payments
-- ============================================
CREATE TABLE public.staff_payments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  staff_id uuid NOT NULL REFERENCES public.staff(id),
  type text NOT NULL CHECK (type IN ('commission', 'advance', 'bonus', 'deduction')),
  amount_cents integer NOT NULL,
  reference_period_start date,
  reference_period_end date,
  notes text,
  paid_at timestamptz,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope staff_payments"
  ON public.staff_payments FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE INDEX idx_staff_payments_staff ON public.staff_payments(staff_id);
CREATE INDEX idx_staff_payments_status ON public.staff_payments(status);

-- ============================================
-- FASE 5: Alterações para comissões
-- ============================================
ALTER TABLE public.product_sales ADD COLUMN staff_id uuid REFERENCES public.staff(id);
ALTER TABLE public.staff ADD COLUMN default_commission_percent numeric DEFAULT 0;

-- ============================================
-- FASE 7: plans + subscriptions
-- ============================================
CREATE TABLE public.plans (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price_cents integer NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'yearly')),
  features jsonb DEFAULT '[]'::jsonb,
  max_staff integer,
  max_bookings_month integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read plans"
  ON public.plans FOR SELECT
  USING (active = true);

CREATE POLICY "Super admin manage plans"
  ON public.plans FOR ALL
  USING (true);

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  status text NOT NULL DEFAULT 'trial' CHECK (status IN ('active', 'past_due', 'cancelled', 'trial')),
  current_period_start timestamptz NOT NULL DEFAULT now(),
  current_period_end timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  trial_ends_at timestamptz DEFAULT (now() + interval '14 days'),
  cancelled_at timestamptz,
  external_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope subscriptions"
  ON public.subscriptions FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE INDEX idx_subscriptions_tenant ON public.subscriptions(tenant_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- Triggers for updated_at
CREATE TRIGGER update_service_packages_updated_at
  BEFORE UPDATE ON public.service_packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
