
-- Add product commission percent and owner flag to staff
ALTER TABLE public.staff 
  ADD COLUMN IF NOT EXISTS product_commission_percent numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_owner boolean DEFAULT false;
