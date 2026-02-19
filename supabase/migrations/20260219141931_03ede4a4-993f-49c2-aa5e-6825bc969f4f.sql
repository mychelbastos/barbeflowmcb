
-- Junction table linking subscription plans to allowed staff members
CREATE TABLE public.subscription_plan_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id uuid NOT NULL REFERENCES public.subscription_plans(id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(plan_id, staff_id)
);

-- Enable RLS
ALTER TABLE public.subscription_plan_staff ENABLE ROW LEVEL SECURITY;

-- Public can read (needed for booking flow)
CREATE POLICY "Public read subscription_plan_staff"
ON public.subscription_plan_staff
FOR SELECT
USING (true);

-- Tenant admins can manage
CREATE POLICY "Tenant scope subscription_plan_staff"
ON public.subscription_plan_staff
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM subscription_plans sp
    WHERE sp.id = subscription_plan_staff.plan_id
    AND user_belongs_to_tenant(sp.tenant_id)
  )
);
