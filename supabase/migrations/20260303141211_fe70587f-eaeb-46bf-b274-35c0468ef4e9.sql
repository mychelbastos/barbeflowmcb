
CREATE OR REPLACE FUNCTION public.merge_customers(
  p_tenant_id uuid,
  p_keep_id uuid,
  p_remove_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_keep record;
  v_remove record;
  v_bookings_moved integer := 0;
  v_items_moved integer := 0;
  v_balance_moved integer := 0;
  v_packages_moved integer := 0;
  v_subs_moved integer := 0;
  v_recurring_moved integer := 0;
BEGIN
  -- Validate both customers belong to tenant
  SELECT * INTO v_keep FROM customers WHERE id = p_keep_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'KEEP_CUSTOMER_NOT_FOUND');
  END IF;

  SELECT * INTO v_remove FROM customers WHERE id = p_remove_id AND tenant_id = p_tenant_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'REMOVE_CUSTOMER_NOT_FOUND');
  END IF;

  IF p_keep_id = p_remove_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'SAME_CUSTOMER');
  END IF;

  -- Enrich keep customer with data from remove customer
  UPDATE customers SET
    email = COALESCE(NULLIF(v_keep.email, ''), v_remove.email),
    birthday = COALESCE(v_keep.birthday, v_remove.birthday),
    gender = COALESCE(v_keep.gender, v_remove.gender),
    cpf = COALESCE(v_keep.cpf, v_remove.cpf),
    notes = CASE 
      WHEN v_keep.notes IS NOT NULL AND v_remove.notes IS NOT NULL 
      THEN v_keep.notes || E'\n' || v_remove.notes
      ELSE COALESCE(v_keep.notes, v_remove.notes)
    END,
    address_cep = COALESCE(v_keep.address_cep, v_remove.address_cep),
    address_street = COALESCE(v_keep.address_street, v_remove.address_street),
    address_number = COALESCE(v_keep.address_number, v_remove.address_number),
    address_complement = COALESCE(v_keep.address_complement, v_remove.address_complement),
    address_neighborhood = COALESCE(v_keep.address_neighborhood, v_remove.address_neighborhood),
    address_city = COALESCE(v_keep.address_city, v_remove.address_city),
    address_state = COALESCE(v_keep.address_state, v_remove.address_state),
    updated_at = now()
  WHERE id = p_keep_id;

  -- Move bookings
  UPDATE bookings SET customer_id = p_keep_id WHERE customer_id = p_remove_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_bookings_moved = ROW_COUNT;

  -- Move customer_balance_entries
  UPDATE customer_balance_entries SET customer_id = p_keep_id WHERE customer_id = p_remove_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_balance_moved = ROW_COUNT;

  -- Move customer_packages
  UPDATE customer_packages SET customer_id = p_keep_id WHERE customer_id = p_remove_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_packages_moved = ROW_COUNT;

  -- Move customer_subscriptions
  UPDATE customer_subscriptions SET customer_id = p_keep_id WHERE customer_id = p_remove_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_subs_moved = ROW_COUNT;

  -- Move recurring_clients
  UPDATE recurring_clients SET customer_id = p_keep_id WHERE customer_id = p_remove_id AND tenant_id = p_tenant_id;
  GET DIAGNOSTICS v_recurring_moved = ROW_COUNT;

  -- Delete the duplicate customer
  DELETE FROM customers WHERE id = p_remove_id AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'bookings_moved', v_bookings_moved,
    'balance_entries_moved', v_balance_moved,
    'packages_moved', v_packages_moved,
    'subscriptions_moved', v_subs_moved,
    'recurring_moved', v_recurring_moved
  );
END;
$$;
