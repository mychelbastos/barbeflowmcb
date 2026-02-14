
-- Fix views to use SECURITY INVOKER (inherits caller's RLS)
ALTER VIEW public.v_revenue_theoretical SET (security_invoker = on);
ALTER VIEW public.v_revenue_received SET (security_invoker = on);
ALTER VIEW public.v_open_balances SET (security_invoker = on);
ALTER VIEW public.v_daily_cash_summary SET (security_invoker = on);
