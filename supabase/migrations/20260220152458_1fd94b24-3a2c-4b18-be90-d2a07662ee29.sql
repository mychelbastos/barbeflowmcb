
-- Feature 5: Add frequency to recurring_clients (weekly, biweekly, monthly)
ALTER TABLE public.recurring_clients 
ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'weekly';

-- Feature 2: Function to reopen a closed comanda (deletes commission snapshots)
CREATE OR REPLACE FUNCTION public.reopen_comanda(p_booking_id uuid, p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda_status text;
  v_deleted_count integer;
BEGIN
  -- 1. Validate booking exists and is closed
  SELECT comanda_status INTO v_comanda_status
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_comanda_status != 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'NOT_CLOSED');
  END IF;

  -- 2. Delete commission snapshots for this booking
  DELETE FROM commission_snapshots
  WHERE booking_id = p_booking_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- 3. Reopen comanda
  UPDATE bookings
  SET comanda_status = 'open', updated_at = now()
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'commissions_deleted', v_deleted_count
  );
END;
$function$;
