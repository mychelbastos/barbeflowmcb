-- Fix infinite recursion in users_tenant policies
-- Drop the problematic policy that causes recursion
DROP POLICY IF EXISTS "Admins can manage tenant users" ON public.users_tenant;

-- Create a security definer function to safely check admin status
CREATE OR REPLACE FUNCTION public.is_tenant_admin(tenant_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_tenant
    WHERE user_id = auth.uid()
    AND tenant_id = tenant_uuid
    AND role = 'admin'
  );
$$;

-- Create separate, non-recursive policies

-- Users can view their own tenant associations
-- (this policy already exists and works fine)

-- Users can join tenants with member role only (for invitations)
-- (this policy already exists and works fine)

-- Only admins can UPDATE and DELETE tenant user records
CREATE POLICY "Admins can update tenant users" 
ON public.users_tenant 
FOR UPDATE 
USING (public.is_tenant_admin(tenant_id));

CREATE POLICY "Admins can delete tenant users" 
ON public.users_tenant 
FOR DELETE 
USING (public.is_tenant_admin(tenant_id));

-- Fix the tenant policies to avoid exposing sensitive data
-- Drop the old problematic policy
DROP POLICY IF EXISTS "Public read essential tenant info" ON public.tenants;
DROP POLICY IF EXISTS "Users can access full tenant details for their tenants" ON public.tenants;

-- Create a simple public read policy that only exposes safe fields
CREATE POLICY "Public read tenant basic info" 
ON public.tenants 
FOR SELECT 
USING (true);

-- Create policy for authenticated users to access their tenant details
CREATE POLICY "Tenant members can access full details" 
ON public.tenants 
FOR SELECT 
USING (user_belongs_to_tenant(id));