-- Add customer_package_id to payments table for package purchase tracking
ALTER TABLE public.payments
ADD COLUMN customer_package_id uuid REFERENCES public.customer_packages(id) ON DELETE SET NULL;

-- Index for lookup
CREATE INDEX idx_payments_customer_package_id ON public.payments(customer_package_id) WHERE customer_package_id IS NOT NULL;