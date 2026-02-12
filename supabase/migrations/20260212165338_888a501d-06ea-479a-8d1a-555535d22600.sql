
-- Create a function to get customer stats in bulk (eliminates N+1 queries)
CREATE OR REPLACE FUNCTION public.get_customer_stats(p_tenant_id uuid)
RETURNS TABLE(
  customer_id uuid,
  total_bookings bigint,
  total_spent bigint,
  last_visit timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    b.customer_id,
    COUNT(b.id) AS total_bookings,
    COALESCE(SUM(s.price_cents), 0) AS total_spent,
    MAX(b.starts_at) AS last_visit
  FROM bookings b
  LEFT JOIN services s ON s.id = b.service_id
  WHERE b.tenant_id = p_tenant_id
  GROUP BY b.customer_id;
$$;
