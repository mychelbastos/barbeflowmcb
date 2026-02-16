
-- =============================================================
-- FASE 2: Backend — RPC adaptada + anti-duplicação + session_id
-- =============================================================

-- 1) Add 'subscription' to cash_entries source check if not already there
-- Drop and recreate the constraint to include 'subscription'
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_source_check;
ALTER TABLE public.cash_entries ADD CONSTRAINT cash_entries_source_check
  CHECK (source IN ('booking', 'manual', 'payout', 'fee', 'supply', 'withdrawal', 'expense', 'online', 'subscription', 'package'));

-- 2) Add unique constraint for anti-duplication of online cash entries
CREATE UNIQUE INDEX IF NOT EXISTS idx_cash_entries_payment_id_unique
  ON public.cash_entries (payment_id) WHERE payment_id IS NOT NULL;

-- 3) Replace RPC: record_local_payment_for_booking
-- Now operates on booking_items, marks paid_status per item, supports partial payment
CREATE OR REPLACE FUNCTION public.record_local_payment_for_booking(
  p_booking_id uuid,
  p_tenant_id uuid,
  p_customer_id uuid,
  p_receipt_id uuid,
  p_payments jsonb,
  p_keep_change_as_credit boolean DEFAULT false,
  p_cash_session_id uuid DEFAULT NULL,
  p_staff_id uuid DEFAULT NULL,
  p_extra_items jsonb DEFAULT '[]'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total_received integer := 0;
  v_total_unpaid integer := 0;
  v_balance integer;
  v_change integer;
  v_payment jsonb;
  v_item jsonb;
  v_existing_count integer;
  v_unpaid_item record;
  v_remaining integer;
  v_to_apply integer;
BEGIN
  -- =====================================================
  -- 1. IDEMPOTENCY: reject duplicate receipt
  -- =====================================================
  SELECT COUNT(*) INTO v_existing_count
  FROM customer_balance_entries
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND type = 'credit'
    AND description LIKE '%receipt:' || p_receipt_id::text || '%';

  IF v_existing_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'DUPLICATE_PAYMENT');
  END IF;

  -- =====================================================
  -- 2. INSERT EXTRA ITEMS into booking_items
  -- =====================================================
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_extra_items)
  LOOP
    INSERT INTO booking_items (
      tenant_id, booking_id, type, ref_id, title, quantity,
      unit_price_cents, purchase_price_cents, staff_id, paid_status
    ) VALUES (
      p_tenant_id, p_booking_id,
      COALESCE(v_item->>'type', 'product'),
      (v_item->>'id')::uuid,
      COALESCE(v_item->>'name', 'Item extra'),
      COALESCE((v_item->>'quantity')::integer, 1),
      COALESCE((v_item->>'price_cents')::integer, 0),
      COALESCE((v_item->>'purchase_price_cents')::integer, 0),
      COALESCE((v_item->>'staff_id')::uuid, p_staff_id),
      'unpaid'
    );

    -- If product, create product_sales entry
    IF (v_item->>'type') = 'product' THEN
      INSERT INTO product_sales (
        tenant_id, product_id, quantity,
        sale_price_snapshot_cents, purchase_price_snapshot_cents,
        staff_id, notes
      ) VALUES (
        p_tenant_id, (v_item->>'id')::uuid,
        COALESCE((v_item->>'quantity')::integer, 1),
        COALESCE((v_item->>'price_cents')::integer, 0),
        COALESCE((v_item->>'purchase_price_cents')::integer, 0),
        COALESCE((v_item->>'staff_id')::uuid, p_staff_id),
        'Venda via comanda booking ' || p_booking_id::text
      );
    END IF;
  END LOOP;

  -- =====================================================
  -- 3. Calculate total UNPAID from booking_items
  -- =====================================================
  SELECT COALESCE(SUM(total_price_cents), 0) INTO v_total_unpaid
  FROM booking_items
  WHERE booking_id = p_booking_id
    AND tenant_id = p_tenant_id
    AND paid_status = 'unpaid';

  -- =====================================================
  -- 4. Current customer balance (positive = credit)
  -- =====================================================
  SELECT COALESCE(SUM(
    CASE WHEN type = 'credit' THEN amount_cents ELSE -amount_cents END
  ), 0) INTO v_balance
  FROM customer_balance_entries
  WHERE customer_id = p_customer_id AND tenant_id = p_tenant_id;

  -- =====================================================
  -- 5. Calculate total received from payment forms
  -- =====================================================
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    v_total_received := v_total_received + (v_payment->>'amount_cents')::integer;
  END LOOP;

  -- =====================================================
  -- 6. Create cash_entries per payment method (REAL money in)
  -- =====================================================
  FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
  LOOP
    IF (v_payment->>'amount_cents')::integer > 0 THEN
      INSERT INTO cash_entries (
        tenant_id, session_id, amount_cents, kind, source,
        payment_method, booking_id, notes, occurred_at, staff_id
      ) VALUES (
        p_tenant_id, p_cash_session_id,
        (v_payment->>'amount_cents')::integer,
        'income', 'booking',
        v_payment->>'method', p_booking_id,
        'Pagamento local comanda ' || p_booking_id::text,
        now(), p_staff_id
      );
    END IF;
  END LOOP;

  -- =====================================================
  -- 7. Register DEBIT for unpaid items (service consumption)
  -- =====================================================
  IF v_total_unpaid > 0 THEN
    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'debit', v_total_unpaid,
      'Consumo comanda', p_booking_id, p_staff_id
    );
    v_balance := v_balance - v_total_unpaid;
  END IF;

  -- =====================================================
  -- 8. Register CREDIT for payment received
  -- =====================================================
  IF v_total_received > 0 THEN
    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'credit', v_total_received,
      'Pagamento local (receipt:' || p_receipt_id::text || ')',
      p_booking_id, p_staff_id
    );
    v_balance := v_balance + v_total_received;
  END IF;

  -- =====================================================
  -- 9. Mark booking_items as paid_local (FIFO by creation)
  -- =====================================================
  v_remaining := v_total_received;
  -- Also apply existing credit if positive
  IF v_balance > 0 AND v_remaining < v_total_unpaid THEN
    -- Customer had existing credit that helps cover
    v_remaining := v_remaining; -- credit is already factored via balance
  END IF;

  FOR v_unpaid_item IN
    SELECT id, total_price_cents
    FROM booking_items
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND paid_status = 'unpaid'
    ORDER BY created_at ASC
  LOOP
    IF v_remaining >= v_unpaid_item.total_price_cents THEN
      UPDATE booking_items
      SET paid_status = 'paid_local',
          paid_at = now(),
          receipt_id = p_receipt_id
      WHERE id = v_unpaid_item.id;
      v_remaining := v_remaining - v_unpaid_item.total_price_cents;
    ELSIF v_remaining > 0 THEN
      -- Partial: mark as paid anyway (remainder tracked as debt in balance)
      UPDATE booking_items
      SET paid_status = 'paid_local',
          paid_at = now(),
          receipt_id = p_receipt_id
      WHERE id = v_unpaid_item.id;
      v_remaining := 0;
    END IF;
  END LOOP;

  -- =====================================================
  -- 10. Handle change (troco)
  -- =====================================================
  v_change := GREATEST(0, v_balance);

  IF v_change > 0 AND NOT p_keep_change_as_credit THEN
    -- Return change as cash out
    INSERT INTO cash_entries (
      tenant_id, session_id, amount_cents, kind, source,
      payment_method, booking_id, notes, occurred_at, staff_id
    ) VALUES (
      p_tenant_id, p_cash_session_id, v_change,
      'expense', 'booking',
      'cash', p_booking_id,
      'Troco comanda ' || p_booking_id::text,
      now(), p_staff_id
    );

    INSERT INTO customer_balance_entries (
      tenant_id, customer_id, type, amount_cents,
      description, booking_id, staff_id
    ) VALUES (
      p_tenant_id, p_customer_id, 'debit', v_change,
      'Troco devolvido (receipt:' || p_receipt_id::text || ')',
      p_booking_id, p_staff_id
    );
    v_balance := v_balance - v_change;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'total_unpaid', v_total_unpaid,
    'total_received', v_total_received,
    'change', v_change,
    'kept_as_credit', p_keep_change_as_credit AND v_change > 0,
    'new_balance', v_balance
  );
END;
$function$;

-- 4) Add receipt_id column to booking_items for tracking which payment covered the item
ALTER TABLE public.booking_items ADD COLUMN IF NOT EXISTS receipt_id uuid;
