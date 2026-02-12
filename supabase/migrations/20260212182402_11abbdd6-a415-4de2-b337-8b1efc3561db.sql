-- Add photo_url to service_packages
ALTER TABLE public.service_packages ADD COLUMN IF NOT EXISTS photo_url text;

-- Add photo_url to subscription_plans
ALTER TABLE public.subscription_plans ADD COLUMN IF NOT EXISTS photo_url text;