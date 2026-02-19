import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const cfToken = Deno.env.get("CLOUDFLARE_API_TOKEN")!;
    const cfZoneId = Deno.env.get("CLOUDFLARE_ZONE_ID")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!);
    const { data: { user }, error: authError } = await anonClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ut } = await supabase
      .from("users_tenant")
      .select("tenant_id, role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();

    if (!ut) {
      return new Response(JSON.stringify({ error: "Not an admin" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: tenant } = await supabase
      .from("tenants")
      .select("cloudflare_hostname_id, custom_domain")
      .eq("id", ut.tenant_id)
      .single();

    if (tenant?.cloudflare_hostname_id) {
      // Delete from Cloudflare
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${tenant.cloudflare_hostname_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${cfToken}` },
        }
      );
    }

    // Remove domain from Vercel (both projects)
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectApp = Deno.env.get("VERCEL_PROJECT_ID_APP");
    const vercelProjectSite = Deno.env.get("VERCEL_PROJECT_ID_SITE");

    if (vercelToken && tenant?.custom_domain) {
      const vercelProjects = [vercelProjectApp, vercelProjectSite].filter(Boolean);
      for (const projectId of vercelProjects) {
        try {
          await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/domains/${tenant.custom_domain}`,
            {
              method: "DELETE",
              headers: { Authorization: `Bearer ${vercelToken}` },
            }
          );
          console.log(`Vercel domain removed (project ${projectId}):`, tenant.custom_domain);
        } catch (vercelErr) {
          console.error(`Vercel API error (project ${projectId}):`, vercelErr);
        }
      }
    }

    // Clear DB
    const { error: dbError } = await supabase
      .from("tenants")
      .update({
        custom_domain: null,
        cloudflare_status: "none",
        cloudflare_hostname_id: null,
      })
      .eq("id", ut.tenant_id);

    if (dbError) {
      console.error("DB error:", dbError);
      return new Response(JSON.stringify({ error: "Failed to clear domain" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
