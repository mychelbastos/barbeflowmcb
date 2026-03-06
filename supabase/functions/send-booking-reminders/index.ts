import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log(`[${now.toISOString()}] Running send-booking-reminders (sweep mode)`);

    const results = {
      total: 0,
      sent: 0,
      failed: 0,
      bookingIds: [] as string[],
    };

    // ============================
    // 24h SWEEP: all confirmed bookings starting within next 24h
    // that haven't had a 24h reminder yet
    // ============================
    const now24h = new Date(now.getTime() + 24 * 60 * 60000);

    console.log(`[24h] Sweeping confirmed bookings between ${now.toISOString()} and ${now24h.toISOString()} with reminder_sent=false`);

    const { data: bookings24h, error: err24h } = await supabase
      .from("bookings")
      .select("id, tenant_id, starts_at")
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("starts_at", now.toISOString())
      .lte("starts_at", now24h.toISOString());

    if (err24h) {
      console.error("[24h] Error fetching bookings:", err24h);
    } else if (bookings24h && bookings24h.length > 0) {
      console.log(`[24h] Found ${bookings24h.length} bookings to check`);
      results.total += bookings24h.length;

      for (const booking of bookings24h) {
        const dedupKey = `reminder_24h_${booking.id}`;
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("dedup_key", dedupKey)
          .maybeSingle();

        if (existing) {
          console.log(`[24h] Skipping duplicate for booking ${booking.id}`);
          continue;
        }

        const success = await sendWhatsAppNotification(booking.id, booking.tenant_id, "24h");

        if (success) {
          await supabase
            .from("bookings")
            .update({ reminder_sent: true })
            .eq("id", booking.id);

          await supabase.from("notification_log").upsert({
            tenant_id: booking.tenant_id,
            event_type: "booking_reminder_24h",
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
    } else {
      console.log("[24h] No bookings found");
    }

    // ============================
    // 1h SWEEP: all confirmed bookings starting within next 1h
    // (reminder_sent may already be true from 24h reminder)
    // ============================
    const now1h = new Date(now.getTime() + 1 * 60 * 60000);

    console.log(`[1h] Sweeping confirmed bookings between ${now.toISOString()} and ${now1h.toISOString()}`);

    const { data: bookings1h, error: err1h } = await supabase
      .from("bookings")
      .select("id, tenant_id, starts_at")
      .eq("status", "confirmed")
      .gte("starts_at", now.toISOString())
      .lte("starts_at", now1h.toISOString());

    if (err1h) {
      console.error("[1h] Error fetching bookings:", err1h);
    } else if (bookings1h && bookings1h.length > 0) {
      console.log(`[1h] Found ${bookings1h.length} bookings to check`);
      results.total += bookings1h.length;

      for (const booking of bookings1h) {
        const dedupKey = `reminder_1h_${booking.id}`;
        const { data: existing } = await supabase
          .from("notification_log")
          .select("id")
          .eq("dedup_key", dedupKey)
          .maybeSingle();

        if (existing) {
          console.log(`[1h] Skipping duplicate for booking ${booking.id}`);
          continue;
        }

        const success = await sendWhatsAppNotification(booking.id, booking.tenant_id, "1h");

        if (success) {
          await supabase.from("notification_log").upsert({
            tenant_id: booking.tenant_id,
            event_type: "booking_reminder_1h",
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
    } else {
      console.log("[1h] No bookings found");
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
