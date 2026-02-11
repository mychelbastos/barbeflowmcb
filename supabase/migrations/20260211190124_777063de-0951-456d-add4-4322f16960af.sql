
-- =============================================
-- FASE 1: Sistema de Assinaturas Recorrentes
-- 5 tabelas + RLS + triggers + índices
-- =============================================

-- 1. subscription_plans (planos criados pela barbearia)
CREATE TABLE public.subscription_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price_cents integer NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly',
  sessions_limit integer,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_plans_tenant ON public.subscription_plans(tenant_id);

ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read active subscription_plans"
  ON public.subscription_plans FOR SELECT
  USING (active = true);

CREATE POLICY "Tenant scope subscription_plans"
  ON public.subscription_plans FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE TRIGGER update_subscription_plans_updated_at
  BEFORE UPDATE ON public.subscription_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. subscription_plan_services (serviços inclusos no plano)
CREATE TABLE public.subscription_plan_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  sessions_per_cycle integer,
  UNIQUE(plan_id, service_id)
);

CREATE INDEX idx_sps_plan ON public.subscription_plan_services(plan_id);

ALTER TABLE public.subscription_plan_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subscription_plan_services"
  ON public.subscription_plan_services FOR SELECT
  USING (true);

CREATE POLICY "Tenant scope subscription_plan_services"
  ON public.subscription_plan_services FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.subscription_plans sp
    WHERE sp.id = subscription_plan_services.plan_id
    AND user_belongs_to_tenant(sp.tenant_id)
  ));

-- 3. customer_subscriptions (assinatura ativa do cliente)
CREATE TABLE public.customer_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id),
  status text NOT NULL DEFAULT 'pending',
  mp_preapproval_id text,
  mp_payer_id text,
  checkout_url text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  next_payment_date timestamptz,
  started_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_cs_tenant ON public.customer_subscriptions(tenant_id);
CREATE INDEX idx_cs_customer ON public.customer_subscriptions(customer_id);
CREATE INDEX idx_cs_status ON public.customer_subscriptions(status);
CREATE INDEX idx_cs_mp_preapproval ON public.customer_subscriptions(mp_preapproval_id);

ALTER TABLE public.customer_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read customer_subscriptions"
  ON public.customer_subscriptions FOR SELECT
  USING (true);

CREATE POLICY "Tenant scope customer_subscriptions"
  ON public.customer_subscriptions FOR ALL
  USING (user_belongs_to_tenant(tenant_id));

CREATE POLICY "Public insert customer_subscriptions"
  ON public.customer_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE TRIGGER update_customer_subscriptions_updated_at
  BEFORE UPDATE ON public.customer_subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. subscription_usage (controle de uso por ciclo)
CREATE TABLE public.subscription_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES public.services(id),
  period_start date NOT NULL,
  period_end date NOT NULL,
  sessions_used integer NOT NULL DEFAULT 0,
  sessions_limit integer,
  booking_ids uuid[] DEFAULT '{}',
  UNIQUE(subscription_id, service_id, period_start)
);

CREATE INDEX idx_su_subscription ON public.subscription_usage(subscription_id);
CREATE INDEX idx_su_period ON public.subscription_usage(period_start, period_end);

ALTER TABLE public.subscription_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read subscription_usage"
  ON public.subscription_usage FOR SELECT
  USING (true);

CREATE POLICY "Tenant scope subscription_usage"
  ON public.subscription_usage FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.customer_subscriptions cs
    WHERE cs.id = subscription_usage.subscription_id
    AND user_belongs_to_tenant(cs.tenant_id)
  ));

-- 5. subscription_payments (histórico de cobranças)
CREATE TABLE public.subscription_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES public.customer_subscriptions(id) ON DELETE CASCADE,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mp_payment_id text,
  period_start date,
  period_end date,
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sp_subscription ON public.subscription_payments(subscription_id);

ALTER TABLE public.subscription_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope subscription_payments"
  ON public.subscription_payments FOR ALL
  USING (user_belongs_to_tenant(tenant_id));
