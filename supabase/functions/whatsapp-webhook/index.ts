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
    const instanceName = instance || payload.instance;

    console.log("Event type:", event, "Instance:", instanceName);

    // Find the tenant by instance name
    if (!instanceName) {
      console.log("No instance name in payload");
      return new Response(JSON.stringify({ success: true, skipped: "no instance" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: connection, error: connError } = await supabase
      .from("whatsapp_connections")
      .select("tenant_id")
      .eq("evolution_instance_name", instanceName)
      .single();

    if (connError || !connection) {
      console.log("Tenant not found for instance:", instanceName, connError);
      return new Response(JSON.stringify({ success: true, skipped: "tenant not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Found tenant:", connection.tenant_id);

    // Handle messages.upsert event (new messages)
    if (event === "messages.upsert" || event === "MESSAGES_UPSERT") {
      console.log("Processing messages.upsert event");
      
      // Evolution API v2 structure: data can be an array or object
      const messages = Array.isArray(data) ? data : [data];
      
      for (const messageData of messages) {
        // Handle both nested and flat message structures
        const message = messageData.message || messageData;
        const key = message.key || messageData.key || {};
        
        const messageId = key.id || messageData.id;
        const remoteJid = key.remoteJid || messageData.remoteJid;
        const fromMe = key.fromMe ?? messageData.fromMe ?? false;
        
        console.log("Processing message:", { messageId, remoteJid, fromMe });
        
        // Get message content
        let content = "";
        let messageType = "text";
        let mediaUrl = null;

        const msgContent = message.message || messageData.message || message;
        
        if (typeof msgContent === 'string') {
          content = msgContent;
        } else if (msgContent) {
          if (msgContent.conversation) {
            content = msgContent.conversation;
          } else if (msgContent.extendedTextMessage?.text) {
            content = msgContent.extendedTextMessage.text;
          } else if (msgContent.imageMessage) {
            messageType = "image";
            content = msgContent.imageMessage.caption || "[Imagem]";
            mediaUrl = msgContent.imageMessage.url;
          } else if (msgContent.audioMessage) {
            messageType = "audio";
            content = "[Áudio]";
          } else if (msgContent.videoMessage) {
            messageType = "video";
            content = msgContent.videoMessage.caption || "[Vídeo]";
          } else if (msgContent.documentMessage) {
            messageType = "document";
            content = msgContent.documentMessage.fileName || "[Documento]";
          }
        }

        // Try to get content from pushName or other fields
        if (!content && messageData.pushName) {
          content = `[Mensagem de ${messageData.pushName}]`;
        }

        // Skip if no message ID or remote JID
        if (!messageId || !remoteJid) {
          console.log("Missing messageId or remoteJid, skipping");
          continue;
        }

        // Skip status messages
        if (remoteJid === "status@broadcast") {
          console.log("Skipping status broadcast");
          continue;
        }

        // Get message timestamp
        const messageTimestamp = message.messageTimestamp || messageData.messageTimestamp
          ? new Date(Number(message.messageTimestamp || messageData.messageTimestamp) * 1000).toISOString()
          : new Date().toISOString();

        console.log("Saving message:", { messageId, remoteJid, fromMe, content: content.substring(0, 50), messageType });

        // Insert message into database
        const { error: insertError } = await supabase
          .from("whatsapp_messages")
          .upsert({
            tenant_id: connection.tenant_id,
            remote_jid: remoteJid,
            message_id: messageId,
            from_me: fromMe,
            message_type: messageType,
            content: content || "[Mensagem sem conteúdo]",
            media_url: mediaUrl,
            timestamp: messageTimestamp,
            status: fromMe ? "sent" : "received",
          }, {
            onConflict: "tenant_id,message_id",
          });

        if (insertError) {
          console.error("Error inserting message:", insertError);
        } else {
          console.log("Message saved successfully:", messageId);
        }
      }
    }

    // Handle message status updates
    if (event === "messages.update" || event === "MESSAGES_UPDATE") {
      console.log("Message status update:", data);
      // Could update message status in database here if needed
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
