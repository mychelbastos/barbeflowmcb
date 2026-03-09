
CREATE OR REPLACE FUNCTION public.create_booking_if_available(
  p_tenant_id uuid, p_service_id uuid, p_staff_id uuid, p_customer_id uuid,
  p_starts_at timestamp with time zone, p_ends_at timestamp with time zone,
  p_status text, p_notes text DEFAULT NULL::text,
  p_created_via text DEFAULT 'public'::text,
  p_customer_package_id uuid DEFAULT NULL::uuid,
  p_customer_subscription_id uuid DEFAULT NULL::uuid,
  p_buffer_minutes integer DEFAULT 10,
  p_skip_conflict_check boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_booking_id uuid;
  v_conflict_count int;
  v_lock_key bigint;
  v_weekday int;
  v_local_date date;
  v_local_start_time time;
  v_local_end_time time;
  v_rc record;
  v_rc_start_minutes int;
  v_rc_end_minutes int;
  v_slot_start_minutes int;
  v_slot_end_minutes int;
  v_interval int;
  v_diff_days int;
  v_diff_weeks int;
BEGIN
  -- Create a deterministic lock key from staff_id to serialize bookings per staff member
  v_lock_key := ('x' || substr(replace(p_staff_id::text, '-', ''), 1, 16))::bit(64)::bigint;
  
  -- Acquire advisory lock (automatically released at end of transaction)
  PERFORM pg_advisory_xact_lock(v_lock_key);
  
  -- Only check conflicts if not explicitly skipped (admin override)
  IF NOT p_skip_conflict_check THEN
    -- Check conflicts with existing bookings (including buffer time)
    SELECT COUNT(*) INTO v_conflict_count
    FROM bookings
    WHERE tenant_id = p_tenant_id
      AND staff_id = p_staff_id
      AND status IN ('confirmed', 'pending', 'pending_payment', 'completed')
      AND starts_at < (p_ends_at + (p_buffer_minutes || ' minutes')::interval)
      AND ends_at > (p_starts_at - (p_buffer_minutes || ' minutes')::interval);
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'TIME_CONFLICT';
    END IF;
    
    -- Check conflicts with blocks
    SELECT COUNT(*) INTO v_conflict_count
    FROM blocks
    WHERE tenant_id = p_tenant_id
      AND (staff_id = p_staff_id OR staff_id IS NULL)
      AND starts_at < p_ends_at
      AND ends_at > p_starts_at;
    
    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'BLOCK_CONFLICT';
    END IF;

    -- Check conflicts with recurring clients (virtual slots not yet materialized)
    -- Convert UTC times to local (America/Bahia = UTC-3) for comparison with recurring_clients
    v_local_date := (p_starts_at AT TIME ZONE 'America/Bahia')::date;
    v_weekday := EXTRACT(DOW FROM (p_starts_at AT TIME ZONE 'America/Bahia'));
    v_local_start_time := (p_starts_at AT TIME ZONE 'America/Bahia')::time;
    v_local_end_time := (p_ends_at AT TIME ZONE 'America/Bahia')::time;
    v_slot_start_minutes := EXTRACT(HOUR FROM v_local_start_time) * 60 + EXTRACT(MINUTE FROM v_local_start_time);
    v_slot_end_minutes := EXTRACT(HOUR FROM v_local_end_time) * 60 + EXTRACT(MINUTE FROM v_local_end_time);

    FOR v_rc IN
      SELECT rc.start_time, rc.duration_minutes, rc.frequency, rc.start_date, rc.customer_id,
             COALESCE(s.duration_minutes, rc.duration_minutes) AS effective_duration
      FROM recurring_clients rc
      LEFT JOIN services s ON s.id = rc.service_id
      WHERE rc.tenant_id = p_tenant_id
        AND rc.staff_id = p_staff_id
        AND rc.weekday = v_weekday
        AND rc.active = true
        AND rc.start_date <= v_local_date
    LOOP
      -- Check frequency: skip if not the right week
      v_interval := CASE v_rc.frequency
        WHEN 'weekly' THEN 1
        WHEN 'biweekly' THEN 2
        WHEN 'triweekly' THEN 3
        WHEN 'monthly' THEN 4
        ELSE 1
      END;

      IF v_interval > 1 THEN
        v_diff_days := v_local_date - v_rc.start_date;
        v_diff_weeks := v_diff_days / 7;
        IF v_diff_weeks % v_interval != 0 THEN
          CONTINUE;
        END IF;
      END IF;

      -- Skip if a real booking already exists for this customer+staff on this day
      -- (means the recurring slot was already materialized)
      SELECT COUNT(*) INTO v_conflict_count
      FROM bookings
      WHERE tenant_id = p_tenant_id
        AND staff_id = p_staff_id
        AND customer_id = v_rc.customer_id
        AND (starts_at AT TIME ZONE 'America/Bahia')::date = v_local_date;

      IF v_conflict_count > 0 THEN
        CONTINUE; -- Already materialized, conflict already checked above
      END IF;

      -- Check time overlap with buffer
      v_rc_start_minutes := EXTRACT(HOUR FROM v_rc.start_time) * 60 + EXTRACT(MINUTE FROM v_rc.start_time);
      v_rc_end_minutes := v_rc_start_minutes + v_rc.effective_duration;

      IF v_slot_start_minutes < (v_rc_end_minutes + p_buffer_minutes) 
         AND v_slot_end_minutes > (v_rc_start_minutes - p_buffer_minutes) THEN
        RAISE EXCEPTION 'TIME_CONFLICT';
      END IF;
    END LOOP;
  END IF;
  
  -- Insert booking atomically
  INSERT INTO bookings (
    tenant_id, service_id, staff_id, customer_id,
    starts_at, ends_at, status, notes, created_via,
    customer_package_id, customer_subscription_id
  ) VALUES (
    p_tenant_id, p_service_id, p_staff_id, p_customer_id,
    p_starts_at, p_ends_at, p_status, p_notes, p_created_via,
    p_customer_package_id, p_customer_subscription_id
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$function$;
