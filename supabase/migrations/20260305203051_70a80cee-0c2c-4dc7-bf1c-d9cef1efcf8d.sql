ALTER TABLE public.stripe_subscriptions 
  ADD COLUMN IF NOT EXISTS discount_name text,
  ADD COLUMN IF NOT EXISTS discount_percent_off numeric,
  ADD COLUMN IF NOT EXISTS discount_amount_off integer;