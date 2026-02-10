
-- Fix overly permissive plans policy
DROP POLICY "Super admin manage plans" ON public.plans;
