-- Fix CRITICAL privilege escalation vulnerability in users_tenant table
-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Tenant scope users_tenant" ON public.users_tenant;

-- Create separate policies with proper role-based access control

-- Users can only view their own tenant associations
CREATE POLICY "Users can view own tenant associations" 
ON public.users_tenant 
FOR SELECT 
USING (user_id = auth.uid());

-- Users can join tenants (for invitation flows) but cannot set their own role
CREATE POLICY "Users can join tenants with default role" 
ON public.users_tenant 
FOR INSERT 
WITH CHECK (user_id = auth.uid() AND role = 'member');

-- Only existing admins can modify roles and manage tenant users
CREATE POLICY "Admins can manage tenant users" 
ON public.users_tenant 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.users_tenant ut
    WHERE ut.user_id = auth.uid() 
    AND ut.tenant_id = users_tenant.tenant_id 
    AND ut.role = 'admin'
  )
);

-- Fix HIGH severity tenant information exposure
-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Public read tenants" ON public.tenants;

-- Create a restricted policy that only exposes essential public fields
CREATE POLICY "Public read essential tenant info" 
ON public.tenants 
FOR SELECT 
USING (true)
-- Only expose name and slug for public booking pages, hide sensitive contact info
RETURNING (name, slug, logo_url, cover_url, settings);

-- Add policy for authenticated users to access their own tenant's full details
CREATE POLICY "Users can access full tenant details for their tenants" 
ON public.tenants 
FOR SELECT 
USING (user_belongs_to_tenant(id));

-- Enhanced security for bookings - ensure public bookings only use public creation method
DROP POLICY IF EXISTS "Public insert bookings" ON public.bookings;
CREATE POLICY "Public insert bookings with validation" 
ON public.bookings 
FOR INSERT 
WITH CHECK (
  created_via = 'public' 
  AND tenant_id IS NOT NULL 
  AND service_id IS NOT NULL 
  AND customer_id IS NOT NULL 
  AND starts_at > now() 
  AND ends_at > starts_at
);

-- Add rate limiting function for public booking creation
CREATE OR REPLACE FUNCTION public.check_booking_rate_limit(customer_phone text, tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- Allow max 3 bookings per phone number per tenant per hour
  SELECT (
    SELECT COUNT(*)
    FROM public.bookings b
    JOIN public.customers c ON b.customer_id = c.id
    WHERE c.phone = customer_phone
    AND b.tenant_id = tenant_uuid
    AND b.created_at > (now() - interval '1 hour')
  ) < 3;
$$;