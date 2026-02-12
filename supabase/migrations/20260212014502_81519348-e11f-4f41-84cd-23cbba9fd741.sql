
-- Add customer_package_id and customer_subscription_id to bookings table
ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS customer_package_id uuid REFERENCES public.customer_packages(id),
ADD COLUMN IF NOT EXISTS customer_subscription_id uuid REFERENCES public.customer_subscriptions(id);

-- Index for reverse lookup (cancellation session restore)
CREATE INDEX IF NOT EXISTS idx_bookings_customer_package_id ON public.bookings(customer_package_id) WHERE customer_package_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_customer_subscription_id ON public.bookings(customer_subscription_id) WHERE customer_subscription_id IS NOT NULL;
