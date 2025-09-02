-- Criar schema completo para sistema multi-tenant de barbearias

-- Tabela principal de barbearias (tenants)
CREATE TABLE public.tenants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  logo_url TEXT,
  cover_url TEXT,
  settings JSONB DEFAULT '{
    "timezone": "America/Bahia",
    "slot_duration": 15,
    "buffer_time": 10,
    "allow_online_payment": false,
    "require_prepayment": false,
    "prepayment_percentage": 0,
    "cancellation_hours": 2,
    "whatsapp_enabled": false,
    "email_notifications": true
  }'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Usuários vinculados a tenants (equipe da barbearia)
CREATE TABLE public.users_tenant (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner','admin','manager','staff')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, tenant_id)
);

-- Serviços oferecidos pela barbearia
CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  color TEXT DEFAULT '#3B82F6',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profissionais/staff da barbearia
CREATE TABLE public.staff (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  bio TEXT,
  color TEXT DEFAULT '#10B981',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Relacionamento entre staff e serviços que podem executar
CREATE TABLE public.staff_services (
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.services(id) ON DELETE CASCADE,
  PRIMARY KEY (staff_id, service_id)
);

-- Horários de funcionamento e disponibilidade
CREATE TABLE public.schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6), -- 0=domingo
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_start TIME,
  break_end TIME,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Bloqueios, folgas e feriados
CREATE TABLE public.blocks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Clientes (sem autenticação, apenas dados de contato)
CREATE TABLE public.customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Agendamentos
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')) DEFAULT 'confirmed',
  notes TEXT,
  created_via TEXT CHECK (created_via IN ('public','admin')) DEFAULT 'public',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pagamentos (opcional)
CREATE TABLE public.payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'pagarme',
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL CHECK (status IN ('pending','paid','failed','refunded','cancelled')),
  external_id TEXT,
  checkout_url TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_tenant ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Função para verificar se usuário pertence ao tenant
CREATE OR REPLACE FUNCTION public.user_belongs_to_tenant(tenant_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users_tenant ut
    WHERE ut.user_id = auth.uid()
      AND ut.tenant_id = tenant_uuid
  );
$$;

-- Políticas RLS para tenants
CREATE POLICY "Users can view their tenants" ON public.tenants
  FOR SELECT
  USING (public.user_belongs_to_tenant(id));

CREATE POLICY "Users can update their tenants" ON public.tenants
  FOR UPDATE
  USING (public.user_belongs_to_tenant(id));

-- Políticas RLS para users_tenant
CREATE POLICY "Users can view tenant memberships" ON public.users_tenant
  FOR SELECT
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Owners can manage tenant memberships" ON public.users_tenant
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users_tenant ut
      WHERE ut.user_id = auth.uid()
        AND ut.tenant_id = users_tenant.tenant_id
        AND ut.role IN ('owner', 'admin')
    )
  );

-- Políticas RLS para services
CREATE POLICY "Tenant scope for services" ON public.services
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas RLS para staff
CREATE POLICY "Tenant scope for staff" ON public.staff
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas RLS para staff_services
CREATE POLICY "Tenant scope for staff_services" ON public.staff_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_services.staff_id
        AND public.user_belongs_to_tenant(s.tenant_id)
    )
  );

-- Políticas RLS para schedules
CREATE POLICY "Tenant scope for schedules" ON public.schedules
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas RLS para blocks
CREATE POLICY "Tenant scope for blocks" ON public.blocks
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas RLS para customers
CREATE POLICY "Tenant scope for customers" ON public.customers
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas RLS para bookings
CREATE POLICY "Tenant scope for bookings" ON public.bookings
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Políticas públicas para agendamento (slug público)
CREATE POLICY "Public read for tenant by slug" ON public.tenants
  FOR SELECT
  USING (true);

CREATE POLICY "Public read services" ON public.services
  FOR SELECT
  USING (active = true);

CREATE POLICY "Public read staff" ON public.staff
  FOR SELECT
  USING (active = true);

CREATE POLICY "Public read schedules" ON public.schedules
  FOR SELECT
  USING (active = true);

CREATE POLICY "Public read blocks" ON public.blocks
  FOR SELECT
  USING (true);

CREATE POLICY "Public insert customers" ON public.customers
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public insert bookings" ON public.bookings
  FOR INSERT
  WITH CHECK (created_via = 'public');

-- Políticas RLS para payments
CREATE POLICY "Tenant scope for payments" ON public.payments
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at
  BEFORE UPDATE ON public.staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir dados de exemplo (tenant de demonstração)
INSERT INTO public.tenants (id, name, slug, phone, email, address) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Barbearia Premium', 'barbearia-premium', '(11) 99999-9999', 'contato@barbeariapreium.com', 'Rua das Flores, 123 - Centro, São Paulo - SP');

-- Inserir serviços de exemplo
INSERT INTO public.services (tenant_id, name, description, duration_minutes, price_cents, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte Tradicional', 'Corte clássico com acabamento tradicional', 30, 2500, '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte + Barba', 'Corte completo com barba aparada', 45, 4000, '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Barba', 'Aparar e modelar barba', 20, 2000, '#F59E0B'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Corte Premium', 'Corte premium com hidratação e massagem', 60, 5500, '#8B5CF6');

-- Inserir staff de exemplo
INSERT INTO public.staff (tenant_id, name, specialty, color) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Carlos Silva', 'Cortes clássicos', '#3B82F6'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Roberto Santos', 'Barbas e bigodes', '#10B981'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Maria Costa', 'Cortes femininos', '#F59E0B');

-- Inserir horários de funcionamento (segunda a sexta 9h-18h, sábado 9h-17h)
INSERT INTO public.schedules (tenant_id, weekday, start_time, end_time, break_start, break_end) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 1, '09:00', '18:00', '12:00', '13:00'), -- Segunda
  ('550e8400-e29b-41d4-a716-446655440000', 2, '09:00', '18:00', '12:00', '13:00'), -- Terça
  ('550e8400-e29b-41d4-a716-446655440000', 3, '09:00', '18:00', '12:00', '13:00'), -- Quarta
  ('550e8400-e29b-41d4-a716-446655440000', 4, '09:00', '18:00', '12:00', '13:00'), -- Quinta
  ('550e8400-e29b-41d4-a716-446655440000', 5, '09:00', '18:00', '12:00', '13:00'), -- Sexta
  ('550e8400-e29b-41d4-a716-446655440000', 6, '09:00', '17:00', '12:00', '13:00'); -- Sábado