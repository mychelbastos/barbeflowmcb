-- Inserir apenas os dados de exemplo corretos
INSERT INTO public.staff (tenant_id, name, bio, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Carlos Silva', 'Especialista em cortes clássicos e modernos', '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Roberto Santos', 'Expert em barbas e bigodes estilosos', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Maria Costa', 'Profissional em cortes femininos e unissex', '#F59E0B');

-- Vincular profissionais aos serviços
INSERT INTO public.staff_services (staff_id, service_id) 
SELECT s.id, srv.id 
FROM public.staff s, public.services srv 
WHERE s.tenant_id = '550e8400-e29b-41d4-a716-446655440000' 
  AND srv.tenant_id = '550e8400-e29b-41d4-a716-446655440000';