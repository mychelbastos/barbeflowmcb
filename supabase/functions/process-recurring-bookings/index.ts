import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Timezone offset for America/Bahia
const TZ_OFFSET = -3;

// How many days ahead to materialize recurring bookings
const LOOKAHEAD_DAYS = 2; // today + tomorrow = covers 48h window for 24h reminders

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const nowUTC = new Date();
    const nowLocal = new Date(nowUTC.getTime() + TZ_OFFSET * 60 * 60 * 1000);

    console.log(`Processing recurring bookings. Local now: ${nowLocal.toISOString()}`);

    let totalCreated = 0;
    let totalSkipped = 0;

    // Process today and the next LOOKAHEAD_DAYS-1 days
    for (let dayOffset = 0; dayOffset < LOOKAHEAD_DAYS; dayOffset++) {
      const targetLocal = new Date(nowLocal.getTime() + dayOffset * 24 * 60 * 60 * 1000);
      const targetDate = targetLocal.toISOString().slice(0, 10);
      const targetDayOfWeek = targetLocal.getDay();

      console.log(`--- Processing day: ${targetDate} (weekday ${targetDayOfWeek}, offset +${dayOffset}) ---`);

      const { data: recurringClients, error: rcError } = await supabase
        .from("recurring_clients")
        .select("*, service:services(id, name, duration_minutes, price_cents), customer:customers(id, name, phone)")
        .eq("weekday", targetDayOfWeek)
        .eq("active", true)
        .lte("start_date", targetDate)
        .not("service_id", "is", null);

      if (rcError) {
        console.error(`Error fetching recurring clients for ${targetDate}:`, rcError);
        continue;
      }

      if (!recurringClients || recurringClients.length === 0) {
        console.log(`No recurring clients for ${targetDate}`);
        continue;
      }

      console.log(`Found ${recurringClients.length} recurring clients for ${targetDate}`);

      const frequencyToInterval = (f: string): number => {
        switch (f) { case 'weekly': return 1; case 'biweekly': return 2; case 'triweekly': return 3; case 'monthly': return 4; default: return 1; }
      };

      for (const rc of recurringClients) {
        // Check frequency: skip if not the right week
        const interval = frequencyToInterval(rc.frequency || 'weekly');
        if (interval > 1) {
          const slotStart = new Date(rc.start_date + 'T00:00:00');
          const diffMs = targetLocal.getTime() - slotStart.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          const diffWeeks = Math.floor(diffDays / 7);

          if (diffWeeks % interval !== 0) {
            console.log(`Skipping ${rc.customer?.name} - frequency ${rc.frequency}, not this week (week ${diffWeeks})`);
            totalSkipped++;
            continue;
          }
        }

        const customerName = rc.customer?.name || "Cliente Fixo";
        const duration = rc.service?.duration_minutes || rc.duration_minutes;

        // Construct time
        const timeStr = (rc.start_time || "00:00").slice(0, 5);
        const slotStartLocal = new Date(`${targetDate}T${timeStr}:00`);
        const slotStartUTC = new Date(slotStartLocal.getTime() - TZ_OFFSET * 60 * 60 * 1000);
        const slotEndUTC = new Date(slotStartUTC.getTime() + duration * 60 * 1000);

        // Dedup: check if a booking already exists for this slot
        const { data: existing } = await supabase
          .from("bookings")
          .select("id")
          .eq("tenant_id", rc.tenant_id)
          .eq("staff_id", rc.staff_id)
          .gte("starts_at", slotStartUTC.toISOString())
          .lt("starts_at", new Date(slotStartUTC.getTime() + 60000).toISOString())
          .limit(1);

        if (existing && existing.length > 0) {
          console.log(`Booking already exists for ${customerName} at ${timeStr} on ${targetDate}, skipping`);
          totalSkipped++;
          continue;
        }

        // Determine status: future slots → confirmed, past slots → completed
        const isFuture = slotEndUTC > nowUTC;
        const bookingStatus = isFuture ? "confirmed" : "completed";

        const { error: bookingErr } = await supabase
          .from("bookings")
          .insert({
            tenant_id: rc.tenant_id,
            customer_id: rc.customer_id,
            service_id: rc.service_id,
            staff_id: rc.staff_id,
            starts_at: slotStartUTC.toISOString(),
            ends_at: slotEndUTC.toISOString(),
            status: bookingStatus,
            created_via: "recurring",
            notes: `Cliente Fixo — ${customerName}${rc.notes ? ` | ${rc.notes}` : ""}`,
          });

        if (bookingErr) {
          console.error(`Error creating booking for ${customerName}:`, bookingErr);
          continue;
        }

        console.log(`Created ${bookingStatus} booking for ${customerName} at ${timeStr} on ${targetDate}`);
        totalCreated++;
      }
    }

    console.log(`Done. Created: ${totalCreated}, Skipped: ${totalSkipped}`);

    return new Response(
      JSON.stringify({ success: true, created: totalCreated, skipped: totalSkipped }),
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
