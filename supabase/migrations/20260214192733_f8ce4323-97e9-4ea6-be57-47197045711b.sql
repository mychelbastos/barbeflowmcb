-- Drop the existing check constraint and recreate with expanded values
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_source_check;

ALTER TABLE public.cash_entries ADD CONSTRAINT cash_entries_source_check 
  CHECK (source IN ('booking', 'manual', 'payout', 'fee', 'supply', 'withdrawal', 'expense'));