import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPayload {
  type: "booking_confirmed" | "booking_reminder" | "booking_cancelled" | "booking_expired" | "payment_received";
  booking_id: string;
  tenant_id: string;
}

interface BookingData {
  id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  notes: string | null;
  customer: {
    name: string;
    phone: string;
    email: string | null;
  };
  service: {
    name: string;
    duration_minutes: number;
    price_cents: number;
  };
  staff: {
    name: string;
  } | null;
  tenant: {
    name: string;
    phone: string | null;
    address: string | null;
    slug: string;
  };
}

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

async function fetchBookingData(bookingId: string): Promise<BookingData | null> {
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id,
      starts_at,
      ends_at,
      status,
      notes,
      customer:customers!customer_id (
        name,
        phone,
        email
      ),
      service:services!service_id (
        name,
        duration_minutes,
        price_cents
      ),
      staff:staff!staff_id (
        name
      ),
      tenant:tenants!tenant_id (
        name,
        phone,
        address,
        slug
      )
    `)
    .eq("id", bookingId)
    .single();

  if (error) {
    console.error("Error fetching booking:", error);
    return null;
  }

  return booking as unknown as BookingData;
}

function formatDateTime(isoString: string, timezone: string = "America/Sao_Paulo"): string {
  const date = new Date(isoString);
  return date.toLocaleString("pt-BR", {
    timeZone: timezone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function buildMessage(type: NotificationPayload["type"], booking: BookingData): string {
  const dateTime = formatDateTime(booking.starts_at);
  const price = formatCurrency(booking.service.price_cents);
  const staffName = booking.staff?.name || "Profissional a definir";

  switch (type) {
    case "booking_confirmed":
      return `✅ *Agendamento Confirmado!*

Olá ${booking.customer.name}!

Seu agendamento foi confirmado com sucesso.

📅 *Data:* ${dateTime}
💇 *Serviço:* ${booking.service.name}
👤 *Profissional:* ${staffName}
💰 *Valor:* ${price}

📍 *Local:* ${booking.tenant.name}
${booking.tenant.address ? `📌 ${booking.tenant.address}` : ""}

Até lá! 👋`;

    case "booking_reminder":
      return `⏰ *Lembrete de Agendamento*

Olá ${booking.customer.name}!

Seu horário está chegando!

📅 *Data:* ${dateTime}
💇 *Serviço:* ${booking.service.name}
👤 *Profissional:* ${staffName}

📍 *Local:* ${booking.tenant.name}
${booking.tenant.address ? `📌 ${booking.tenant.address}` : ""}

Te esperamos! 🙂`;

    case "booking_cancelled":
      return `❌ *Agendamento Cancelado*

Olá ${booking.customer.name},

Seu agendamento foi cancelado.

📅 *Data:* ${dateTime}
💇 *Serviço:* ${booking.service.name}

Caso queira reagendar, acesse nosso site.

Atenciosamente,
${booking.tenant.name}`;

    case "booking_expired":
      return `⚠️ *Agendamento Expirado*

Olá ${booking.customer.name},

Infelizmente seu agendamento expirou por falta de pagamento.

📅 *Data:* ${dateTime}
💇 *Serviço:* ${booking.service.name}

Caso ainda queira agendar, acesse nosso site para escolher um novo horário.

Atenciosamente,
${booking.tenant.name}`;

    case "payment_received":
      return `💳 *Pagamento Confirmado!*

Olá ${booking.customer.name}!

Recebemos seu pagamento de ${price}.

📅 *Data:* ${dateTime}
💇 *Serviço:* ${booking.service.name}
👤 *Profissional:* ${staffName}

Seu agendamento está confirmado! ✅

Até lá! 👋
${booking.tenant.name}`;

    default:
      return `Notificação de ${booking.tenant.name}`;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: NotificationPayload = await req.json();
    console.log("Received notification request:", payload);

    const { type, booking_id, tenant_id } = payload;

    if (!type || !booking_id || !tenant_id) {
      console.error("Missing required fields:", { type, booking_id, tenant_id });
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, booking_id, tenant_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if tenant has WhatsApp connected
    const { data: whatsappConnection } = await supabase
      .from("whatsapp_connections")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("whatsapp_connected", true)
      .maybeSingle();

    if (!whatsappConnection) {
      console.log(`Tenant ${tenant_id} does not have WhatsApp connected. Skipping notification.`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          skipped: true,
          reason: "WhatsApp not connected for this tenant" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch booking data
    const booking = await fetchBookingData(booking_id);
    if (!booking) {
      console.error("Booking not found:", booking_id);
      return new Response(
        JSON.stringify({ error: "Booking not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build the message
    const message = buildMessage(type, booking);

    // Format phone number (remove non-digits and add country code if needed)
    let phone = booking.customer.phone.replace(/\D/g, "");
    if (!phone.startsWith("55")) {
      phone = "55" + phone;
    }

    // Prepare N8N webhook payload with tenant's Evolution instance
    const n8nPayload = {
      type,
      phone,
      message,
      evolution_instance: whatsappConnection.evolution_instance_name,
      booking: {
        id: booking.id,
        starts_at: booking.starts_at,
        ends_at: booking.ends_at,
        status: booking.status,
      },
      customer: {
        name: booking.customer.name,
        phone: booking.customer.phone,
        email: booking.customer.email,
      },
      service: {
        name: booking.service.name,
        duration_minutes: booking.service.duration_minutes,
        price_cents: booking.service.price_cents,
      },
      staff: booking.staff,
      tenant: {
        id: tenant_id,
        name: booking.tenant.name,
        slug: booking.tenant.slug,
      },
    };

    console.log("Sending to N8N with instance:", whatsappConnection.evolution_instance_name);

    // Send to N8N webhook
    const n8nWebhookUrl = Deno.env.get("N8N_WEBHOOK_URL");
    if (!n8nWebhookUrl) {
      console.error("N8N_WEBHOOK_URL not configured");
      return new Response(
        JSON.stringify({ error: "N8N webhook not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(n8nPayload),
    });

    const n8nResult = await n8nResponse.text();
    console.log("N8N response:", n8nResponse.status, n8nResult);

    if (!n8nResponse.ok) {
      console.error("N8N webhook failed:", n8nResponse.status, n8nResult);
      return new Response(
        JSON.stringify({ 
          error: "Failed to send notification", 
          details: n8nResult 
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully",
        phone,
        type,
        instance: whatsappConnection.evolution_instance_name
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-whatsapp-notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
