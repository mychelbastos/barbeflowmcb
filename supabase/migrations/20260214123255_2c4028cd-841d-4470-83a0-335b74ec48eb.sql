
-- 1. Add risk policy columns to customers
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS cancellation_streak integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS forced_online_payment boolean NOT NULL DEFAULT false;

-- 2. Create function to handle risk policy on booking status change
CREATE OR REPLACE FUNCTION public.handle_booking_risk_policy()
RETURNS TRIGGER AS $$
DECLARE
  v_max_cancellations integer;
  v_enabled boolean;
  v_streak integer;
  v_tenant_settings jsonb;
BEGIN
  -- Only act on status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Get tenant settings
  SELECT settings INTO v_tenant_settings
  FROM tenants WHERE id = NEW.tenant_id;

  v_enabled := COALESCE((v_tenant_settings->>'enable_risk_policy')::boolean, true);
  v_max_cancellations := COALESCE((v_tenant_settings->>'max_consecutive_cancellations')::integer, 2);

  IF NOT v_enabled THEN
    RETURN NEW;
  END IF;

  -- On cancellation: increment streak
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE customers
    SET cancellation_streak = cancellation_streak + 1,
        forced_online_payment = CASE
          WHEN cancellation_streak + 1 >= v_max_cancellations THEN true
          ELSE forced_online_payment
        END
    WHERE id = NEW.customer_id;

  -- On completion: reset streak and remove forced payment
  ELSIF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE customers
    SET cancellation_streak = 0,
        forced_online_payment = false
    WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Create trigger
DROP TRIGGER IF EXISTS trg_booking_risk_policy ON public.bookings;
CREATE TRIGGER trg_booking_risk_policy
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_booking_risk_policy();
