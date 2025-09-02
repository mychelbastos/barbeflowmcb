-- Criar função helper para verificar se usuário pertence ao tenant
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

-- Políticas para acesso público (página de agendamento)
CREATE POLICY "Public read tenants" ON public.tenants
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

-- Políticas para usuários autenticados (área admin)
CREATE POLICY "Tenant scope tenants" ON public.tenants
  FOR ALL
  USING (public.user_belongs_to_tenant(id));

CREATE POLICY "Tenant scope users_tenant" ON public.users_tenant
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope services" ON public.services
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope staff" ON public.staff
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope staff_services" ON public.staff_services
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.staff s
      WHERE s.id = staff_services.staff_id
        AND public.user_belongs_to_tenant(s.tenant_id)
    )
  );

CREATE POLICY "Tenant scope schedules" ON public.schedules
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope blocks" ON public.blocks
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope customers" ON public.customers
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope bookings" ON public.bookings
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

CREATE POLICY "Tenant scope payments" ON public.payments
  FOR ALL
  USING (public.user_belongs_to_tenant(tenant_id));

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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