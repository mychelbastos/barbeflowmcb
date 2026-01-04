-- Create table for WhatsApp messages
CREATE TABLE public.whatsapp_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  remote_jid TEXT NOT NULL,
  message_id TEXT NOT NULL,
  from_me BOOLEAN NOT NULL DEFAULT false,
  message_type TEXT NOT NULL DEFAULT 'text',
  content TEXT,
  media_url TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT DEFAULT 'sent',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_id, message_id)
);

-- Create indexes for faster queries
CREATE INDEX idx_whatsapp_messages_tenant_jid ON public.whatsapp_messages(tenant_id, remote_jid);
CREATE INDEX idx_whatsapp_messages_timestamp ON public.whatsapp_messages(timestamp DESC);

-- Enable RLS
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

-- Policy for users who belong to tenant to view messages
CREATE POLICY "Users can view their tenant messages"
ON public.whatsapp_messages
FOR SELECT
USING (user_belongs_to_tenant(tenant_id));

-- Policy for users who belong to tenant to insert messages
CREATE POLICY "Users can insert tenant messages"
ON public.whatsapp_messages
FOR INSERT
WITH CHECK (user_belongs_to_tenant(tenant_id));