-- Create admin user entry for the current authenticated user
-- First, check if there's already an entry
DO $$
DECLARE
    current_user_id UUID;
    tenant_uuid UUID := '550e8400-e29b-41d4-a716-446655440000';
BEGIN
    -- Get the current authenticated user ID (this is the user making the request)
    SELECT auth.uid() INTO current_user_id;
    
    -- Only proceed if we have a valid user ID
    IF current_user_id IS NOT NULL THEN
        -- Insert admin role for current user if not exists
        INSERT INTO public.users_tenant (user_id, tenant_id, role)
        VALUES (current_user_id, tenant_uuid, 'admin')
        ON CONFLICT (user_id, tenant_id) 
        DO UPDATE SET role = 'admin';
        
        RAISE NOTICE 'Admin access granted to user: %', current_user_id;
    ELSE
        RAISE NOTICE 'No authenticated user found';
    END IF;
END $$;