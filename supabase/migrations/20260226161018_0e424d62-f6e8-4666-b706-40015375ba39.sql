-- Update reopen_comanda to also reverse debit entries created by close_comanda
CREATE OR REPLACE FUNCTION public.reopen_comanda(p_booking_id uuid, p_tenant_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_comanda_status text;
  v_deleted_count integer;
  v_debits_deleted integer;
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

  -- 3. Delete debit entries created by close_comanda (only 'Consumo comanda' without receipt)
  DELETE FROM customer_balance_entries
  WHERE booking_id = p_booking_id 
    AND tenant_id = p_tenant_id
    AND type = 'debit'
    AND description = 'Consumo comanda';
  GET DIAGNOSTICS v_debits_deleted = ROW_COUNT;

  -- 4. Reopen comanda
  UPDATE bookings
  SET comanda_status = 'open', updated_at = now()
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'commissions_deleted', v_deleted_count,
    'debits_reversed', v_debits_deleted
  );
END;
$function$;