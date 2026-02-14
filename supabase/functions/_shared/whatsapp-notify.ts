import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface WhatsAppPayload {
  type: string;
  phone: string;
  message: string;
  evolution_instance: string;
  tenant_id: string;
  tenant_slug: string;
  // Rich context
  subscription_id?: string;
  booking_id?: string;
  customer_name?: string;
  plan_name?: string;
  amount_cents?: number;
  period_end?: string;
  status?: string;
}

interface NotifyOptions {
  supabase: ReturnType<typeof createClient>;
  tenantId: string;
  phone: string;
  message: string;
  eventType: string;
  tenantSlug?: string;
  // Deduplication
  dedupKey?: string;
  // Rich context for N8N
  extra?: Record<string, any>;
}

/**
 * Formats a BR phone number: strips non-digits and prepends 55 if needed.
 */
export function formatBrPhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (!digits.startsWith('55')) digits = '55' + digits;
  return digits;
}

/**
 * Formats cents to BRL currency string.
 */
export function formatBRL(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2)}`;
}

/**
 * Check if a notification with the given dedupKey was already sent.
 * Returns true if already sent (should skip).
 */
async function isDuplicate(supabase: any, dedupKey: string): Promise<boolean> {
  const { data } = await supabase
    .from('notification_log')
    .select('id')
    .eq('dedup_key', dedupKey)
    .maybeSingle();
  return !!data;
}

/**
 * Record that a notification was sent (for dedup).
 */
async function recordNotification(
  supabase: any,
  opts: {
    tenantId: string;
    eventType: string;
    dedupKey: string;
    customerId?: string;
    subscriptionId?: string;
    bookingId?: string;
  }
): Promise<void> {
  await supabase.from('notification_log').upsert({
    tenant_id: opts.tenantId,
    event_type: opts.eventType,
    dedup_key: opts.dedupKey,
    customer_id: opts.customerId || null,
    subscription_id: opts.subscriptionId || null,
    booking_id: opts.bookingId || null,
    sent_at: new Date().toISOString(),
  }, { onConflict: 'dedup_key' });
}

/**
 * Central function to send a WhatsApp notification via N8N webhook.
 * Handles: WhatsApp connection lookup, phone formatting, deduplication, and payload construction.
 */
export async function sendWhatsAppNotification(opts: NotifyOptions): Promise<boolean> {
  const { supabase, tenantId, phone, message, eventType, tenantSlug, dedupKey, extra } = opts;

  try {
    // Deduplication check
    if (dedupKey) {
      const alreadySent = await isDuplicate(supabase, dedupKey);
      if (alreadySent) {
        console.log(`[WA-NOTIFY] Skipped duplicate: ${eventType} key=${dedupKey}`);
        return false;
      }
    }

    // Check WhatsApp connection
    const { data: whatsappConn } = await supabase
      .from('whatsapp_connections')
      .select('evolution_instance_name, whatsapp_connected')
      .eq('tenant_id', tenantId)
      .eq('whatsapp_connected', true)
      .maybeSingle();

    if (!whatsappConn) {
      console.log(`[WA-NOTIFY] No WhatsApp connection for tenant ${tenantId}, skipping`);
      return false;
    }

    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!n8nWebhookUrl) {
      console.log('[WA-NOTIFY] N8N_WEBHOOK_URL not configured, skipping');
      return false;
    }

    const formattedPhone = formatBrPhone(phone);

    const payload: WhatsAppPayload = {
      type: eventType,
      phone: formattedPhone,
      message,
      evolution_instance: whatsappConn.evolution_instance_name,
      tenant_id: tenantId,
      tenant_slug: tenantSlug || '',
      ...extra,
    };

    const resp = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    console.log(`[WA-NOTIFY] ${eventType} sent to ${formattedPhone}, status: ${resp.status}`);

    // Record for dedup
    if (dedupKey) {
      await recordNotification(supabase, {
        tenantId,
        eventType,
        dedupKey,
        customerId: extra?.customer_id,
        subscriptionId: extra?.subscription_id,
        bookingId: extra?.booking_id,
      });
    }

    return resp.ok;
  } catch (err) {
    console.error(`[WA-NOTIFY] Error sending ${eventType}:`, err);
    return false;
  }
}

/**
 * Helper to send subscription-related WhatsApp notifications.
 * Extracts customer/plan data from a subscription record that includes joins.
 */
export async function sendSubscriptionNotification(
  supabase: any,
  subscription: any,
  eventType: string,
  message: string,
  dedupKey?: string,
): Promise<boolean> {
  const customer = subscription.customer;
  const plan = subscription.plan;
  const tenantName = plan?.tenant?.name || 'modoGESTOR';
  const tenantSlug = plan?.tenant?.slug || '';

  if (!customer?.phone || !plan) {
    console.log(`[WA-NOTIFY] Missing customer/plan data for ${eventType}`);
    return false;
  }

  return sendWhatsAppNotification({
    supabase,
    tenantId: subscription.tenant_id,
    phone: customer.phone,
    message,
    eventType,
    tenantSlug,
    dedupKey,
    extra: {
      subscription_id: subscription.id,
      customer_id: subscription.customer_id,
      customer_name: customer.name,
      plan_name: plan.name,
      amount_cents: plan.price_cents,
    },
  });
}
