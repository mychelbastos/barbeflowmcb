import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Reminder window: 2 hours before, with a 10-minute buffer
const REMINDER_HOURS_BEFORE = 2;
const BUFFER_MINUTES = 10;

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function sendWhatsAppNotification(bookingId: string, tenantId: string): Promise<boolean> {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        type: "booking_reminder",
        booking_id: bookingId,
        tenant_id: tenantId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send reminder for booking ${bookingId}:`, errorText);
      return false;
    }

    const result = await response.json();
    console.log(`Reminder sent for booking ${bookingId}:`, result);
    return true;
  } catch (error) {
    console.error(`Error sending reminder for booking ${bookingId}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const now = new Date();
    console.log(`[${now.toISOString()}] Running send-booking-reminders`);

    // Calculate the time window for reminders
    // We want to find bookings that start in approximately 2 hours
    const windowStart = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 - BUFFER_MINUTES) * 60000);
    const windowEnd = new Date(now.getTime() + (REMINDER_HOURS_BEFORE * 60 + BUFFER_MINUTES) * 60000);

    console.log(`Looking for confirmed bookings starting between: ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    // Fetch confirmed bookings in the reminder window that haven't had reminder sent
    const { data: bookings, error } = await supabase
      .from("bookings")
      .select("id, tenant_id, starts_at")
      .eq("status", "confirmed")
      .eq("reminder_sent", false)
      .gte("starts_at", windowStart.toISOString())
      .lte("starts_at", windowEnd.toISOString());

    if (error) {
      console.error("Error fetching bookings:", error);
      return new Response(
        JSON.stringify({ error: "Failed to fetch bookings", details: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bookings || bookings.length === 0) {
      console.log("No bookings found for reminders");
      return new Response(
        JSON.stringify({ success: true, reminders_sent: 0, message: "No bookings found for reminders" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${bookings.length} bookings for reminders`);

    const results = {
      total: bookings.length,
      sent: 0,
      failed: 0,
      bookingIds: [] as string[],
    };

    // Process each booking
    for (const booking of bookings) {
      const success = await sendWhatsAppNotification(booking.id, booking.tenant_id);

      if (success) {
        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from("bookings")
          .update({ reminder_sent: true })
          .eq("id", booking.id);

        if (updateError) {
          console.error(`Failed to update reminder_sent for booking ${booking.id}:`, updateError);
        }

        results.sent++;
        results.bookingIds.push(booking.id);
      } else {
        results.failed++;
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
