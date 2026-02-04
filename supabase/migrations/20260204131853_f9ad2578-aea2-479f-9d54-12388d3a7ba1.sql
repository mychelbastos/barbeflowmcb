-- Create products table for tenant product management
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  photo_url TEXT,
  purchase_price_cents INTEGER NOT NULL DEFAULT 0,
  sale_price_cents INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create product_sales table for sales tracking
CREATE TABLE public.product_sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  sale_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sale_price_snapshot_cents INTEGER NOT NULL,
  purchase_price_snapshot_cents INTEGER NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_sales ENABLE ROW LEVEL SECURITY;

-- RLS policies for products
CREATE POLICY "Tenant scope products"
ON public.products
FOR ALL
USING (user_belongs_to_tenant(tenant_id));

-- RLS policies for product_sales
CREATE POLICY "Tenant scope product_sales"
ON public.product_sales
FOR ALL
USING (user_belongs_to_tenant(tenant_id));

-- Create indexes for performance
CREATE INDEX idx_products_tenant_id ON public.products(tenant_id);
CREATE INDEX idx_products_active ON public.products(tenant_id, active);
CREATE INDEX idx_product_sales_tenant_id ON public.product_sales(tenant_id);
CREATE INDEX idx_product_sales_date ON public.product_sales(tenant_id, sale_date);

-- Trigger for updated_at on products
CREATE TRIGGER update_products_updated_at
BEFORE UPDATE ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();