import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

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
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error('VAPID keys not configured');
      return new Response(
        JSON.stringify({ error: 'VAPID keys not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Configure web-push with VAPID details
    webpush.setVapidDetails(
      'mailto:contato@modogestor.com.br',
      vapidPublicKey,
      vapidPrivateKey
    );

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

    // Send to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          },
        };

        try {
          await webpush.sendNotification(pushSubscription, notificationPayload);
          return { success: true, endpoint: sub.endpoint };
        } catch (err: any) {
          // 410 Gone or 404 = subscription expired, clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            console.log(`Removed expired subscription: ${sub.endpoint}`);
          }
          console.error(`Push failed for ${sub.endpoint}: ${err.statusCode || err.message}`);
          return { success: false, endpoint: sub.endpoint, error: err.message };
        }
      })
    );

    const sent = results.filter(r => r.status === 'fulfilled' && (r.value as any).success).length;
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
