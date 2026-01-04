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
      console.error("Connection not found:", fetchError);
      return new Response(
        JSON.stringify({ error: "WhatsApp connection not found. Please create instance first." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const instanceName = connection.evolution_instance_name;
    console.log(`Getting QR code for instance: ${instanceName}`);

    // First, try to connect the instance to generate QR code
    const connectResponse = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: "GET",
      headers: {
        "apikey": EVOLUTION_API_KEY,
      },
    });

    const connectResult = await connectResponse.text();
    console.log("Evolution connect response:", connectResponse.status, connectResult);

    let parsedResult;
    try {
      parsedResult = JSON.parse(connectResult);
    } catch {
      parsedResult = { raw: connectResult };
    }

    // Check if already connected
    if (parsedResult?.instance?.state === "open" || parsedResult?.state === "open") {
      // Update database status
      await supabase
        .from("whatsapp_connections")
        .update({
          whatsapp_connected: true,
          last_status: "connected",
          last_status_at: new Date().toISOString(),
          connected_at: connection.connected_at || new Date().toISOString(),
        })
        .eq("tenant_id", tenant_id);

      return new Response(
        JSON.stringify({ 
          connected: true, 
          message: "WhatsApp already connected",
          instance: parsedResult?.instance || parsedResult
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract QR code
    const qrCode = parsedResult?.base64 || parsedResult?.qrcode?.base64 || parsedResult?.code;
    const pairingCode = parsedResult?.pairingCode;

    if (!qrCode && !pairingCode) {
      console.log("No QR code available, instance may need restart");
      return new Response(
        JSON.stringify({ 
          error: "QR code not available. Try reconnecting.",
          details: parsedResult
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        qrcode: qrCode,
        pairingCode: pairingCode,
        instance_name: instanceName
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in evolution-get-qrcode:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
