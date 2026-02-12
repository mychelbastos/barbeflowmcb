
-- Fix: add 'expired' to the allowed statuses in bookings_status_check
ALTER TABLE public.bookings DROP CONSTRAINT bookings_status_check;
ALTER TABLE public.bookings ADD CONSTRAINT bookings_status_check 
  CHECK (status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'cancelled'::text, 'completed'::text, 'no_show'::text, 'pending_payment'::text, 'expired'::text]));
