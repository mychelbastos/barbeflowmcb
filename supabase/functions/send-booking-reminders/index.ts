import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Two reminder windows with buffer
const REMINDER_WINDOWS = [
  { label: "24h", hoursBefore: 24, bufferMinutes: 15 },
  { label: "1h", hoursBefore: 1, bufferMinutes: 10 },
];

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendWhatsAppNotification(bookingId: string, tenantId: string, reminderLabel: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify({
        type: reminderLabel === "24h" ? "booking_reminder_24h" : "booking_reminder",
        booking_id: bookingId,
        tenant_id: tenantId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send ${reminderLabel} reminder for booking ${bookingId}:`, errorText);
      return false;
    }

    const result = await response.json();
    console.log(`${reminderLabel} reminder sent for booking ${bookingId}:`, result);
    return true;
  } catch (error) {
    console.error(`Error sending ${reminderLabel} reminder for booking ${bookingId}:`, error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running send-booking-reminders (dual window)`);

    const results = {
      total: 0,
      sent: 0,
      failed: 0,
      bookingIds: [] as string[],
    };

    for (const window of REMINDER_WINDOWS) {
      const windowStart = new Date(now.getTime() + (window.hoursBefore * 60 - window.bufferMinutes) * 60000);
      const windowEnd = new Date(now.getTime() + (window.hoursBefore * 60 + window.bufferMinutes) * 60000);

      console.log(`[${window.label}] Looking for confirmed bookings between: ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

      // For 24h reminder: check reminder_sent = false
      // For 1h reminder: reminder_sent can be true (24h already sent) — use dedup via notification_log
      const query = supabase
        .from("bookings")
        .select("id, tenant_id, starts_at")
        .eq("status", "confirmed")
        .gte("starts_at", windowStart.toISOString())
        .lte("starts_at", windowEnd.toISOString());

      // For the 24h window, only pick bookings that haven't had any reminder
      if (window.label === "24h") {
        query.eq("reminder_sent", false);
      }

      const { data: bookings, error } = await query;

      if (error) {
        console.error(`[${window.label}] Error fetching bookings:`, error);
        continue;
      }

      if (!bookings || bookings.length === 0) {
        console.log(`[${window.label}] No bookings found`);
        continue;
      }

      console.log(`[${window.label}] Found ${bookings.length} bookings`);
      results.total += bookings.length;

      for (const booking of bookings) {
        // Dedup check: avoid sending same reminder type twice
        const dedupKey = `reminder_${window.label}_${booking.id}`;
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("dedup_key", dedupKey)
          .maybeSingle();

        if (existing) {
          console.log(`[${window.label}] Skipping duplicate for booking ${booking.id}`);
          continue;
        }

        const success = await sendWhatsAppNotification(booking.id, booking.tenant_id, window.label);

        if (success) {
          // Mark reminder_sent on first reminder (24h)
          if (window.label === "24h") {
            await supabase
              .from("bookings")
              .update({ reminder_sent: true })
              .eq("id", booking.id);
          }

          // Log for dedup
          await supabase.from("notification_log").upsert({
            tenant_id: booking.tenant_id,
            event_type: `booking_reminder_${window.label}`,
            dedup_key: dedupKey,
            booking_id: booking.id,
            sent_at: new Date().toISOString(),
          }, { onConflict: "dedup_key" });

          results.sent++;
          results.bookingIds.push(booking.id);
        } else {
          results.failed++;
        }
      }
    }

    console.log(`Reminders processed: ${results.sent} sent, ${results.failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        reminders_sent: results.sent,
        reminders_failed: results.failed,
        booking_ids: results.bookingIds,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-booking-reminders:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
