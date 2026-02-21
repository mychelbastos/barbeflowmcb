import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

function getPlanInfo(priceId: string) {
  const essentialMonthly = Deno.env.get("STRIPE_PRICE_ESSENCIAL_MONTHLY") || "price_1T05HMCxw1gIFu9gYyzo61F3";
  const essentialYearly = Deno.env.get("STRIPE_PRICE_ESSENCIAL_YEARLY") || "";
  const proMonthly = Deno.env.get("STRIPE_PRICE_PROFISSIONAL_MONTHLY") || "price_1T05HvCxw1gIFu9guQDhSvfs";
  const proYearly = Deno.env.get("STRIPE_PRICE_PROFISSIONAL_YEARLY") || "";

  if (priceId === proMonthly || priceId === proYearly) {
    return { plan_name: "profissional", commission_rate: 0.010 };
  }
  return { plan_name: "essencial", commission_rate: 0.025 };
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    logStep("ERROR", { message: "Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET" });
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-09-30.clover" });
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    logStep("ERROR", { message: "Missing stripe-signature header" });
    return new Response("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("Signature verification failed", { message: msg });
    return new Response(`Webhook signature error: ${msg}`, { status: 400 });
  }

  logStep("Event received", { type: event.type, id: event.id });

  try {
    // Helper to find tenant_id from a Stripe customer ID
    async function getTenantId(customerId: string, metadata?: Record<string, string>): Promise<string | null> {
      // Try metadata first
      if (metadata?.tenant_id) return metadata.tenant_id;

      const { data } = await supabaseAdmin
        .from("stripe_customers")
        .select("tenant_id")
        .eq("stripe_customer_id", customerId)
        .maybeSingle();
      return data?.tenant_id || null;
    }

    switch (event.type) {
      // ─── SUBSCRIPTION EVENTS ───
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const tenantId = await getTenantId(customerId, sub.metadata as Record<string, string>);
        if (!tenantId) {
          logStep("WARN: No tenant found for customer", { customerId });
          break;
        }

        const priceId = sub.items.data[0]?.price?.id || "";
        const interval = sub.items.data[0]?.price?.recurring?.interval || "month";
        const { plan_name, commission_rate } = getPlanInfo(priceId);

        // Count additional professionals from subscription items
        const additionalPriceId = Deno.env.get("STRIPE_PRICE_ADDITIONAL_PROFESSIONAL") || "";
        let additionalProfessionals = 0;
        if (additionalPriceId) {
          const addItem = sub.items.data.find((item: any) => item.price?.id === additionalPriceId);
          if (addItem) {
            additionalProfessionals = addItem.quantity || 0;
          }
        }

        await supabaseAdmin.from("stripe_subscriptions").upsert({
          tenant_id: tenantId,
          stripe_subscription_id: sub.id,
          stripe_price_id: priceId,
          plan_name,
          billing_interval: interval,
          status: sub.status,
          commission_rate,
          trial_start: sub.trial_start ? new Date(sub.trial_start * 1000).toISOString() : null,
          trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          cancel_at_period_end: sub.cancel_at_period_end,
          canceled_at: sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null,
          additional_professionals: additionalProfessionals,
          updated_at: new Date().toISOString(),
        }, { onConflict: "tenant_id" });

        await supabaseAdmin.from("tenants").update({
          subscription_status: sub.status,
        }).eq("id", tenantId);

        logStep("Subscription upserted", { tenantId, status: sub.status, plan_name });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
        const tenantId = await getTenantId(customerId, sub.metadata as Record<string, string>);
        if (!tenantId) break;

        await supabaseAdmin.from("stripe_subscriptions").update({
          status: "canceled",
          canceled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("tenant_id", tenantId);

        await supabaseAdmin.from("tenants").update({
          subscription_status: "canceled",
        }).eq("id", tenantId);

        logStep("Subscription deleted/canceled", { tenantId });
        break;
      }

      case "customer.subscription.trial_will_end": {
        const sub = event.data.object as Stripe.Subscription;
        logStep("Trial will end soon", { subscriptionId: sub.id, trialEnd: sub.trial_end });
        // Future: send reminder email
        break;
      }

      // ─── INVOICE EVENTS ───
      case "invoice.created":
      case "invoice.finalized": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;
        const tenantId = await getTenantId(customerId);
        if (!tenantId) break;

        await supabaseAdmin.from("stripe_invoices").upsert({
          tenant_id: tenantId,
          stripe_invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: invoice.status || "draft",
          invoice_url: invoice.hosted_invoice_url || null,
          invoice_pdf: invoice.invoice_pdf || null,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        }, { onConflict: "stripe_invoice_id" });

        logStep("Invoice upserted", { tenantId, invoiceId: invoice.id, status: invoice.status });
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;
        const tenantId = await getTenantId(customerId);
        if (!tenantId) break;

        await supabaseAdmin.from("stripe_invoices").upsert({
          tenant_id: tenantId,
          stripe_invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid,
          currency: invoice.currency,
          status: "paid",
          invoice_url: invoice.hosted_invoice_url || null,
          invoice_pdf: invoice.invoice_pdf || null,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
          paid_at: new Date().toISOString(),
        }, { onConflict: "stripe_invoice_id" });

        // Ensure tenant is active
        await supabaseAdmin.from("tenants").update({
          subscription_status: "active",
        }).eq("id", tenantId);

        logStep("Invoice paid", { tenantId, invoiceId: invoice.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === "string" ? invoice.customer : (invoice.customer as any)?.id;
        if (!customerId) break;
        const tenantId = await getTenantId(customerId);
        if (!tenantId) break;

        await supabaseAdmin.from("stripe_invoices").upsert({
          tenant_id: tenantId,
          stripe_invoice_id: invoice.id,
          amount_due: invoice.amount_due,
          amount_paid: invoice.amount_paid || 0,
          currency: invoice.currency,
          status: "open",
          invoice_url: invoice.hosted_invoice_url || null,
          invoice_pdf: invoice.invoice_pdf || null,
          period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
          period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
        }, { onConflict: "stripe_invoice_id" });

        await supabaseAdmin.from("tenants").update({
          subscription_status: "past_due",
        }).eq("id", tenantId);

        logStep("Invoice payment failed", { tenantId, invoiceId: invoice.id });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    logStep("ERROR processing event", { type: event.type, message: msg });
    // Return 200 even on processing errors to prevent Stripe retries
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
