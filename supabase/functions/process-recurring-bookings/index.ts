import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Timezone offset for America/Bahia
const TZ_OFFSET = -3;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const nowUTC = new Date();
    const nowLocal = new Date(nowUTC.getTime() + TZ_OFFSET * 60 * 60 * 1000);
    const todayLocal = nowLocal.toISOString().slice(0, 10);
    const currentDayOfWeek = nowLocal.getDay();

    console.log(`Processing recurring bookings. Local now: ${nowLocal.toISOString()}, weekday: ${currentDayOfWeek}, date: ${todayLocal}`);

    const { data: recurringClients, error: rcError } = await supabase
      .from("recurring_clients")
      .select("*, service:services(id, name, duration_minutes, price_cents), customer:customers(id, name, phone)")
      .eq("weekday", currentDayOfWeek)
      .eq("active", true)
      .lte("start_date", todayLocal)
      .not("service_id", "is", null);

    if (rcError) {
      console.error("Error fetching recurring clients:", rcError);
      throw rcError;
    }

    if (!recurringClients || recurringClients.length === 0) {
      console.log("No recurring clients to process for today");
      return new Response(
        JSON.stringify({ success: true, message: "No recurring clients for today", created: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${recurringClients.length} recurring clients for weekday ${currentDayOfWeek}`);

    let created = 0;
    let skipped = 0;

    for (const rc of recurringClients) {
      const customerName = rc.customer?.name || "Cliente Fixo";
      const duration = rc.service?.duration_minutes || rc.duration_minutes;

      const slotStartLocal = new Date(`${todayLocal}T${rc.start_time}:00`);
      const slotStartUTC = new Date(slotStartLocal.getTime() - TZ_OFFSET * 60 * 60 * 1000);
      const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60 * 1000);

      if (slotEndUTC > nowUTC) {
        console.log(`Slot ${rc.start_time} for ${customerName} hasn't ended yet, skipping`);
        skipped++;
        continue;
      }

      const { data: existing } = await supabase
        .from("bookings")
        .select("id")
        .eq("tenant_id", rc.tenant_id)
        .eq("staff_id", rc.staff_id)
        .gte("starts_at", slotStartUTC.toISOString())
        .lt("starts_at", new Date(slotStartUTC.getTime() + 60000).toISOString())
        .limit(1);

      if (existing && existing.length > 0) {
        console.log(`Booking already exists for ${customerName} at ${rc.start_time}, skipping`);
        skipped++;
        continue;
      }

      // Use the customer_id directly from recurring_clients
      const { error: bookingErr } = await supabase
        .from("bookings")
        .insert({
          tenant_id: rc.tenant_id,
          customer_id: rc.customer_id,
          service_id: rc.service_id,
          staff_id: rc.staff_id,
          starts_at: slotStartUTC.toISOString(),
          ends_at: slotEndUTC.toISOString(),
          status: "completed",
          created_via: "recurring",
          notes: `Cliente Fixo — ${customerName}${rc.notes ? ` | ${rc.notes}` : ""}`,
        });

      if (bookingErr) {
        console.error(`Error creating booking for ${customerName}:`, bookingErr);
        continue;
      }

      console.log(`Created completed booking for ${customerName} at ${rc.start_time}`);
      created++;
    }

    console.log(`Done. Created: ${created}, Skipped: ${skipped}`);

    return new Response(
      JSON.stringify({ success: true, created, skipped, total: recurringClients.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in process-recurring-bookings:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
