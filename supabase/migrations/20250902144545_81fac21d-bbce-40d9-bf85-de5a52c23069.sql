-- Inserir dados de exemplo
INSERT INTO public.tenants (id, name, slug, phone, email, address) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Barbearia Premium', 'barbearia-premium', '(11) 99999-9999', 'contato@barbeariapreium.com', 'Rua das Flores, 123 - Centro, São Paulo - SP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.services (tenant_id, name, description, duration_minutes, price_cents, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte Tradicional', 'Corte clássico com acabamento tradicional', 30, 2500, '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte + Barba', 'Corte completo com barba aparada', 45, 4000, '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Barba', 'Aparar e modelar barba', 20, 2000, '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte Premium', 'Corte premium com hidratação e massagem', 60, 5500, '#8B5CF6')
ON CONFLICT DO NOTHING;

INSERT INTO public.staff (tenant_id, name, bio, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Carlos Silva', 'Especialista em cortes clássicos e modernos', '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Roberto Santos', 'Expert em barbas e bigodes estilosos', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Maria Costa', 'Profissional em cortes femininos e unissex', '#F59E0B')
ON CONFLICT DO NOTHING;

INSERT INTO public.schedules (tenant_id, weekday, start_time, end_time, break_start, break_end) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 1, '09:00', '18:00', '12:00', '13:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 2, '09:00', '18:00', '12:00', '13:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 3, '09:00', '18:00', '12:00', '13:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 4, '09:00', '18:00', '12:00', '13:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 5, '09:00', '18:00', '12:00', '13:00'),
  ('550e8400-e29b-41d4-a716-446655440000', 6, '09:00', '17:00', '12:00', '13:00')
ON CONFLICT DO NOTHING;