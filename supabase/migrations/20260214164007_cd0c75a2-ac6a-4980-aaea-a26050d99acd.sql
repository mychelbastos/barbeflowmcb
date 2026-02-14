
-- View: v_booking_received_amount
-- Consolidates online (payments) + local (cash_entries) received amounts per booking.
-- Deduplication rules:
--   - payments: grouped by booking_id, only status='paid'
--   - cash_entries: grouped by booking_id, only kind='income', excludes payment_method='online'
--   - Both sources SUM to support partial payments
-- Only completed bookings are included.

CREATE OR REPLACE VIEW public.v_booking_received_amount
WITH (security_invoker = on) AS
SELECT
  b.id AS booking_id,
  b.tenant_id,
  b.staff_id,
  b.service_id,
  b.starts_at,
  b.customer_package_id,
  b.customer_subscription_id,
  COALESCE(p.online_cents, 0) + COALESCE(c.local_cents, 0) AS received_cents
FROM bookings b
LEFT JOIN (
  -- Online payments: deduplicated by grouping per booking_id
  SELECT
    booking_id,
    SUM(amount_cents) AS online_cents
  FROM payments
  WHERE status = 'paid'
    AND booking_id IS NOT NULL
  GROUP BY booking_id
) p ON p.booking_id = b.id
LEFT JOIN (
  -- Local payments: cash_entries linked to booking, excluding online-created entries
  -- Uses payment_method to differentiate: 'online' entries come from mp-webhook
  SELECT
    booking_id,
    SUM(amount_cents) AS local_cents
  FROM cash_entries
  WHERE kind = 'income'
    AND booking_id IS NOT NULL
    AND (payment_method IS DISTINCT FROM 'online')
  GROUP BY booking_id
) c ON c.booking_id = b.id
WHERE b.status = 'completed';

-- Add comment for documentation
COMMENT ON VIEW public.v_booking_received_amount IS
  'Consolidated received amount per completed booking. Sums online payments + local cash entries without double-counting. Used by CommissionsTab for received-basis commission calculation.';
