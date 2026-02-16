
-- =============================================================
-- FASE 4 CORREÇÕES: source granular + constraint atualizada
-- =============================================================

-- 1) Update source constraint to support granular booking sources
ALTER TABLE public.cash_entries DROP CONSTRAINT IF EXISTS cash_entries_source_check;
ALTER TABLE public.cash_entries ADD CONSTRAINT cash_entries_source_check
  CHECK (source IN (
    'booking', 'booking_service', 'booking_product',
    'manual', 'payout', 'fee', 'supply', 'withdrawal', 'expense',
    'online', 'subscription', 'package', 'package_sale'
  ));

-- 2) Update RPC to use granular sources per booking_item type
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
  -- For per-item cash entries
  v_item_source text;
  v_item_staff uuid;
  v_pay_idx integer := 0;
  v_payments_arr jsonb[];
  v_pay_remaining integer;
  v_pay_method text;
  v_pay_amount integer;
  v_alloc integer;
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
  -- 6. Create cash_entries PER ITEM with correct source
  --    Distribute payment across unpaid items (FIFO)
  -- =====================================================
  -- Build payments array for allocation
  SELECT array_agg(elem) INTO v_payments_arr
  FROM jsonb_array_elements(p_payments) AS elem
  WHERE (elem->>'amount_cents')::integer > 0;

  v_pay_idx := 1;
  IF v_payments_arr IS NOT NULL THEN
    v_pay_remaining := (v_payments_arr[v_pay_idx]->>'amount_cents')::integer;
    v_pay_method := v_payments_arr[v_pay_idx]->>'method';
  ELSE
    v_pay_remaining := 0;
    v_pay_method := 'cash';
  END IF;

  FOR v_unpaid_item IN
    SELECT id, total_price_cents, type AS item_type, staff_id AS item_staff_id
    FROM booking_items
    WHERE booking_id = p_booking_id
      AND tenant_id = p_tenant_id
      AND paid_status = 'unpaid'
    ORDER BY created_at ASC
  LOOP
    -- Determine source based on item type
    IF v_unpaid_item.item_type = 'service' THEN
      v_item_source := 'booking_service';
    ELSIF v_unpaid_item.item_type = 'product' THEN
      v_item_source := 'booking_product';
    ELSE
      v_item_source := 'booking_service'; -- fallback
    END IF;

    v_item_staff := COALESCE(v_unpaid_item.item_staff_id, p_staff_id);
    v_remaining := v_unpaid_item.total_price_cents;

    -- Allocate from current and subsequent payment methods
    WHILE v_remaining > 0 AND v_pay_idx <= coalesce(array_length(v_payments_arr, 1), 0)
    LOOP
      v_alloc := LEAST(v_remaining, v_pay_remaining);

      IF v_alloc > 0 THEN
        INSERT INTO cash_entries (
          tenant_id, session_id, amount_cents, kind, source,
          payment_method, booking_id, notes, occurred_at, staff_id
        ) VALUES (
          p_tenant_id, p_cash_session_id, v_alloc,
          'income', v_item_source,
          v_pay_method, p_booking_id,
          'Pagamento local comanda ' || p_booking_id::text,
          now(), v_item_staff
        );
      END IF;

      v_remaining := v_remaining - v_alloc;
      v_pay_remaining := v_pay_remaining - v_alloc;

      -- Move to next payment method if exhausted
      IF v_pay_remaining <= 0 THEN
        v_pay_idx := v_pay_idx + 1;
        IF v_pay_idx <= coalesce(array_length(v_payments_arr, 1), 0) THEN
          v_pay_remaining := (v_payments_arr[v_pay_idx]->>'amount_cents')::integer;
          v_pay_method := v_payments_arr[v_pay_idx]->>'method';
        END IF;
      END IF;
    END LOOP;

    -- Mark item as paid
    IF v_total_received >= v_unpaid_item.total_price_cents OR v_remaining <= 0 THEN
      UPDATE booking_items
      SET paid_status = 'paid_local',
          paid_at = now(),
          receipt_id = p_receipt_id
      WHERE id = v_unpaid_item.id;
    END IF;
  END LOOP;

  -- Any leftover payment (overpayment / change) stays as unallocated cash
  -- It will be handled in the change section below

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
  -- 9. Handle change (troco)
  -- =====================================================
  v_change := GREATEST(0, v_balance);

  IF v_change > 0 AND NOT p_keep_change_as_credit THEN
    INSERT INTO cash_entries (
      tenant_id, session_id, amount_cents, kind, source,
      payment_method, booking_id, notes, occurred_at, staff_id
    ) VALUES (
      p_tenant_id, p_cash_session_id, v_change,
      'expense', 'booking_service',
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
