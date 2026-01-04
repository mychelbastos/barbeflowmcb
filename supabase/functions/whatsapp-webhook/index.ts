import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Webhook received:", JSON.stringify(payload, null, 2));

    // Evolution API webhook payload structure
    const { event, instance, data } = payload;

    // Handle messages.upsert event (new messages)
    if (event === "messages.upsert") {
      const message = data.message || data;
      
      // Get the instance name to find the tenant
      const instanceName = instance || payload.instance;
      
      if (!instanceName) {
        console.log("No instance name in payload");
        return new Response(JSON.stringify({ success: true, skipped: "no instance" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the tenant by instance name
      const { data: connection, error: connError } = await supabase
        .from("whatsapp_connections")
        .select("tenant_id")
        .eq("evolution_instance_name", instanceName)
        .single();

      if (connError || !connection) {
        console.log("Tenant not found for instance:", instanceName);
        return new Response(JSON.stringify({ success: true, skipped: "tenant not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Extract message details
      const key = message.key || {};
      const messageId = key.id;
      const remoteJid = key.remoteJid;
      const fromMe = key.fromMe || false;
      
      // Get message content
      let content = "";
      let messageType = "text";
      let mediaUrl = null;

      if (message.message) {
        const msg = message.message;
        if (msg.conversation) {
          content = msg.conversation;
        } else if (msg.extendedTextMessage?.text) {
          content = msg.extendedTextMessage.text;
        } else if (msg.imageMessage) {
          messageType = "image";
          content = msg.imageMessage.caption || "[Imagem]";
          mediaUrl = msg.imageMessage.url;
        } else if (msg.audioMessage) {
          messageType = "audio";
          content = "[Áudio]";
        } else if (msg.videoMessage) {
          messageType = "video";
          content = msg.videoMessage.caption || "[Vídeo]";
        } else if (msg.documentMessage) {
          messageType = "document";
          content = msg.documentMessage.fileName || "[Documento]";
        }
      }

      // Skip if no message ID or remote JID
      if (!messageId || !remoteJid) {
        console.log("Missing messageId or remoteJid");
        return new Response(JSON.stringify({ success: true, skipped: "missing data" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Skip status messages
      if (remoteJid === "status@broadcast") {
        return new Response(JSON.stringify({ success: true, skipped: "status broadcast" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get message timestamp
      const messageTimestamp = message.messageTimestamp 
        ? new Date(Number(message.messageTimestamp) * 1000).toISOString()
        : new Date().toISOString();

      // Insert message into database
      const { error: insertError } = await supabase
        .from("whatsapp_messages")
        .upsert({
          tenant_id: connection.tenant_id,
          remote_jid: remoteJid,
          message_id: messageId,
          from_me: fromMe,
          message_type: messageType,
          content: content,
          media_url: mediaUrl,
          timestamp: messageTimestamp,
          status: fromMe ? "sent" : "received",
        }, {
          onConflict: "tenant_id,message_id",
        });

      if (insertError) {
        console.error("Error inserting message:", insertError);
      } else {
        console.log("Message saved:", { messageId, remoteJid, fromMe, content: content.substring(0, 50) });
      }
    }

    // Handle message status updates
    if (event === "messages.update") {
      console.log("Message status update:", data);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
