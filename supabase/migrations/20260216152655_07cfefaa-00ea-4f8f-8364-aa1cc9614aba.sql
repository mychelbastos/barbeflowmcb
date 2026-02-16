
-- =============================================
-- FASE 1: Schema para sistema de comanda
-- =============================================

-- 1) Adicionar comanda_status ao bookings
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS comanda_status text NOT NULL DEFAULT 'open';

-- Constraint para valores válidos
ALTER TABLE public.bookings 
ADD CONSTRAINT bookings_comanda_status_check 
CHECK (comanda_status IN ('open', 'closed'));

-- 2) Criar tabela booking_items (itens da comanda)
CREATE TABLE public.booking_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('service', 'product', 'extra_service')),
  ref_id uuid NULL,  -- service_id ou product_id quando existir
  title text NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price_cents integer NOT NULL DEFAULT 0,
  total_price_cents integer NOT NULL GENERATED ALWAYS AS (unit_price_cents * quantity) STORED,
  purchase_price_cents integer NOT NULL DEFAULT 0,  -- custo de aquisição (produtos)
  staff_id uuid REFERENCES public.staff(id),
  paid_status text NOT NULL DEFAULT 'unpaid' CHECK (paid_status IN ('unpaid', 'paid_online', 'paid_local', 'covered')),
  paid_at timestamptz NULL,
  payment_id uuid NULL REFERENCES public.payments(id),
  receipt_id uuid NULL,  -- para idempotência de pagamento local
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_booking_items_booking_id ON public.booking_items(booking_id);
CREATE INDEX idx_booking_items_tenant_id ON public.booking_items(tenant_id);
CREATE INDEX idx_booking_items_staff_id ON public.booking_items(staff_id);
CREATE INDEX idx_booking_items_paid_status ON public.booking_items(paid_status);

-- 3) RLS para booking_items
ALTER TABLE public.booking_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant scope booking_items"
ON public.booking_items
FOR ALL
USING (user_belongs_to_tenant(tenant_id));

-- Permitir leitura pública (para página pública do booking se necessário)
CREATE POLICY "Public read booking_items"
ON public.booking_items
FOR SELECT
USING (true);

-- 4) Migração de dados: criar booking_items para bookings existentes com status completed
-- Cada booking completed ganha 1 item do tipo 'service'
INSERT INTO public.booking_items (tenant_id, booking_id, type, ref_id, title, quantity, unit_price_cents, purchase_price_cents, staff_id, paid_status, paid_at)
SELECT 
  b.tenant_id,
  b.id,
  'service',
  b.service_id,
  COALESCE(s.name, 'Serviço'),
  1,
  COALESCE(s.price_cents, 0),
  0,
  b.staff_id,
  CASE 
    -- Se tem pagamento online aprovado
    WHEN EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.booking_id = b.id AND p.status = 'paid'
    ) THEN 'paid_online'
    -- Se tem registro de pagamento local
    WHEN EXISTS (
      SELECT 1 FROM public.customer_balance_entries cbe 
      WHERE cbe.booking_id = b.id 
      AND (cbe.description ILIKE 'Pagamento local%' OR cbe.description = 'Serviço realizado')
    ) THEN 'paid_local'
    -- Se coberto por pacote/assinatura
    WHEN b.customer_package_id IS NOT NULL OR b.customer_subscription_id IS NOT NULL THEN 'covered'
    ELSE 'unpaid'
  END,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.payments p 
      WHERE p.booking_id = b.id AND p.status = 'paid'
    ) THEN (SELECT p.updated_at FROM public.payments p WHERE p.booking_id = b.id AND p.status = 'paid' LIMIT 1)
    WHEN EXISTS (
      SELECT 1 FROM public.customer_balance_entries cbe 
      WHERE cbe.booking_id = b.id 
      AND (cbe.description ILIKE 'Pagamento local%' OR cbe.description = 'Serviço realizado')
    ) THEN (SELECT cbe.created_at FROM public.customer_balance_entries cbe WHERE cbe.booking_id = b.id AND (cbe.description ILIKE 'Pagamento local%' OR cbe.description = 'Serviço realizado') LIMIT 1)
    ELSE NULL
  END
FROM public.bookings b
LEFT JOIN public.services s ON s.id = b.service_id
WHERE b.status = 'completed';

-- Também migrar bookings confirmed (para ter o item pré-criado)
INSERT INTO public.booking_items (tenant_id, booking_id, type, ref_id, title, quantity, unit_price_cents, purchase_price_cents, staff_id, paid_status)
SELECT 
  b.tenant_id,
  b.id,
  'service',
  b.service_id,
  COALESCE(s.name, 'Serviço'),
  1,
  COALESCE(s.price_cents, 0),
  0,
  b.staff_id,
  CASE 
    WHEN b.customer_package_id IS NOT NULL OR b.customer_subscription_id IS NOT NULL THEN 'covered'
    ELSE 'unpaid'
  END
FROM public.bookings b
LEFT JOIN public.services s ON s.id = b.service_id
WHERE b.status = 'confirmed';

-- 5) Marcar comanda_status dos completed que já foram pagos
UPDATE public.bookings 
SET comanda_status = 'closed'
WHERE status = 'completed'
AND (
  EXISTS (SELECT 1 FROM public.payments p WHERE p.booking_id = bookings.id AND p.status = 'paid')
  OR EXISTS (
    SELECT 1 FROM public.customer_balance_entries cbe 
    WHERE cbe.booking_id = bookings.id 
    AND (cbe.description ILIKE 'Pagamento local%' OR cbe.description = 'Serviço realizado')
  )
  OR customer_package_id IS NOT NULL
  OR customer_subscription_id IS NOT NULL
);

-- 6) Trigger para criar booking_item automaticamente quando um booking é criado
CREATE OR REPLACE FUNCTION public.create_booking_service_item()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.booking_items (
    tenant_id, booking_id, type, ref_id, title, quantity, 
    unit_price_cents, purchase_price_cents, staff_id, paid_status
  )
  SELECT 
    NEW.tenant_id,
    NEW.id,
    'service',
    NEW.service_id,
    COALESCE(s.name, 'Serviço'),
    1,
    CASE 
      WHEN NEW.customer_package_id IS NOT NULL OR NEW.customer_subscription_id IS NOT NULL THEN 0
      ELSE COALESCE(s.price_cents, 0)
    END,
    0,
    NEW.staff_id,
    CASE 
      WHEN NEW.customer_package_id IS NOT NULL OR NEW.customer_subscription_id IS NOT NULL THEN 'covered'
      ELSE 'unpaid'
    END
  FROM public.services s
  WHERE s.id = NEW.service_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_create_booking_service_item
AFTER INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.create_booking_service_item();
