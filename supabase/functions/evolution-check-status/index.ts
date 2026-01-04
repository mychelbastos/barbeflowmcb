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
        JSON.stringify({ 
          connected: false, 
          has_instance: false,
          message: "No WhatsApp instance configured" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = connection.evolution_instance_name;
    console.log(`Checking status for instance: ${instanceName}`);

    // Check instance status in Evolution API
    const statusResponse = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    const statusResult = await statusResponse.text();
    console.log("Evolution status response:", statusResponse.status, statusResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(statusResult);
    } catch {
      parsedResult = { raw: statusResult };
    }

    const state = parsedResult?.instance?.state || parsedResult?.state || "disconnected";
    const isConnected = state === "open" || state === "connected";

    // Get phone number if connected
    let phoneNumber = connection.whatsapp_number;
    if (isConnected && !phoneNumber) {
      try {
        const profileResponse = await fetch(`${EVOLUTION_API_URL}/instance/fetchInstances`, {
          method: "GET",
          headers: {
            "apikey": EVOLUTION_API_KEY,
          },
        });
        const instances = await profileResponse.json();
        const instance = instances?.find?.((i: any) => i.name === instanceName);
        if (instance?.ownerJid) {
          phoneNumber = instance.ownerJid.split("@")[0];
        }
      } catch (e) {
        console.error("Failed to fetch phone number:", e);
      }
    }

    // Update database with current status
    const updateData: Record<string, any> = {
      whatsapp_connected: isConnected,
      last_status: state,
      last_status_at: new Date().toISOString(),
    };

    if (isConnected && !connection.connected_at) {
      updateData.connected_at = new Date().toISOString();
    }

    if (phoneNumber && phoneNumber !== connection.whatsapp_number) {
      updateData.whatsapp_number = phoneNumber;
    }

    await supabase
      .from("whatsapp_connections")
      .update(updateData)
      .eq("tenant_id", tenant_id);

    return new Response(
      JSON.stringify({ 
        connected: isConnected,
        has_instance: true,
        state: state,
        instance_name: instanceName,
        whatsapp_number: phoneNumber,
        connected_at: connection.connected_at,
        last_status_at: updateData.last_status_at
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in evolution-check-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
