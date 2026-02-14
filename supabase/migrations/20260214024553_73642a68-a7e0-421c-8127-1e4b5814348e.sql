
-- Add failed_at column to track when a subscription payment failed
ALTER TABLE public.customer_subscriptions 
ADD COLUMN IF NOT EXISTS failed_at timestamptz DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.customer_subscriptions.failed_at IS 'Timestamp of last payment failure, used for grace period calculation';
