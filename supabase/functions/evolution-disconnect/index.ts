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
    const { tenant_id } = await req.json();

    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: "tenant_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Evolution API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get connection from database
    const { data: connection, error: fetchError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .maybeSingle();

    if (fetchError || !connection) {
      return new Response(
        JSON.stringify({ error: "WhatsApp connection not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = connection.evolution_instance_name;
    console.log(`Disconnecting instance: ${instanceName}`);

    // Logout from Evolution API (disconnect WhatsApp but keep instance)
    const logoutResponse = await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: "DELETE",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    const logoutResult = await logoutResponse.text();
    console.log("Evolution logout response:", logoutResponse.status, logoutResult);

    // Update database status
    await supabase
      .from("whatsapp_connections")
      .update({
        whatsapp_connected: false,
        last_status: "disconnected",
        last_status_at: new Date().toISOString(),
        whatsapp_number: null,
        connected_at: null,
      })
      .eq("tenant_id", tenant_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "WhatsApp disconnected successfully" 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in evolution-disconnect:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
