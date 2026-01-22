-- Add column to track if reminder was sent
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS reminder_sent BOOLEAN DEFAULT FALSE;

-- Add index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_bookings_reminder_lookup ON public.bookings (status, starts_at, reminder_sent) WHERE status = 'confirmed' AND reminder_sent = FALSE;