
-- =============================================
-- ETAPA 3 & 4: Views financeiras + commission_basis config
-- =============================================

-- View: Faturamento Teórico (bookings completed/confirmed + product_sales)
CREATE OR REPLACE VIEW public.v_revenue_theoretical AS
SELECT
  b.tenant_id,
  DATE(b.starts_at AT TIME ZONE 'America/Sao_Paulo') AS revenue_date,
  b.staff_id,
  'service' AS revenue_type,
  b.id AS reference_id,
  s.price_cents AS amount_cents,
  b.customer_id,
  b.customer_package_id,
  b.customer_subscription_id
FROM bookings b
JOIN services s ON s.id = b.service_id
WHERE b.status IN ('completed', 'confirmed')
UNION ALL
SELECT
  ps.tenant_id,
  DATE(ps.sale_date AT TIME ZONE 'America/Sao_Paulo') AS revenue_date,
  ps.staff_id,
  'product' AS revenue_type,
  ps.id AS reference_id,
  ps.sale_price_snapshot_cents * ps.quantity AS amount_cents,
  NULL AS customer_id,
  NULL AS customer_package_id,
  NULL AS customer_subscription_id
FROM product_sales ps;

-- View: Recebimento Real (payments paid + cash_entries income)
CREATE OR REPLACE VIEW public.v_revenue_received AS
SELECT
  p.tenant_id,
  DATE(p.updated_at AT TIME ZONE 'America/Sao_Paulo') AS received_date,
  b.staff_id,
  'online' AS source,
  p.id AS reference_id,
  p.amount_cents,
  p.booking_id,
  COALESCE(
    (SELECT ce.payment_method FROM cash_entries ce WHERE ce.payment_id = p.id LIMIT 1),
    'online'
  ) AS payment_method
FROM payments p
LEFT JOIN bookings b ON b.id = p.booking_id
WHERE p.status = 'paid'
UNION ALL
SELECT
  ce.tenant_id,
  DATE(ce.occurred_at AT TIME ZONE 'America/Sao_Paulo') AS received_date,
  ce.staff_id,
  COALESCE(ce.source, 'manual') AS source,
  ce.id AS reference_id,
  ce.amount_cents,
  ce.booking_id,
  COALESCE(ce.payment_method, 'cash') AS payment_method
FROM cash_entries ce
WHERE ce.kind = 'income';

-- View: Saldos em aberto (comanda negativa por cliente)
CREATE OR REPLACE VIEW public.v_open_balances AS
SELECT
  cbe.tenant_id,
  cbe.customer_id,
  c.name AS customer_name,
  c.phone AS customer_phone,
  SUM(CASE WHEN cbe.type = 'credit' THEN cbe.amount_cents ELSE 0 END) AS total_credits,
  SUM(CASE WHEN cbe.type = 'debit' THEN cbe.amount_cents ELSE 0 END) AS total_debits,
  SUM(CASE WHEN cbe.type = 'credit' THEN cbe.amount_cents ELSE 0 END) -
  SUM(CASE WHEN cbe.type = 'debit' THEN cbe.amount_cents ELSE 0 END) AS balance_cents
FROM customer_balance_entries cbe
JOIN customers c ON c.id = cbe.customer_id
GROUP BY cbe.tenant_id, cbe.customer_id, c.name, c.phone;

-- View: Resumo diário do caixa
CREATE OR REPLACE VIEW public.v_daily_cash_summary AS
SELECT
  cs.tenant_id,
  cs.id AS session_id,
  DATE(cs.opened_at AT TIME ZONE 'America/Sao_Paulo') AS session_date,
  cs.opening_amount_cents,
  cs.closing_amount_cents,
  cs.expected_amount_cents,
  cs.difference_cents,
  cs.status,
  COALESCE(SUM(CASE WHEN ce.kind IN ('income', 'supply') THEN ce.amount_cents ELSE 0 END), 0) AS total_in,
  COALESCE(SUM(CASE WHEN ce.kind IN ('expense', 'withdrawal') THEN ce.amount_cents ELSE 0 END), 0) AS total_out,
  COUNT(ce.id) AS entries_count
FROM cash_sessions cs
LEFT JOIN cash_entries ce ON ce.session_id = cs.id
GROUP BY cs.id;

-- RLS: Views inherit base table RLS automatically in Supabase
-- No additional policies needed for views
