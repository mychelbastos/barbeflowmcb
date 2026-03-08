import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const META_API_VERSION = "v21.0";

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value.trim().toLowerCase());
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const PIXEL_ID = Deno.env.get("META_PIXEL_ID");
    const ACCESS_TOKEN = Deno.env.get("META_CAPI_ACCESS_TOKEN");

    if (!PIXEL_ID || !ACCESS_TOKEN) {
      console.error("[CAPI] Missing META_PIXEL_ID or META_CAPI_ACCESS_TOKEN");
      return new Response(JSON.stringify({ error: "Missing config" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      event_name,
      event_id,
      event_source_url,
      user_agent,
      fbp,
      fbc,
      user_data = {},
      custom_data = {},
    } = body;

    if (!event_name || !event_id) {
      return new Response(JSON.stringify({ error: "event_name and event_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build user_data with hashed PII
    const metaUserData: Record<string, any> = {};

    if (fbp) metaUserData.fbp = fbp;
    if (fbc) metaUserData.fbc = fbc;
    if (user_agent) metaUserData.client_user_agent = user_agent;

    // Get client IP from request headers
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip");
    if (clientIp) metaUserData.client_ip_address = clientIp;

    // Hash PII fields
    if (user_data.email) metaUserData.em = [await sha256(user_data.email)];
    if (user_data.phone) {
      const phone = user_data.phone.replace(/\D/g, "");
      metaUserData.ph = [await sha256(phone.startsWith("55") ? phone : `55${phone}`)];
    }
    if (user_data.first_name) metaUserData.fn = [await sha256(user_data.first_name)];
    if (user_data.external_id) metaUserData.external_id = [await sha256(user_data.external_id)];

    metaUserData.country = [await sha256("br")];

    // Build event payload
    const eventPayload = {
      data: [
        {
          event_name,
          event_time: Math.floor(Date.now() / 1000),
          event_id,
          event_source_url,
          action_source: "website",
          user_data: metaUserData,
          custom_data: Object.keys(custom_data).length > 0 ? custom_data : undefined,
        },
      ],
    };

    // Send to Meta CAPI
    const metaUrl = `https://graph.facebook.com/${META_API_VERSION}/${PIXEL_ID}/events?access_token=${ACCESS_TOKEN}`;
    const metaRes = await fetch(metaUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(eventPayload),
    });

    const metaBody = await metaRes.text();

    // Log to meta_events_log
    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabase.from("meta_events_log").insert({
        event_name,
        event_id,
        event_source: "server",
        action_source: "website",
        event_source_url,
        client_user_agent: user_agent,
        client_ip: clientIp,
        fbp,
        fbc,
        external_id: user_data.external_id || null,
        user_email_hash: metaUserData.em?.[0] || null,
        user_phone_hash: metaUserData.ph?.[0] || null,
        custom_data,
        meta_response_status: metaRes.status,
        meta_response_body: metaBody.substring(0, 500),
      });
    } catch (logErr) {
      console.warn("[CAPI] Log insert failed:", logErr);
    }

    return new Response(
      JSON.stringify({ success: metaRes.ok, status: metaRes.status }),
      {
        status: metaRes.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[CAPI] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
