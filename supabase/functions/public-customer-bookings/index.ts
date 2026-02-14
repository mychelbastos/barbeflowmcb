import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
  const variants = new Set<string>();
  variants.add(canonical);
  variants.add("55" + canonical);
  variants.add("+" + "55" + canonical);
  if (canonical.length === 11) {
    const oldFormat = canonical.slice(0, 2) + canonical.slice(3);
    variants.add(oldFormat);
    variants.add("55" + oldFormat);
  }
  return [...variants];
}

async function findCustomerByPhone(supabase: any, tenantId: string, phone: string) {
  const uniqueVariants = buildPhoneVariants(phone);
  const { data: customer, error } = await supabase
    .from("customers")
    .select("id, name, email, phone, birthday")
    .eq("tenant_id", tenantId)
    .or(uniqueVariants.map((p: string) => `phone.eq.${p}`).join(","))
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return customer;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { phone, tenant_id, action, booking_id } = body;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // --- Cancel booking (now uses atomic DB function with refund policy) ---
    if (action === "cancel" && booking_id && tenant_id) {
      // Get tenant's cancellation_min_hours setting
      const { data: tenant } = await supabase
        .from("tenants")
        .select("settings")
        .eq("id", tenant_id)
        .single();
      
      const cancellationMinHours = tenant?.settings?.cancellation_min_hours ?? 4;

      // Call atomic cancellation function
      const { data: result, error: rpcError } = await supabase.rpc("cancel_booking_with_refund", {
        p_booking_id: booking_id,
        p_tenant_id: tenant_id,
        p_cancellation_min_hours: cancellationMinHours,
      });

      if (rpcError) throw rpcError;

      if (!result?.success) {
        return new Response(
          JSON.stringify({ success: false, error: result?.error }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send WhatsApp cancellation notification
      try {
        await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
          },
          body: JSON.stringify({ type: "booking_cancelled", booking_id, tenant_id }),
        });
      } catch (notifError) {
        console.error("WhatsApp cancellation notification error:", notifError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          session_outcome: result.session_outcome,
          refunded: result.refunded,
          hours_until_start: result.hours_until_start,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Lookup customer ---
    if (action === "lookup" && phone && tenant_id) {
      const customer = await findCustomerByPhone(supabase, tenant_id, phone);
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

    // --- Find or create customer ---
    if (action === "find-or-create" && phone && tenant_id) {
      const { name, email } = body;
      if (!name) {
        return new Response(
          JSON.stringify({ error: "name is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const canonical = canonicalPhone(phone);
      const existing = await findCustomerByPhone(supabase, tenant_id, phone);
      if (existing) {
        const updates: any = { name: name.trim() };
        if (email) updates.email = email;
        await supabase.from("customers").update(updates).eq("id", existing.id);
        return new Response(
          JSON.stringify({ customer_id: existing.id, created: false }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const { data: newCust, error: insertErr } = await supabase
        .from("customers")
        .insert({ tenant_id, name: name.trim(), phone: canonical, email: email || null })
        .select("id")
        .single();
      if (insertErr) throw insertErr;
      return new Response(
        JSON.stringify({ customer_id: newCust.id, created: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Get customer benefits (packages + subscriptions) ---
    if (action === "benefits" && phone && tenant_id) {
      const customer = await findCustomerByPhone(supabase, tenant_id, phone);
      if (!customer) {
        return new Response(
          JSON.stringify({ customer_id: null, packages: [], subscriptions: [] }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const [pkgRes, subRes] = await Promise.all([
        supabase.from("customer_packages")
          .select("id, status, payment_status, package:service_packages(*), services:customer_package_services(service_id, sessions_used, sessions_total)")
          .eq("customer_id", customer.id)
          .eq("tenant_id", tenant_id)
          .eq("status", "active")
          .eq("payment_status", "confirmed"),
        supabase.from("customer_subscriptions")
          .select("id, status, plan_id, plan:subscription_plans(name, price_cents), usage:subscription_usage(service_id, sessions_used, sessions_limit, period_start, period_end)")
          .eq("customer_id", customer.id)
          .eq("tenant_id", tenant_id)
          .in("status", ["active", "authorized"]),
      ]);

      // Also get plan_services for subscriptions
      const planIds = (subRes.data || []).map((s: any) => s.plan_id).filter(Boolean);
      let planServices: any[] = [];
      if (planIds.length > 0) {
        const { data } = await supabase
          .from("subscription_plan_services")
          .select("plan_id, service_id, sessions_per_cycle")
          .in("plan_id", planIds);
        planServices = data || [];
      }

      return new Response(
        JSON.stringify({
          customer_id: customer.id,
          customer_name: customer.name,
          packages: pkgRes.data || [],
          subscriptions: (subRes.data || []).map((s: any) => ({
            ...s,
            plan_services: planServices.filter((ps: any) => ps.plan_id === s.plan_id),
          })),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- Default: list future bookings ---
    if (!phone || !tenant_id) {
      return new Response(
        JSON.stringify({ error: "phone and tenant_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const uniqueVariants = buildPhoneVariants(phone);

    const { data: customers, error: customerError } = await supabase
      .from("customers")
      .select("id")
      .eq("tenant_id", tenant_id)
      .or(uniqueVariants.map((p: string) => `phone.eq.${p}`).join(","));

    if (customerError) throw customerError;

    if (!customers || customers.length === 0) {
      return new Response(
        JSON.stringify({ bookings: [] }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerIds = customers.map((c: any) => c.id);
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
