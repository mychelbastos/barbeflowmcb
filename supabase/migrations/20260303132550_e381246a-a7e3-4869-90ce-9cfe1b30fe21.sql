
-- Add 'business_expense' to the source check constraint
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_source_check;
ALTER TABLE public.cash_entries ADD CONSTRAINT cash_entries_source_check CHECK (source IN ('booking', 'manual', 'payout', 'fee', 'supply', 'withdrawal', 'expense', 'booking_service', 'booking_product', 'subscription', 'package_sale', 'business_expense', 'subscription_commission'));
