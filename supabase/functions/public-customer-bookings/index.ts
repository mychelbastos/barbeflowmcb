import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Normalize phone to canonical Brazilian format: DDD (2) + 9-digit mobile = 11 digits
function canonicalPhone(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    digits = digits.slice(0, 2) + "9" + digits.slice(2);
  }
  return digits;
}

function buildPhoneVariants(phone: string): string[] {
  const canonical = canonicalPhone(phone);
  // Generate all possible stored formats for this canonical number
  const variants = new Set<string>();
  variants.add(canonical);                              // 75999038366
  variants.add("55" + canonical);                       // 5575999038366
  variants.add("+" + "55" + canonical);                 // +5575999038366
  // Also add old 10-digit format (without 9th digit)
  if (canonical.length === 11) {
    const oldFormat = canonical.slice(0, 2) + canonical.slice(3);
    variants.add(oldFormat);                            // 7599038366
    variants.add("55" + oldFormat);                     // 557599038366
  }
  return [...variants];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, tenant_id, action, booking_id } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle cancel action
    if (action === "cancel" && booking_id && tenant_id) {
      const { error } = await supabase
        .from("bookings")
        .update({ status: "cancelled", updated_at: new Date().toISOString() })
        .eq("id", booking_id)
        .eq("tenant_id", tenant_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle customer lookup action — returns name/email for auto-fill
    if (action === "lookup" && phone && tenant_id) {
      const uniqueVariants = buildPhoneVariants(phone);

      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("id, name, email, phone, birthday")
        .eq("tenant_id", tenant_id)
        .or(uniqueVariants.map((p) => `phone.eq.${p}`).join(","))
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (customerError) throw customerError;

      if (!customer) {
        return new Response(
          JSON.stringify({ found: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          found: true,
          customer: {
            id: customer.id,
            name: customer.name,
            email: customer.email || "",
            birthday: customer.birthday || "",
          },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!phone || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "phone and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default: list future bookings
    const uniqueVariants = buildPhoneVariants(phone);

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenant_id)
      .or(uniqueVariants.map((p) => `phone.eq.${p}`).join(","));

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ bookings: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerIds = customers.map((c) => c.id);
    const now = new Date().toISOString();

    const { data: bookings, error: bookingsError } = await supabase
      .from("bookings")
      .select(`
        id,
        starts_at,
        ends_at,
        status,
        service:services(name, price_cents),
        staff:staff(name)
      `)
      .eq("tenant_id", tenant_id)
      .in("customer_id", customerIds)
      .gte("starts_at", now)
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true });

    if (bookingsError) throw bookingsError;

    return new Response(
      JSON.stringify({ bookings: bookings || [] }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in public-customer-bookings:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
