import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

// Price ID resolution from env vars
const PRICE_MAP: Record<string, Record<string, string>> = {
  essencial: {
    month: "STRIPE_PRICE_ESSENCIAL_MONTHLY",
    year: "STRIPE_PRICE_ESSENCIAL_YEARLY",
  },
  profissional: {
    month: "STRIPE_PRICE_PROFISSIONAL_MONTHLY",
    year: "STRIPE_PRICE_PROFISSIONAL_YEARLY",
  },
};

// Fallback price IDs (test mode)
const FALLBACK_PRICES: Record<string, string> = {
  STRIPE_PRICE_ESSENCIAL_MONTHLY: "price_1T05HMCxw1gIFu9gYyzo61F3",
  STRIPE_PRICE_ESSENCIAL_YEARLY: "price_1T05VNCxw1gIFu9gm1teleab",
  STRIPE_PRICE_PROFISSIONAL_MONTHLY: "price_1T05HvCxw1gIFu9guQDhSvfs",
  STRIPE_PRICE_PROFISSIONAL_YEARLY: "price_1T05W3Cxw1gIFu9gKCNzmSvM",
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

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) throw new Error("User not authenticated");
    const user = userData.user;
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get tenant via users_tenant
    const { data: ut } = await supabaseAdmin
      .from("users_tenant")
      .select("tenant_id")
      .eq("user_id", user.id)
      .limit(1)
      .single();

    if (!ut?.tenant_id) throw new Error("Tenant não encontrado");

    const { data: tenant } = await supabaseAdmin
      .from("tenants")
      .select("id, name")
      .eq("id", ut.tenant_id)
      .single();

    if (!tenant) throw new Error("Tenant não encontrado");
    logStep("Tenant found", { tenantId: tenant.id, name: tenant.name });

    const body = await req.json();
    const plan = body.plan as string; // 'essencial' | 'profissional'
    const billingInterval = body.billing_interval as string || "month"; // 'month' | 'year'
    
    // Also support legacy price_id param
    let priceId = body.price_id as string;
    
    if (!priceId) {
      if (!plan || !PRICE_MAP[plan]) throw new Error("Plano inválido");
      const envKey = PRICE_MAP[plan]?.[billingInterval];
      if (!envKey) throw new Error("Intervalo de cobrança inválido");
      priceId = Deno.env.get(envKey) || FALLBACK_PRICES[envKey] || "";
      if (!priceId) throw new Error(`Price ID não configurado para ${plan}/${billingInterval}`);
    }

    logStep("Price resolved", { plan, billingInterval, priceId });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check/create Stripe customer
    let { data: stripeCustomer } = await supabaseAdmin
      .from("stripe_customers")
      .select("stripe_customer_id")
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    let customerId: string;

    if (stripeCustomer?.stripe_customer_id) {
      customerId = stripeCustomer.stripe_customer_id;
      logStep("Existing Stripe customer", { customerId });
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        name: tenant.name,
        metadata: { tenant_id: tenant.id, supabase_user_id: user.id },
      });
      customerId = customer.id;
      await supabaseAdmin.from("stripe_customers").insert({
        tenant_id: tenant.id,
        stripe_customer_id: customer.id,
      });
      logStep("Created Stripe customer", { customerId });
    }

const origin = req.headers.get("origin") || Deno.env.get("FRONT_BASE_URL") || "https://www.modogestor.com.br";

    // On dashboard domains (app.*), routes don't use /app prefix
    const dashboardHosts = ["app.modogestor.com.br"];
    const isDashDomain = dashboardHosts.some((h) => origin.includes(h));
    const settingsPath = isDashDomain ? "/settings" : "/app/settings";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { tenant_id: tenant.id },
      },
      success_url: `${origin}${settingsPath}?tab=billing&success=true`,
      cancel_url: `${origin}${settingsPath}?tab=billing&canceled=true`,
      allow_promotion_codes: true,
      locale: "pt-BR",
    });

    logStep("Checkout session created", { sessionId: session.id });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
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
