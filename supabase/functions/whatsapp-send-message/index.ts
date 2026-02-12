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
    const { tenant_id, phone, message, audio_base64, media_type } = await req.json();
    console.log("Send message request:", { tenant_id, phone, hasMessage: !!message, hasAudio: !!audio_base64 });

    if (!tenant_id || !phone || (!message && !audio_base64)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: tenant_id, phone, and message or audio_base64" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the WhatsApp connection for this tenant
    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("whatsapp_connected", true)
      .single();

    if (connError || !connection) {
      console.error("Connection not found:", connError);
      return new Response(
        JSON.stringify({ error: "WhatsApp not connected for this tenant" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format phone number
    let formattedPhone = phone.replace(/\D/g, "");
    if (!formattedPhone.startsWith("55")) {
      formattedPhone = "55" + formattedPhone;
    }

    const remoteJid = `${formattedPhone}@s.whatsapp.net`;
    let evolutionResult: any;
    let messageType = "text";
    let content = message || "[Áudio]";

    if (audio_base64) {
      // Send audio message
      messageType = "audio";
      content = "[Áudio]";
      const evolutionUrl = `${EVOLUTION_API_URL}/message/sendWhatsAppAudio/${connection.evolution_instance_name}`;
      console.log("Sending audio to Evolution:", evolutionUrl);

      // Evolution API expects raw base64 string for audio
      const evolutionResponse = await fetch(evolutionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY!,
        },
        body: JSON.stringify({
          number: formattedPhone,
          audio: audio_base64,
          encoding: true,
        }),
      });

      evolutionResult = await evolutionResponse.json();
      console.log("Evolution audio response:", evolutionResponse.status);

      if (!evolutionResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to send audio", details: evolutionResult }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      // Send text message
      const evolutionUrl = `${EVOLUTION_API_URL}/message/sendText/${connection.evolution_instance_name}`;
      console.log("Sending to Evolution:", evolutionUrl);

      const evolutionResponse = await fetch(evolutionUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": EVOLUTION_API_KEY!,
        },
        body: JSON.stringify({
          number: formattedPhone,
          text: message,
        }),
      });

      evolutionResult = await evolutionResponse.json();
      console.log("Evolution response:", evolutionResponse.status);

      if (!evolutionResponse.ok) {
        return new Response(
          JSON.stringify({ error: "Failed to send message", details: evolutionResult }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Extract message ID from response
    const messageId = evolutionResult.key?.id || `sent_${Date.now()}`;

    // Save message to database
    const { error: insertError } = await supabase
      .from("whatsapp_messages")
      .insert({
        tenant_id: tenant_id,
        remote_jid: remoteJid,
        message_id: messageId,
        from_me: true,
        message_type: messageType,
        content: content,
        status: "sent",
        timestamp: new Date().toISOString(),
      });

    if (insertError) {
      console.error("Error saving message:", insertError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message_id: messageId,
        remote_jid: remoteJid 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Send message error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
