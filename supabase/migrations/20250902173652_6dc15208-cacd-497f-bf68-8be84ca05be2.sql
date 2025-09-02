-- Associate current user with tenant
INSERT INTO public.users_tenant (user_id, tenant_id, role)
VALUES (
  '78e52431-6941-4112-aa46-a6cae780d99b'::uuid,
  '550e8400-e29b-41d4-a716-446655440000'::uuid,
  'admin'
) ON CONFLICT DO NOTHING;