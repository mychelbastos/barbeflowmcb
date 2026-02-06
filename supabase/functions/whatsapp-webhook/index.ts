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

// Forward config
const N8N_WEBHOOK_URL = Deno.env.get("N8N_WHATSAPP_INCOMING_WEBHOOK_URL");
const N8N_WEBHOOK_TOKEN = Deno.env.get("N8N_WHATSAPP_INCOMING_TOKEN");

/**
 * Forward inbound text message to n8n webhook.
 * Fire-and-forget with short timeout — never breaks the main flow.
 */
async function forwardToN8n(payload: {
  instance: string;
  tenant_id: string;
  remote_jid: string;
  message_id: string;
  text: string;
  raw: unknown;
}) {
  if (!N8N_WEBHOOK_URL) {
    console.log("N8N_WHATSAPP_INCOMING_WEBHOOK_URL not configured, skipping forward");
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5s timeout

    const response = await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(N8N_WEBHOOK_TOKEN ? { "x-bf-token": N8N_WEBHOOK_TOKEN } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    console.log("Forward to n8n:", response.status);
  } catch (error) {
    // Never let forward errors break the webhook
    console.error("Forward to n8n failed (non-blocking):", error.message || error);
  }
}

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

    // Handle messages.upsert and send.message events (new messages)
    const isNewMessageEvent = 
      event === "messages.upsert" || 
      event === "MESSAGES_UPSERT" || 
      event === "send.message" ||
      event === "SEND_MESSAGE";
    
    if (isNewMessageEvent) {
      console.log("Processing new message event:", event, "data:", JSON.stringify(data, null, 2).substring(0, 500));
      
      // Evolution API v2 structure: data can be an array or single object
      const messages = Array.isArray(data) ? data : [data];
      
      for (const messageData of messages) {
        console.log("Processing messageData keys:", Object.keys(messageData));
        
        // Evolution API structure: key is directly in data, message content is in data.message
        const key = messageData.key || {};
        const messageId = key.id;
        const remoteJid = key.remoteJid;
        const fromMe = key.fromMe ?? false;
        
        console.log("Extracted key data:", { messageId, remoteJid, fromMe });
        
        // Skip if no message ID or remote JID
        if (!messageId || !remoteJid) {
          console.log("Missing messageId or remoteJid, skipping. Key:", JSON.stringify(key));
          continue;
        }

        // Skip status messages
        if (remoteJid === "status@broadcast") {
          console.log("Skipping status broadcast");
          continue;
        }

        // Get message content - Evolution API puts it in data.message
        let content = "";
        let messageType = "text";
        let mediaUrl = null;

        const msgContent = messageData.message;
        console.log("Message content type:", typeof msgContent, "keys:", msgContent ? Object.keys(msgContent) : "null");
        
        if (msgContent) {
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

        // Use pushName if no content extracted
        if (!content && messageData.pushName) {
          content = `[Mensagem de ${messageData.pushName}]`;
        }

        // Get message timestamp
        const timestamp = messageData.messageTimestamp;
        const messageTimestampDate = timestamp
          ? new Date(Number(timestamp) * 1000).toISOString()
          : new Date().toISOString();

        console.log("Saving message:", { 
          messageId, 
          remoteJid, 
          fromMe, 
          content: content.substring(0, 50), 
          messageType,
          timestamp: messageTimestampDate
        });

        // Insert message into database
        const { error: insertError, data: upsertResult, count } = await supabase
          .from("whatsapp_messages")
          .upsert({
            tenant_id: connection.tenant_id,
            remote_jid: remoteJid,
            message_id: messageId,
            from_me: fromMe,
            message_type: messageType,
            content: content || "[Mensagem sem conteúdo]",
            media_url: mediaUrl,
            timestamp: messageTimestampDate,
            status: fromMe ? "sent" : "received",
          }, {
            onConflict: "tenant_id,message_id",
            ignoreDuplicates: false,
            count: "exact",
          })
          .select("created_at");

        if (insertError) {
          console.error("Error inserting message:", insertError);
        } else {
          console.log("Message saved successfully:", messageId);

          // --- FORWARD TO N8N ---
          // Only forward inbound text messages from clients (not fromMe)
          // Only forward on new inserts (deduplicate by checking if created_at ~ now)
          const isInbound = !fromMe;
          const isTextMessage = messageType === "text" && content && !content.startsWith("[");
          const isMessagesUpsert = event === "messages.upsert" || event === "MESSAGES_UPSERT";

          if (isInbound && isTextMessage && isMessagesUpsert) {
            // Deduplication: check if record was just created (within last 5 seconds)
            // If the upsert returned data, compare created_at to now
            let isNewRecord = true;
            if (upsertResult && upsertResult.length > 0) {
              const createdAt = new Date(upsertResult[0].created_at).getTime();
              const now = Date.now();
              // If created_at is more than 10 seconds old, this was an existing record (update, not insert)
              isNewRecord = (now - createdAt) < 10000;
            }

            if (isNewRecord) {
              console.log("Forwarding inbound text to n8n:", { messageId, remoteJid });
              // Fire-and-forget: don't await to avoid delaying the response
              forwardToN8n({
                instance: instanceName,
                tenant_id: connection.tenant_id,
                remote_jid: remoteJid,
                message_id: messageId,
                text: content,
                raw: messageData,
              });
            } else {
              console.log("Skipping forward (duplicate message):", messageId);
            }
          }
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
