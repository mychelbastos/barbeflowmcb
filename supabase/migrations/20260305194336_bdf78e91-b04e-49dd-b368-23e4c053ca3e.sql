-- Trigger to reset reminder_sent and clear dedup when booking time changes
CREATE OR REPLACE FUNCTION public.reset_reminder_on_time_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.starts_at IS DISTINCT FROM NEW.starts_at THEN
    NEW.reminder_sent := false;
    DELETE FROM notification_log
    WHERE dedup_key IN (
      'reminder_24h_' || NEW.id::text,
      'reminder_1h_' || NEW.id::text
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_reminder_on_time_change ON bookings;
CREATE TRIGGER trg_reset_reminder_on_time_change
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.reset_reminder_on_time_change();