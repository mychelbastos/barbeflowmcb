import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@18.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData.user) throw new Error("Unauthorized");

    const { data: isAdmin } = await supabase
      .from("admin_users")
      .select("id")
      .eq("user_id", userData.user.id)
      .eq("active", true)
      .limit(1);

    if (!isAdmin || isAdmin.length === 0) throw new Error("Not an admin");

    const body = await req.json();
    const { action, tenant_id, ...params } = body;

    if (!action || !tenant_id) throw new Error("action and tenant_id required");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Get tenant's stripe subscription
    const { data: stripeSub } = await supabase
      .from("stripe_subscriptions")
      .select("stripe_subscription_id, stripe_price_id, commission_rate")
      .eq("tenant_id", tenant_id)
      .limit(1)
      .single();

    const subId = stripeSub?.stripe_subscription_id;

    const json = (data: any) =>
      new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    const error = (msg: string, status = 400) =>
      new Response(JSON.stringify({ error: msg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    switch (action) {
      case "extend_trial": {
        if (!subId) return error("No subscription found");
        const days = params.days || 7;
        const sub = await stripe.subscriptions.retrieve(subId);
        if (sub.status !== "trialing") return error("Not in trial");
        const newEnd = new Date((sub.trial_end || 0) * 1000);
        newEnd.setDate(newEnd.getDate() + days);
        await stripe.subscriptions.update(subId, {
          trial_end: Math.floor(newEnd.getTime() / 1000),
        });
        // Update local
        await supabase
          .from("stripe_subscriptions")
          .update({ trial_end: newEnd.toISOString() })
          .eq("tenant_id", tenant_id);
        return json({ success: true, new_trial_end: newEnd.toISOString() });
      }

      case "apply_coupon": {
        if (!subId) return error("No subscription found");
        let couponId = params.coupon_id;
        if (!couponId) {
          const coupon = await stripe.coupons.create({
            percent_off: params.percent_off || 20,
            duration: params.duration || "repeating",
            ...(params.duration === "repeating" && {
              duration_in_months: params.duration_months || 3,
            }),
          });
          couponId = coupon.id;
        }
        await stripe.subscriptions.update(subId, {
          coupon: couponId,
        });
        return json({ success: true, coupon_id: couponId });
      }

      case "remove_coupon": {
        if (!subId) return error("No subscription found");
        await stripe.subscriptions.deleteDiscount(subId);
        await supabase
          .from("stripe_subscriptions")
          .update({ discount_name: null, discount_percent_off: null, discount_amount_off: null })
          .eq("tenant_id", tenant_id);
        return json({ success: true });
      }

      case "cancel_subscription": {
        if (!subId) return error("No subscription found");
        if (params.immediate) {
          await stripe.subscriptions.cancel(subId);
        } else {
          await stripe.subscriptions.update(subId, {
            cancel_at_period_end: true,
          });
        }
        return json({ success: true });
      }

      case "reactivate_subscription": {
        if (!subId) return error("No subscription found");
        await stripe.subscriptions.update(subId, {
          cancel_at_period_end: false,
        });
        return json({ success: true });
      }

      case "change_plan": {
        if (!subId) return error("No subscription found");
        const sub = await stripe.subscriptions.retrieve(subId);
        await stripe.subscriptions.update(subId, {
          items: [{ id: sub.items.data[0].id, price: params.price_id }],
          proration_behavior: "create_prorations",
        });
        return json({ success: true });
      }

      case "update_commission": {
        const rate = params.commission_rate;
        if (rate === undefined) return error("commission_rate required");
        await supabase
          .from("stripe_subscriptions")
          .update({ commission_rate: rate })
          .eq("tenant_id", tenant_id);
        return json({ success: true });
      }

      case "toggle_addon": {
        const { addon, enabled } = params;
        if (!addon) return error("addon required");
        // Update tenant settings
        const { data: tenant } = await supabase
          .from("tenants")
          .select("settings")
          .eq("id", tenant_id)
          .single();
        const settings = { ...((tenant?.settings as Record<string, any>) || {}), [addon]: enabled };
        await supabase.from("tenants").update({ settings }).eq("id", tenant_id);
        return json({ success: true });
      }

      case "get_invoices": {
        // Find stripe customer for this tenant
        const { data: sc } = await supabase
          .from("stripe_customers")
          .select("stripe_customer_id")
          .eq("tenant_id", tenant_id)
          .limit(1)
          .single();
        if (!sc) return json({ invoices: [] });
        const invoices = await stripe.invoices.list({
          customer: sc.stripe_customer_id,
          limit: 10,
        });
        return json({
          invoices: invoices.data.map((inv) => ({
            id: inv.id,
            amount_due: inv.amount_due,
            amount_paid: inv.amount_paid,
            status: inv.status,
            hosted_invoice_url: inv.hosted_invoice_url,
            invoice_pdf: inv.invoice_pdf,
            created: inv.created,
          })),
        });
      }

      case "get_subscription": {
        if (!subId) return error("No subscription found");
        const sub = await stripe.subscriptions.retrieve(subId, {
          expand: ["discount.coupon"],
        });
        return json({ subscription: sub });
      }

      default:
        return error(`Unknown action: ${action}`);
    }
  } catch (err: any) {
    console.error("[ADMIN-STRIPE]", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: err.message === "Unauthorized" || err.message === "Not an admin" ? 403 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
