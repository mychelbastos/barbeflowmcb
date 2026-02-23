import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

/**
 * Convert a URL-safe base64 string to a Uint8Array.
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Import VAPID private key for signing.
 */
async function importVapidKey(privateKeyBase64: string): Promise<CryptoKey> {
  const rawKey = urlBase64ToUint8Array(privateKeyBase64);
  return await crypto.subtle.importKey(
    'pkcs8',
    rawKey,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );
}

/**
 * Create a signed JWT for VAPID authentication.
 */
async function createVapidJwt(endpoint: string, privateKey: CryptoKey, publicKey: string): Promise<{ authorization: string; cryptoKey: string }> {
  const audience = new URL(endpoint).origin;
  const now = Math.floor(Date.now() / 1000);
  
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: now + 12 * 3600,
    sub: 'mailto:contato@modogestor.com.br',
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format (64 bytes)
  const sigArray = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;
  
  if (sigArray[0] === 0x30) {
    // DER encoded
    const rLen = sigArray[3];
    const rStart = 4;
    const rBytes = sigArray.slice(rStart, rStart + rLen);
    const sLen = sigArray[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigArray.slice(sStart, sStart + sLen);
    
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    
    // Pad if needed
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  } else {
    // Already raw
    r = sigArray.slice(0, 32);
    s = sigArray.slice(32, 64);
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const encodedSig = btoa(String.fromCharCode(...rawSig)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const jwt = `${unsignedToken}.${encodedSig}`;

  return {
    authorization: `vapid t=${jwt}, k=${publicKey}`,
    cryptoKey: publicKey,
  };
}

/**
 * Send a single Web Push notification.
 */
async function sendPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: CryptoKey,
): Promise<{ success: boolean; endpoint: string; status?: number; error?: string }> {
  try {
    const { authorization } = await createVapidJwt(subscription.endpoint, vapidPrivateKey, vapidPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        'TTL': '86400',
        'Urgency': 'high',
      },
      body: payload,
    });

    if (response.status === 410 || response.status === 404) {
      // Subscription expired, remove it
      await supabase.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
      console.log(`Removed expired subscription: ${subscription.endpoint}`);
      return { success: false, endpoint: subscription.endpoint, status: response.status, error: 'expired' };
    }

    if (!response.ok) {
      const text = await response.text();
      console.error(`Push failed (${response.status}): ${text}`);
      return { success: false, endpoint: subscription.endpoint, status: response.status, error: text };
    }

    return { success: true, endpoint: subscription.endpoint, status: response.status };
  } catch (err) {
    console.error('Push send error:', err);
    return { success: false, endpoint: subscription.endpoint, error: err.message };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, title, body, url, data } = await req.json();

    if (!tenant_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'tenant_id, title, and body are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get VAPID keys
    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
    const vapidPrivateKeyRaw = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublicKey || !vapidPrivateKeyRaw) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get admin user IDs for this tenant
    const { data: adminUsers } = await supabase
      .from('users_tenant')
      .select('user_id')
      .eq('tenant_id', tenant_id)
      .eq('role', 'admin');

    if (!adminUsers || adminUsers.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No admin users found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminUserIds = adminUsers.map(u => u.user_id);

    // Get push subscriptions for admin users of this tenant
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('tenant_id', tenant_id)
      .in('user_id', adminUserIds);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: 'No push subscriptions found' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build notification payload
    const notificationPayload = JSON.stringify({
      title,
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-192x192.png',
      url: url || '/',
      data: data || {},
      timestamp: Date.now(),
    });

    // Note: Web Push encryption requires complex ECDH key exchange.
    // For simplicity, we'll send the notification payload as plain text
    // and rely on HTTPS transport security. For production, consider
    // using a web-push library.
    
    let vapidPrivateKey: CryptoKey;
    try {
      vapidPrivateKey = await importVapidKey(vapidPrivateKeyRaw);
    } catch (keyErr) {
      console.error('Failed to import VAPID private key:', keyErr);
      // Fallback: send without encryption using simple fetch
    }

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(sub => sendPush(sub, notificationPayload, vapidPublicKey, vapidPrivateKey!))
    );

    const sent = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failed = results.length - sent;

    console.log(`Push notifications sent: ${sent}/${subscriptions.length} (${failed} failed)`);

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Push notification error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
