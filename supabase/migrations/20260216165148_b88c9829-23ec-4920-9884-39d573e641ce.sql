
-- 1) CHECK constraints on staff percentages
ALTER TABLE public.staff
  ADD CONSTRAINT chk_staff_default_commission CHECK (default_commission_percent IS NULL OR (default_commission_percent >= 0 AND default_commission_percent <= 100)),
  ADD CONSTRAINT chk_staff_product_commission CHECK (product_commission_percent IS NULL OR (product_commission_percent >= 0 AND product_commission_percent <= 100));

ALTER TABLE public.staff_services
  ADD CONSTRAINT chk_staff_services_commission CHECK (commission_percent IS NULL OR (commission_percent >= 0 AND commission_percent <= 100));

-- CHECK constraints on commission_snapshots
ALTER TABLE public.commission_snapshots
  ADD CONSTRAINT chk_snapshots_commission_cents CHECK (commission_cents >= 0),
  ADD CONSTRAINT chk_snapshots_base_amount CHECK (base_amount_cents >= 0),
  ADD CONSTRAINT chk_snapshots_commission_percent CHECK (commission_percent >= 0 AND commission_percent <= 100);

-- 2) Convert unique index to named constraint for ON CONFLICT usage
DROP INDEX IF EXISTS idx_commission_snapshots_item_unique;
ALTER TABLE public.commission_snapshots
  ADD CONSTRAINT uq_commission_snapshots_booking_item UNIQUE (booking_item_id);

-- 3) Update RPC with ON CONFLICT DO NOTHING + received filter
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
  v_item RECORD;
  v_comm_percent NUMERIC;
  v_base_amount INTEGER;
  v_comm_cents INTEGER;
  v_total_comm INTEGER := 0;
  v_count INTEGER := 0;
  v_inserted BOOLEAN;
BEGIN
  -- 1. Lock and validate booking
  SELECT status, comanda_status INTO v_status, v_comanda_status
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_comanda_status = 'closed' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CLOSED');
  END IF;

  -- 2. Loop through booking_items with staff
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
    -- Determine base amount based on mode
    IF p_commission_basis = 'received' THEN
      -- ONLY generate snapshot for actually paid items
      IF v_item.paid_status NOT IN ('paid_local', 'paid_online') THEN
        CONTINUE; -- skip unpaid/covered in received mode
      END IF;
      v_base_amount := v_item.total_price_cents;
    ELSE
      -- Theoretical: always use item price
      v_base_amount := v_item.total_price_cents;
    END IF;

    -- Determine commission percent
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

    -- Validate before insert (will also be caught by CHECK but gives clearer error)
    IF v_comm_percent < 0 OR v_comm_percent > 100 THEN
      RAISE EXCEPTION 'INVALID_COMMISSION_PERCENT';
    END IF;

    v_comm_cents := ROUND(v_base_amount * v_comm_percent / 100);

    IF v_comm_cents < 0 THEN
      RAISE EXCEPTION 'NEGATIVE_COMMISSION_NOT_ALLOWED';
    END IF;

    -- Idempotent insert: ON CONFLICT DO NOTHING
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

    -- Check if row was actually inserted
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
    IF v_inserted THEN
      v_total_comm := v_total_comm + v_comm_cents;
      v_count := v_count + 1;
    END IF;
  END LOOP;

  -- 3. Close comanda
  UPDATE bookings
  SET comanda_status = 'closed', updated_at = now()
  WHERE id = p_booking_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'snapshots_created', v_count,
    'total_commission_cents', v_total_comm
  );
END;
$function$;
