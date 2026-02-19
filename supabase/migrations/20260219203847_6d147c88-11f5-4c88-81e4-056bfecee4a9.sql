
-- Add Meta cookie columns to tenants for server-side attribution
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS meta_fbp text;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS meta_fbc text;
