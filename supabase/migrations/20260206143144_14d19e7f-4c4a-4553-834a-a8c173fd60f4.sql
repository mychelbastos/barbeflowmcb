
-- Remove existing CHECK constraint on created_via (if any)
ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS bookings_created_via_check;

-- Add updated CHECK constraint allowing 'whatsapp'
ALTER TABLE public.bookings ADD CONSTRAINT bookings_created_via_check 
  CHECK (created_via IN ('public', 'admin', 'whatsapp'));
