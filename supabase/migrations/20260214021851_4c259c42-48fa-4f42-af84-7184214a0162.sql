
-- 1. Add session_outcome column to bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS session_outcome text;

-- Add check constraint for valid values
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_session_outcome_check 
CHECK (session_outcome IS NULL OR session_outcome IN ('consumed', 'refunded', 'forfeited'));

-- 2. Create atomic cancellation function with advisory lock
CREATE OR REPLACE FUNCTION public.cancel_booking_with_refund(
  p_booking_id uuid,
  p_tenant_id uuid,
  p_cancellation_min_hours integer DEFAULT 4
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking record;
  v_hours_until_start double precision;
  v_session_outcome text;
  v_lock_key bigint;
  v_refunded boolean := false;
  v_pkg_svc record;
  v_pkg record;
  v_usage record;
BEGIN
  -- 1. Fetch booking with lock
  SELECT b.id, b.status, b.starts_at, b.customer_package_id, 
         b.customer_subscription_id, b.service_id, b.session_outcome,
         b.tenant_id
  INTO v_booking
  FROM bookings b
  WHERE b.id = p_booking_id AND b.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  -- 2. Prevent double-processing
  IF v_booking.status = 'cancelled' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_CANCELLED');
  END IF;

  IF v_booking.session_outcome IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_PROCESSED');
  END IF;

  -- 3. Calculate hours until start
  v_hours_until_start := EXTRACT(EPOCH FROM (v_booking.starts_at - now())) / 3600.0;

  -- 4. Determine session outcome
  IF v_booking.customer_package_id IS NULL AND v_booking.customer_subscription_id IS NULL THEN
    -- No benefit linked, just cancel
    v_session_outcome := NULL;
  ELSIF v_hours_until_start >= p_cancellation_min_hours THEN
    -- Enough advance notice → refund
    v_session_outcome := 'refunded';
  ELSE
    -- Late cancellation → forfeited
    v_session_outcome := 'forfeited';
  END IF;

  -- 5. Acquire advisory lock on booking id to prevent race conditions
  v_lock_key := ('x' || substr(replace(p_booking_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- 6. Refund package session if applicable
  IF v_session_outcome = 'refunded' AND v_booking.customer_package_id IS NOT NULL THEN
    -- Refund service-level usage
    SELECT cps.id, cps.sessions_used
    INTO v_pkg_svc
    FROM customer_package_services cps
    WHERE cps.customer_package_id = v_booking.customer_package_id
      AND cps.service_id = v_booking.service_id
    FOR UPDATE;

    IF FOUND AND v_pkg_svc.sessions_used > 0 THEN
      UPDATE customer_package_services
      SET sessions_used = sessions_used - 1
      WHERE id = v_pkg_svc.id;

      -- Refund package-level usage
      SELECT cp.id, cp.sessions_used, cp.status
      INTO v_pkg
      FROM customer_packages cp
      WHERE cp.id = v_booking.customer_package_id
      FOR UPDATE;

      IF FOUND THEN
        UPDATE customer_packages
        SET sessions_used = GREATEST(0, sessions_used - 1),
            status = CASE WHEN v_pkg.status = 'completed' THEN 'active' ELSE status END
        WHERE id = v_pkg.id;
      END IF;

      v_refunded := true;
    END IF;
  END IF;

  -- 7. Refund subscription session if applicable
  IF v_session_outcome = 'refunded' AND v_booking.customer_subscription_id IS NOT NULL THEN
    SELECT su.id, su.sessions_used, su.booking_ids
    INTO v_usage
    FROM subscription_usage su
    WHERE su.subscription_id = v_booking.customer_subscription_id
      AND su.service_id = v_booking.service_id
      AND su.period_start <= CURRENT_DATE
      AND su.period_end >= CURRENT_DATE
    FOR UPDATE;

    IF FOUND AND v_usage.sessions_used > 0 THEN
      UPDATE subscription_usage
      SET sessions_used = GREATEST(0, sessions_used - 1),
          booking_ids = array_remove(booking_ids, p_booking_id::text)
      WHERE id = v_usage.id;

      v_refunded := true;
    END IF;
  END IF;

  -- 8. Update booking status and session_outcome
  UPDATE bookings
  SET status = 'cancelled',
      session_outcome = v_session_outcome,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_outcome', v_session_outcome,
    'refunded', v_refunded,
    'hours_until_start', round(v_hours_until_start::numeric, 1),
    'cancellation_min_hours', p_cancellation_min_hours
  );
END;
$$;

-- 3. Create function for no_show (always forfeits session)
CREATE OR REPLACE FUNCTION public.mark_booking_no_show(
  p_booking_id uuid,
  p_tenant_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_booking record;
BEGIN
  SELECT id, status, customer_package_id, customer_subscription_id, session_outcome
  INTO v_booking
  FROM bookings
  WHERE id = p_booking_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'BOOKING_NOT_FOUND');
  END IF;

  IF v_booking.status = 'no_show' THEN
    RETURN jsonb_build_object('success', false, 'error', 'ALREADY_NO_SHOW');
  END IF;

  -- Determine session_outcome
  UPDATE bookings
  SET status = 'no_show',
      session_outcome = CASE 
        WHEN customer_package_id IS NOT NULL OR customer_subscription_id IS NOT NULL THEN 'forfeited'
        ELSE session_outcome
      END,
      updated_at = now()
  WHERE id = p_booking_id;

  RETURN jsonb_build_object('success', true, 'session_outcome', 'forfeited');
END;
$$;

-- 4. Mark existing completed bookings with benefit as 'consumed'
UPDATE bookings 
SET session_outcome = 'consumed'
WHERE status = 'completed' 
  AND session_outcome IS NULL
  AND (customer_package_id IS NOT NULL OR customer_subscription_id IS NOT NULL);
