import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Product/price mapping
const PLANS = {
  essencial: {
    product_id: "prod_Ty1Jvoc0qpDOUu",
    price_id: "price_1T05HMCxw1gIFu9gYyzo61F3",
    commission_rate: 0.025,
  },
  profissional: {
    product_id: "prod_Ty1KYrBniQmXyi",
    price_id: "price_1T05HvCxw1gIFu9guQDhSvfs",
    commission_rate: 0.010,
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get tenant
    const { data: ut } = await supabaseAdmin
      .from("users_tenant")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!ut?.tenant_id) {
      return new Response(JSON.stringify({ subscribed: false, status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      await supabaseAdmin.from("tenants").update({ subscription_status: "none" }).eq("id", ut.tenant_id);
      return new Response(JSON.stringify({ subscribed: false, status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Check all subscriptions (active + trialing)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No subscriptions found");
      await supabaseAdmin.from("tenants").update({ subscription_status: "none" }).eq("id", ut.tenant_id);
      return new Response(JSON.stringify({ subscribed: false, status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sub = subscriptions.data[0];
    const productId = sub.items.data[0]?.price?.product as string;
    const priceId = sub.items.data[0]?.price?.id;

    // Determine plan name
    let planName = "essencial";
    let commissionRate = 0.025;
    if (productId === PLANS.profissional.product_id || priceId === PLANS.profissional.price_id) {
      planName = "profissional";
      commissionRate = 0.010;
    }

    const subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();
    const trialEnd = sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null;

    logStep("Subscription found", { status: sub.status, planName, subscriptionEnd });

    // Sync to DB
    await supabaseAdmin.from("stripe_subscriptions").upsert({
      tenant_id: ut.tenant_id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceId,
      plan_name: planName,
      billing_interval: sub.items.data[0]?.price?.recurring?.interval || "month",
      status: sub.status,
      commission_rate: commissionRate,
      trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
      trial_end: trialEnd,
      current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
      current_period_end: subscriptionEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
      canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "tenant_id" });

    // Update tenant quick status
    await supabaseAdmin.from("tenants").update({
      subscription_status: sub.status,
    }).eq("id", ut.tenant_id);

    const isActive = ["active", "trialing"].includes(sub.status);

    return new Response(JSON.stringify({
      subscribed: isActive,
      status: sub.status,
      plan_name: planName,
      product_id: productId,
      subscription_end: subscriptionEnd,
      trial_end: trialEnd,
      cancel_at_period_end: sub.cancel_at_period_end,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
