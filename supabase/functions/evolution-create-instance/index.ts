import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EVOLUTION_API_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_API_KEY = Deno.env.get("EVOLUTION_API_KEY");

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tenant_id, tenant_slug } = await req.json();

    if (!tenant_id || !tenant_slug) {
      return new Response(
        JSON.stringify({ error: "tenant_id and tenant_slug are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      console.error("Evolution API not configured");
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique instance name based on tenant slug
    const instanceName = `bf_${tenant_slug.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    console.log(`Creating/reusing Evolution instance: ${instanceName}`);

    // Check if connection already exists in database
    const { data: existingConnection } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (existingConnection) {
      console.log(`Connection already exists for tenant ${tenant_id}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          instance_name: existingConnection.evolution_instance_name,
          already_exists: true 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create instance in Evolution API
    const evolutionResponse = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        instanceName: instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
      }),
    });

    const evolutionResult = await evolutionResponse.text();
    console.log("Evolution create response:", evolutionResponse.status, evolutionResult);

    // If instance already exists in Evolution, that's fine - we'll just use it
    let parsedResult;
    try {
      parsedResult = JSON.parse(evolutionResult);
    } catch {
      parsedResult = { message: evolutionResult };
    }

    // Check if error is "instance already exists" - that's acceptable
    const instanceExists = parsedResult?.error?.includes?.("already") || 
                          parsedResult?.message?.includes?.("already") ||
                          evolutionResponse.status === 409;

    if (!evolutionResponse.ok && !instanceExists) {
      console.error("Failed to create Evolution instance:", parsedResult);
      return new Response(
        JSON.stringify({ error: "Failed to create WhatsApp instance", details: parsedResult }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save connection to database
    const { error: insertError } = await supabase
      .from("whatsapp_connections")
      .insert({
        tenant_id,
        evolution_instance_name: instanceName,
        whatsapp_connected: false,
        last_status: "disconnected",
      });

    if (insertError) {
      console.error("Failed to save connection:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save connection", details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Successfully created instance ${instanceName} for tenant ${tenant_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        instance_name: instanceName,
        already_exists: instanceExists
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in evolution-create-instance:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
