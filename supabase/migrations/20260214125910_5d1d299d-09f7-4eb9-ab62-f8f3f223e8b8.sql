
-- Trigger function: auto-create ledger entry when booking is completed
CREATE OR REPLACE FUNCTION public.auto_create_balance_entry_on_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_service_price integer;
  v_description text;
  v_amount integer;
BEGIN
  -- Only fire when status changes TO 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get service price
    SELECT price_cents INTO v_service_price
    FROM services WHERE id = NEW.service_id;

    -- Determine if covered by benefit
    IF NEW.customer_subscription_id IS NOT NULL THEN
      v_amount := 0;
      v_description := 'Coberto por assinatura';
    ELSIF NEW.customer_package_id IS NOT NULL THEN
      v_amount := 0;
      v_description := 'Coberto por pacote';
    ELSE
      v_amount := COALESCE(v_service_price, 0);
      v_description := 'Serviço realizado';
    END IF;

    -- Insert ledger entry (type = 'debit' means customer owes)
    INSERT INTO customer_balance_entries (
      tenant_id,
      customer_id,
      type,
      amount_cents,
      description,
      booking_id,
      staff_id
    ) VALUES (
      NEW.tenant_id,
      NEW.customer_id,
      'debit',
      v_amount,
      v_description,
      NEW.id,
      NEW.staff_id
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop if exists and recreate
DROP TRIGGER IF EXISTS trg_auto_balance_on_complete ON bookings;
CREATE TRIGGER trg_auto_balance_on_complete
  AFTER UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_create_balance_entry_on_complete();
