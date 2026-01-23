import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const now = new Date().toISOString();

    // Find all confirmed bookings where ends_at is in the past
    const { data: bookingsToComplete, error: fetchError } = await supabase
      .from("bookings")
      .select("id, ends_at, tenant_id")
      .eq("status", "confirmed")
      .lt("ends_at", now);

    if (fetchError) {
      console.error("Error fetching bookings:", fetchError);
      throw fetchError;
    }

    if (!bookingsToComplete || bookingsToComplete.length === 0) {
      console.log("No bookings to auto-complete");
      return new Response(
        JSON.stringify({ success: true, message: "No bookings to complete", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${bookingsToComplete.length} bookings to auto-complete`);

    // Update all found bookings to completed status
    const bookingIds = bookingsToComplete.map(b => b.id);
    
    const { error: updateError } = await supabase
      .from("bookings")
      .update({ status: "completed", updated_at: now })
      .in("id", bookingIds);

    if (updateError) {
      console.error("Error updating bookings:", updateError);
      throw updateError;
    }

    console.log(`Successfully auto-completed ${bookingIds.length} bookings`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Auto-completed ${bookingIds.length} bookings`,
        count: bookingIds.length,
        bookingIds 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in auto-complete-bookings:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
