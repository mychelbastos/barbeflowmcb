import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[UPDATE-SUB-QTY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const additionalPriceId = Deno.env.get("STRIPE_PRICE_ADDITIONAL_PROFESSIONAL");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");
    if (!additionalPriceId) throw new Error("STRIPE_PRICE_ADDITIONAL_PROFESSIONAL not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) throw new Error("User not authenticated");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id });

    // Get tenant
    const { data: ut } = await supabaseAdmin
      .from("users_tenant")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();
    if (!ut?.tenant_id) throw new Error("No tenant found");
    const tenantId = ut.tenant_id;

    // Parse body
    const { additional_count } = await req.json();
    if (typeof additional_count !== "number" || additional_count < 0) {
      throw new Error("Invalid additional_count");
    }
    logStep("Request", { tenantId, additional_count });

    // Find Stripe subscription
    const { data: subData } = await supabaseAdmin
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, status")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (!subData?.stripe_subscription_id) {
      throw new Error("NO_ACTIVE_SUBSCRIPTION");
    }
    if (!["active", "trialing"].includes(subData.status)) {
      throw new Error("SUBSCRIPTION_NOT_ACTIVE");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-09-30.clover" });
    const subscription = await stripe.subscriptions.retrieve(subData.stripe_subscription_id);
    logStep("Retrieved subscription", { id: subscription.id, items: subscription.items.data.length });

    // Find existing additional professional item
    const existingItem = subscription.items.data.find(
      (item: any) => item.price.id === additionalPriceId
    );

    if (additional_count === 0 && existingItem) {
      // Remove the item
      await stripe.subscriptionItems.del(existingItem.id, { proration_behavior: "create_prorations" });
      logStep("Removed additional professional item");
    } else if (additional_count > 0 && existingItem) {
      // Update quantity
      await stripe.subscriptionItems.update(existingItem.id, {
        quantity: additional_count,
        proration_behavior: "create_prorations",
      });
      logStep("Updated quantity", { quantity: additional_count });
    } else if (additional_count > 0 && !existingItem) {
      // Add new item
      await stripe.subscriptions.update(subscription.id, {
        items: [
          ...subscription.items.data.map((item: any) => ({ id: item.id })),
          { price: additionalPriceId, quantity: additional_count },
        ],
        proration_behavior: "create_prorations",
      });
      logStep("Added additional professional item", { quantity: additional_count });
    }

    // Sync to DB
    await supabaseAdmin
      .from("stripe_subscriptions")
      .update({ additional_professionals: additional_count, updated_at: new Date().toISOString() })
      .eq("tenant_id", tenantId);

    logStep("Done", { additional_count });

    return new Response(JSON.stringify({ success: true, additional_count }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: msg === "NO_ACTIVE_SUBSCRIPTION" || msg === "SUBSCRIPTION_NOT_ACTIVE" ? 400 : 500,
    });
  }
});
