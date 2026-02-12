
-- Add public visibility flag to service_packages
ALTER TABLE public.service_packages
ADD COLUMN public boolean NOT NULL DEFAULT true;

-- Add public visibility flag to subscription_plans
ALTER TABLE public.subscription_plans
ADD COLUMN public boolean NOT NULL DEFAULT true;
