-- Associate user santoslizandra634@gmail.com with tenant Barbearia WS
INSERT INTO public.users_tenant (user_id, tenant_id, role)
VALUES (
  '351590d0-c2b4-41dc-b34e-da1bdac997c9', 
  '550e8400-e29b-41d4-a716-446655440000', 
  'admin'
)
ON CONFLICT DO NOTHING;