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

    // Verify user
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

    // Get tenant
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

    const tenantId = ut.tenant_id;

    // Check subscription is profissional
    const { data: sub } = await supabase
      .from("stripe_subscriptions")
      .select("plan_name, status")
      .eq("tenant_id", tenantId)
      .in("status", ["active", "trialing"])
      .single();

    if (!sub || sub.plan_name !== "profissional") {
      return new Response(JSON.stringify({ error: "Professional plan required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { domain } = await req.json();
    if (!domain || typeof domain !== "string") {
      return new Response(JSON.stringify({ error: "Domain is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Clean domain
    const cleanDomain = domain
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/.*$/, "")
      .trim();

    if (!cleanDomain || cleanDomain.includes(" ") || !cleanDomain.includes(".")) {
      return new Response(JSON.stringify({ error: "Invalid domain format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Call Cloudflare API
    const cfResponse = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          hostname: cleanDomain,
          ssl: {
            method: "http",
            type: "dv",
            settings: {
              http2: "on",
              min_tls_version: "1.2",
            },
          },
        }),
      }
    );

    const cfData = await cfResponse.json();

    if (!cfData.success) {
      console.error("Cloudflare error:", JSON.stringify(cfData.errors));
      return new Response(
        JSON.stringify({
          error: "Failed to register domain with Cloudflare",
          details: cfData.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const hostname = cfData.result;

    // Register domain in Vercel (both projects)
    const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
    const vercelProjectApp = Deno.env.get("VERCEL_PROJECT_ID_APP");
    const vercelProjectSite = Deno.env.get("VERCEL_PROJECT_ID_SITE");

    if (vercelToken) {
      const vercelProjects = [vercelProjectApp, vercelProjectSite].filter(Boolean);
      for (const projectId of vercelProjects) {
        try {
          const vercelRes = await fetch(
            `https://api.vercel.com/v10/projects/${projectId}/domains`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${vercelToken}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ name: cleanDomain }),
            }
          );
          const vercelData = await vercelRes.json();
          if (!vercelRes.ok) {
            console.error(`Vercel domain error (project ${projectId}):`, JSON.stringify(vercelData));
          } else {
            console.log(`Vercel domain added (project ${projectId}):`, cleanDomain);
          }
        } catch (vercelErr) {
          console.error(`Vercel API error (project ${projectId}):`, vercelErr);
        }
      }
    }

    // Save to database
    const { error: dbError } = await supabase
      .from("tenants")
      .update({
        custom_domain: cleanDomain,
        cloudflare_status: "pending",
        cloudflare_hostname_id: hostname.id,
      })
      .eq("id", tenantId);

    if (dbError) {
      console.error("DB error:", dbError);
      // Try to clean up Cloudflare
      await fetch(
        `https://api.cloudflare.com/client/v4/zones/${cfZoneId}/custom_hostnames/${hostname.id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${cfToken}` },
        }
      );
      return new Response(JSON.stringify({ error: "Failed to save domain" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract verification records
    const verificationRecords = hostname.ownership_verification || {};
    const sslValidation = hostname.ssl?.validation_records || [];

    return new Response(
      JSON.stringify({
        success: true,
        domain: cleanDomain,
        hostname_id: hostname.id,
        status: hostname.status,
        verification: verificationRecords,
        ssl_validation: sslValidation,
        dns_records: [
          {
            type: "CNAME",
            name: cleanDomain,
            value: hostname.custom_origin_server || "modogestor.com.br",
            description: "Aponte seu domínio para nosso servidor",
          },
          ...(verificationRecords.name
            ? [
                {
                  type: verificationRecords.type || "TXT",
                  name: verificationRecords.name,
                  value: verificationRecords.value,
                  description: "Registro de verificação de propriedade",
                },
              ]
            : []),
          ...sslValidation.map((r: any) => ({
            type: r.txt_name ? "TXT" : "CNAME",
            name: r.txt_name || r.cname,
            value: r.txt_value || r.cname_target,
            description: "Registro de validação SSL",
          })),
        ],
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
