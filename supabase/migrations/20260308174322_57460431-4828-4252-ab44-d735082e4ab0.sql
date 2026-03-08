CREATE OR REPLACE FUNCTION public.admin_list_tenants(p_status text DEFAULT NULL::text, p_search text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
BEGIN
  IF NOT (SELECT is_platform_admin()) THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;
  
  SELECT jsonb_agg(row_to_jsonb(t)) INTO v_result
  FROM (
    SELECT 
      t.id,
      t.name,
      t.slug,
      t.email,
      t.phone,
      t.address,
      t.logo_url,
      t.subscription_status,
      t.created_at,
      t.attribution,
      t.settings,
      -- Subscription info
      ss.plan_name,
      ss.billing_interval,
      ss.commission_rate,
      ss.trial_start,
      ss.trial_end,
      ss.status as stripe_status,
      ss.current_period_start,
      ss.current_period_end,
      ss.cancel_at_period_end,
      ss.canceled_at,
      ss.discount_name,
      ss.discount_percent_off,
      ss.discount_amount_off,
      ss.stripe_subscription_id,
      -- Usage metrics
      (SELECT count(*) FROM staff s WHERE s.tenant_id = t.id) as staff_count,
      (SELECT count(*) FROM services sv WHERE sv.tenant_id = t.id AND sv.active) as services_count,
      (SELECT count(*) FROM customers c WHERE c.tenant_id = t.id) as customers_count,
      (SELECT count(*) FROM bookings b WHERE b.tenant_id = t.id) as bookings_total,
      (SELECT count(*) FROM bookings b WHERE b.tenant_id = t.id AND b.created_at > now() - interval '7 days') as bookings_7d,
      (SELECT count(*) FROM bookings b WHERE b.tenant_id = t.id AND b.created_at > now() - interval '30 days') as bookings_30d,
      (SELECT count(*) FROM payments p WHERE p.tenant_id = t.id) as payments_count,
      (SELECT count(*) FROM payments p WHERE p.tenant_id = t.id AND p.status = 'paid') as payments_paid_count,
      (SELECT COALESCE(SUM(p.amount_cents), 0) FROM payments p WHERE p.tenant_id = t.id AND p.status = 'paid') as revenue_cents,
      -- Platform fees
      (SELECT COALESCE(SUM(pf.fee_amount_cents), 0) FROM platform_fees pf WHERE pf.tenant_id = t.id AND pf.status = 'collected') as platform_fees_cents,
      (SELECT count(*) FROM platform_fees pf WHERE pf.tenant_id = t.id) as platform_fees_count,
      -- Connections
      (SELECT mc.mp_user_id IS NOT NULL FROM mercadopago_connections mc WHERE mc.tenant_id = t.id LIMIT 1) as mp_connected,
      (SELECT wc.whatsapp_connected FROM whatsapp_connections wc WHERE wc.tenant_id = t.id LIMIT 1) as wa_connected,
      -- Onboarding
      op.questionnaire_completed,
      op.weekly_clients,
      op.monthly_revenue,
      op.biggest_challenge,
      op.heard_from,
      op.team_size,
      op.onboarding_completed,
      -- Attribution
      t.attribution->'first_touch'->>'utm_source' as first_touch_source,
      t.attribution->'first_touch'->>'utm_medium' as first_touch_medium,
      t.attribution->'first_touch'->>'utm_campaign' as first_touch_campaign,
      t.attribution->'first_touch'->>'referrer' as first_touch_referrer,
      t.attribution->'last_touch'->>'utm_source' as last_touch_source,
      t.attribution->'last_touch'->>'utm_campaign' as last_touch_campaign,
      t.attribution->>'touch_count' as touch_count,
      t.attribution->>'days_to_signup' as days_to_signup
    FROM tenants t
    LEFT JOIN stripe_subscriptions ss ON ss.tenant_id = t.id
    LEFT JOIN onboarding_progress op ON op.tenant_id = t.id
    WHERE (p_status IS NULL OR t.subscription_status = p_status)
      AND (p_search IS NULL 
        OR t.name ILIKE '%' || p_search || '%' 
        OR t.email ILIKE '%' || p_search || '%' 
        OR t.phone ILIKE '%' || p_search || '%'
        OR t.id::text = p_search
        OR t.slug ILIKE '%' || p_search || '%')
    ORDER BY t.created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  
  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$function$;