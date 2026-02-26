-- Fix close_comanda_with_commissions to register debit for unpaid items
CREATE OR REPLACE FUNCTION public.close_comanda_with_commissions(
  p_booking_id uuid,
  p_tenant_id uuid,
  p_commission_basis text DEFAULT 'theoretical'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
  v_comanda_status TEXT;
  v_customer_id UUID;
  v_booking_staff_id UUID;
  v_item RECORD;
  v_comm_percent NUMERIC;
  v_base_amount INTEGER;
  v_comm_cents INTEGER;
  v_total_comm INTEGER := 0;
  v_count INTEGER := 0;
  v_inserted BOOLEAN;
  v_total_unpaid INTEGER := 0;
  v_existing_debit INTEGER := 0;
BEGIN
  -- 1. Lock and validate booking
  SELECT status, comanda_status, customer_id, staff_id 
  INTO v_status, v_comanda_status, v_customer_id, v_booking_staff_id
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_comanda_status = 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLOSED');
  END IF;

  -- 2. Loop through booking_items with staff for commissions
  FOR v_item IN
    SELECT
      bi.id AS item_id,
      bi.type AS item_type,
      bi.title,
      bi.total_price_cents,
      bi.paid_status,
      bi.staff_id,
      bi.ref_id,
      s.default_commission_percent,
      s.product_commission_percent
    FROM booking_items bi
    JOIN staff s ON s.id = bi.staff_id
    WHERE bi.booking_id = p_booking_id
      AND bi.tenant_id = p_tenant_id
      AND bi.staff_id IS NOT NULL
      AND (s.is_owner IS NULL OR s.is_owner = false)
  LOOP
    IF p_commission_basis = 'received' THEN
      IF v_item.paid_status NOT IN ('paid_local', 'paid_online') THEN
        CONTINUE;
      END IF;
      v_base_amount := v_item.total_price_cents;
    ELSE
      v_base_amount := v_item.total_price_cents;
    END IF;

    IF v_item.item_type = 'service' THEN
      SELECT COALESCE(ss.commission_percent, v_item.default_commission_percent, 0)
      INTO v_comm_percent
      FROM staff_services ss
      WHERE ss.staff_id = v_item.staff_id AND ss.service_id = v_item.ref_id;

      IF NOT FOUND THEN
        v_comm_percent := COALESCE(v_item.default_commission_percent, 0);
      END IF;
    ELSE
      v_comm_percent := COALESCE(v_item.product_commission_percent, 0);
    END IF;

    IF v_comm_percent < 0 OR v_comm_percent > 100 THEN
      RAISE EXCEPTION 'INVALID_COMMISSION_PERCENT';
    END IF;

    v_comm_cents := ROUND(v_base_amount * v_comm_percent / 100);

    IF v_comm_cents < 0 THEN
      RAISE EXCEPTION 'NEGATIVE_COMMISSION_NOT_ALLOWED';
    END IF;

    INSERT INTO commission_snapshots (
      tenant_id, booking_id, booking_item_id, staff_id,
      item_type, item_title, base_amount_cents,
      commission_percent, commission_cents
    ) VALUES (
      p_tenant_id, p_booking_id, v_item.item_id, v_item.staff_id,
      v_item.item_type, v_item.title, v_base_amount,
      v_comm_percent, v_comm_cents
    )
    ON CONFLICT ON CONSTRAINT uq_commission_snapshots_booking_item DO NOTHING;

    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted THEN
      v_total_comm := v_total_comm + v_comm_cents;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 3. Register debit for unpaid items (idempotent - skip if debit already exists)
  SELECT COALESCE(SUM(total_price_cents), 0) INTO v_total_unpaid
  FROM booking_items
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND paid_status = 'unpaid';

  IF v_total_unpaid > 0 THEN
    SELECT COUNT(*) INTO v_existing_debit
    FROM customer_balance_entries
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND type = 'debit'
      AND description = 'Consumo comanda';

    IF v_existing_debit = 0 THEN
      INSERT INTO customer_balance_entries (
        tenant_id, customer_id, type, amount_cents,
        description, booking_id, staff_id
      ) VALUES (
        p_tenant_id, v_customer_id, 'debit', v_total_unpaid,
        'Consumo comanda', p_booking_id, v_booking_staff_id
      );
    END IF;
  END IF;

  -- 4. Close comanda
  UPDATE bookings
  SET comanda_status = 'closed', updated_at = now()
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'snapshots_created', v_count,
    'total_commission_cents', v_total_comm,
    'debt_registered_cents', v_total_unpaid
  );
END;
$function$;