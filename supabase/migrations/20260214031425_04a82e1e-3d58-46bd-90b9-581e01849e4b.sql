
-- Table to deduplicate WhatsApp notifications (anti-spam)
CREATE TABLE public.notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id),
  customer_id UUID REFERENCES public.customers(id),
  subscription_id UUID REFERENCES public.customer_subscriptions(id),
  booking_id UUID REFERENCES public.bookings(id),
  event_type TEXT NOT NULL,
  dedup_key TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint for deduplication
CREATE UNIQUE INDEX idx_notification_log_dedup ON public.notification_log (dedup_key);

-- Index for cleanup queries
CREATE INDEX idx_notification_log_tenant_sent ON public.notification_log (tenant_id, sent_at);

-- Enable RLS
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

-- Only service role / edge functions can access this table
CREATE POLICY "Service role only" ON public.notification_log
  FOR ALL USING (false);
