import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { slug, custom_domain, initial_package_id, initial_plan_id } = await req.json();

    // 1. Get tenant
    let tenantQuery = supabase.from("tenants").select("*");
    if (custom_domain) {
      tenantQuery = tenantQuery.eq("custom_domain", custom_domain);
    } else if (slug) {
      tenantQuery = tenantQuery.eq("slug", slug);
    } else {
      return new Response(
        JSON.stringify({ error: "slug or custom_domain required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: tenant, error: tenantError } = await tenantQuery.single();
    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "Tenant not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tenantId = tenant.id;

    // 2. Parallel: services, staff, blocks, packages, subscription plans
    const [servicesRes, staffRes, blocksRes] = await Promise.all([
      supabase
        .from("services")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .eq("public", true)
        .order("name"),
      supabase
        .from("staff")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("active", true)
        .order("name"),
      supabase
        .from("blocks")
        .select("starts_at, ends_at, staff_id")
        .eq("tenant_id", tenantId)
        .gte("ends_at", new Date().toISOString()),
    ]);

    const services = servicesRes.data || [];
    const staff = staffRes.data || [];
    const blocks = blocksRes.data || [];

    // 3. Packages (with services) — parallel with subscription plans
    let packagesQuery = supabase
      .from("service_packages")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if (initial_package_id) {
      packagesQuery = packagesQuery.or(`public.eq.true,id.eq.${initial_package_id}`);
    } else {
      packagesQuery = packagesQuery.eq("public", true);
    }

    let plansQuery = supabase
      .from("subscription_plans")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("active", true);

    if (initial_plan_id) {
      plansQuery = plansQuery.or(`public.eq.true,id.eq.${initial_plan_id}`);
    } else {
      plansQuery = plansQuery.eq("public", true);
    }

    const [packagesRes, plansRes] = await Promise.all([
      packagesQuery.order("name"),
      plansQuery.order("name"),
    ]);

    let packages = packagesRes.data || [];
    let plans = plansRes.data || [];

    // 4. Get package_services and plan_services/plan_staff in parallel
    const packageIds = packages.map((p: any) => p.id);
    const planIds = plans.map((p: any) => p.id);

    const subQueries: Promise<any>[] = [];

    if (packageIds.length > 0) {
      subQueries.push(
        supabase
          .from("package_services")
          .select("*, service:services(name, duration_minutes, price_cents, photo_url)")
          .in("package_id", packageIds)
      );
    } else {
      subQueries.push(Promise.resolve({ data: [] }));
    }

    if (planIds.length > 0) {
      subQueries.push(
        supabase.from("subscription_plan_services").select("*, service:services(name)").in("plan_id", planIds)
      );
      subQueries.push(
        supabase.from("subscription_plan_staff").select("plan_id, staff_id").in("plan_id", planIds)
      );
    } else {
      subQueries.push(Promise.resolve({ data: [] }));
      subQueries.push(Promise.resolve({ data: [] }));
    }

    const [pkgSvcsRes, planSvcsRes, planStaffRes] = await Promise.all(subQueries);

    // Attach package_services
    const pkgSvcs = pkgSvcsRes.data || [];
    for (const pkg of packages) {
      (pkg as any).package_services = pkgSvcs.filter((ps: any) => ps.package_id === pkg.id);
    }

    // Attach plan_services and plan_staff
    const planSvcs = planSvcsRes.data || [];
    const planStaff = planStaffRes.data || [];
    for (const plan of plans) {
      (plan as any).plan_services = planSvcs.filter((ps: any) => ps.plan_id === plan.id);
      (plan as any).plan_staff = planStaff.filter((ps: any) => ps.plan_id === plan.id);
    }

    return new Response(
      JSON.stringify({
        tenant,
        services,
        staff,
        blocks,
        packages,
        subscription_plans: plans,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in public-tenant-page:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
