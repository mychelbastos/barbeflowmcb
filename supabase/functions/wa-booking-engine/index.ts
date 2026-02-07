import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

// ── Helpers ────────────────────────────────────────────────────────────
function ok(reply: string | string[], nextStep: string, debug: Record<string, unknown> = {}) {
  return { should_reply: true, reply, next_step: nextStep, debug };
}

function skip() {
  return { should_reply: false, reply: null };
}

function error(msg?: string) {
  return ok(msg || "Tive um problema aqui 😕\nDigite *MENU* para recomeçar.", "ERROR");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.endsWith("@s.whatsapp.net")) return phone;
  return `${digits}@s.whatsapp.net`;
}

function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

const CONVERSATION_TIMEOUT_MS = 30 * 60 * 1000; // 30 min

// ── Post-action menu (reused after booking done or cancel) ─────────────
function postActionMenu() {
  return ok(
    `O que deseja fazer agora?\n\n` +
    `*1* - 📅 Fazer um novo agendamento\n` +
    `*2* - 🔙 Voltar ao menu principal\n` +
    `*3* - ❌ Finalizar atendimento automatizado\n\n` +
    `Digite o número da opção:`,
    "POST_ACTION"
  );
}

// ── State machine ──────────────────────────────────────────────────────
async function handleMenu(_text: string, _payload: Record<string, unknown>, tenantId: string, isFirstInteraction: boolean) {
  const { data: tenant } = await supabase
    .from("tenants")
    .select("name")
    .eq("id", tenantId)
    .single();

  const name = tenant?.name || "nossa barbearia";

  const menuMsg =
    `Olá! Bem-vindo(a) à *${name}* ✂️\n\n` +
    `O que deseja fazer?\n\n` +
    `*1* - 📅 Agendar horário\n` +
    `*2* - ❌ Cancelar atendimento automatizado (falar com um atendente)\n\n` +
    `Digite o número da opção:`;

  if (isFirstInteraction) {
    const introMsg =
      `Olá! 👋\n` +
      `Este é um sistema de agendamento automatizado feito por IA da *BarberFlow* ✂️\n\n` +
      `Siga as instruções abaixo para prosseguir com o agendamento.\n\n` +
      `Caso prefira, você pode cancelar o atendimento automatizado a qualquer momento para falar com um atendente humano.`;

    return ok([introMsg, menuMsg], "AWAIT_MENU_CHOICE");
  }

  return ok(menuMsg, "AWAIT_MENU_CHOICE");
}

async function handleAwaitMenuChoice(text: string, payload: Record<string, unknown>, tenantId: string) {
  const choice = text.trim();
  if (choice === "1") {
    return await handleChooseService(text, payload, tenantId);
  }
  if (choice === "2") {
    return ok(
      `Atendimento automatizado encerrado. 👋\n\n` +
      `Um atendente humano continuará a conversa em breve. Aguarde!`,
      "CANCELLED"
    );
  }
  return ok("Por favor, digite *1* para agendar ou *2* para falar com um atendente:", "AWAIT_MENU_CHOICE");
}

async function handleChooseService(text: string, payload: Record<string, unknown>, tenantId: string) {
  if (!payload._servicesShown) {
    const { data: services } = await supabase
      .from("services")
      .select("id, name, price_cents, duration_minutes")
      .eq("tenant_id", tenantId)
      .eq("active", true)
      .order("name");

    if (!services?.length) {
      return ok("Não temos serviços disponíveis no momento. Tente novamente mais tarde!", "MENU");
    }

    const list = services
      .map((s, i) => `*${i + 1}* - ${s.name} (${formatCurrency(s.price_cents)} • ${s.duration_minutes}min)`)
      .join("\n");

    payload._services = services;
    payload._servicesShown = true;

    return ok(`Escolha um serviço:\n\n${list}\n\nDigite o *número* do serviço:`, "CHOOSE_SERVICE");
  }

  const services = payload._services as Array<{ id: string; name: string; price_cents: number; duration_minutes: number }>;
  if (!services?.length) {
    return ok("Sessão expirada. Digite *MENU* para recomeçar.", "MENU");
  }

  const choice = parseInt(text, 10);
  if (isNaN(choice) || choice < 1 || choice > services.length) {
    return ok(`Por favor, digite um número de *1* a *${services.length}*:`, "CHOOSE_SERVICE");
  }

  const selected = services[choice - 1];
  payload.service_id = selected.id;
  payload.service_name = selected.name;
  payload.service_duration = selected.duration_minutes;
  payload.service_price = selected.price_cents;

  return await showStaffList(tenantId, selected.id, payload);
}

async function showStaffList(tenantId: string, serviceId: string, payload: Record<string, unknown>) {
  const { data: staffServices } = await supabase
    .from("staff_services")
    .select("staff_id")
    .eq("service_id", serviceId);

  let staffQuery = supabase
    .from("staff")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .eq("active", true)
    .order("name");

  if (staffServices && staffServices.length > 0) {
    const staffIds = staffServices.map((ss) => ss.staff_id);
    staffQuery = staffQuery.in("id", staffIds);
  }

  const { data: staffList } = await staffQuery;

  if (!staffList?.length) {
    return ok("Nenhum profissional disponível para este serviço. Digite *MENU* para recomeçar.", "MENU");
  }

  if (staffList.length === 1) {
    payload.staff_id = staffList[0].id;
    payload.staff_name = staffList[0].name;
    payload._staffAutoSelected = true;
    return ok(
      `Profissional: *${staffList[0].name}*\n\n` +
        `Agora me diga a *data* desejada no formato:\n*DD/MM/AAAA*\n\n` +
        `Exemplo: *15/03/2026*`,
      "CHOOSE_DATE"
    );
  }

  const list = staffList.map((s, i) => `*${i + 1}* - ${s.name}`).join("\n");
  payload._staffList = staffList;

  return ok(
    `Quem você prefere?\n\n${list}\n\nDigite o *número* do profissional:`,
    "CHOOSE_STAFF"
  );
}

async function handleChooseStaff(text: string, payload: Record<string, unknown>) {
  const staffList = payload._staffList as Array<{ id: string; name: string }>;
  if (!staffList?.length) {
    return ok("Sessão expirada. Digite *MENU* para recomeçar.", "MENU");
  }

  const choice = parseInt(text, 10);
  if (isNaN(choice) || choice < 1 || choice > staffList.length) {
    return ok(`Por favor, digite um número de *1* a *${staffList.length}*:`, "CHOOSE_STAFF");
  }

  const selected = staffList[choice - 1];
  payload.staff_id = selected.id;
  payload.staff_name = selected.name;

  return ok(
    `Profissional: *${selected.name}* ✅\n\n` +
      `Agora me diga a *data* desejada no formato:\n*DD/MM/AAAA*\n\n` +
      `Exemplo: *15/03/2026*`,
    "CHOOSE_DATE"
  );
}

async function handleChooseDate(text: string, payload: Record<string, unknown>) {
  const match = text.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (!match) {
    return ok("Formato inválido. Digite a data assim: *DD/MM/AAAA*\nExemplo: *15/03/2026*", "CHOOSE_DATE");
  }

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return ok("Data inválida. Verifique e tente novamente no formato *DD/MM/AAAA*:", "CHOOSE_DATE");
  }

  const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const dateObj = new Date(dateStr + "T12:00:00");
  if (isNaN(dateObj.getTime())) {
    return ok("Data inválida. Verifique e tente novamente:", "CHOOSE_DATE");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (dateObj < today) {
    return ok("Essa data já passou! Escolha uma data futura no formato *DD/MM/AAAA*:", "CHOOSE_DATE");
  }

  payload.date = dateStr;
  payload.date_display = `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;

  return { _action: "FETCH_SLOTS" } as any;
}

async function fetchAndShowSlots(tenantId: string, payload: Record<string, unknown>) {
  const { date, service_id, staff_id } = payload as {
    date: string;
    service_id: string;
    staff_id: string;
  };

  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const response = await fetch(`${supabaseUrl}/functions/v1/get-available-slots`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${anonKey}`,
      "apikey": anonKey,
    },
    body: JSON.stringify({ tenant_id: tenantId, date, service_id, staff_id }),
  });

  if (!response.ok) {
    console.error("get-available-slots error:", response.status);
    return ok("Erro ao buscar horários. Tente novamente digitando a data:", "CHOOSE_DATE");
  }

  const slotsData = await response.json();
  const slots = slotsData.available_slots || [];

  if (!slots.length) {
    return ok(
      `Não há horários disponíveis para *${payload.date_display}* 😕\n\n` +
        `Digite outra *data* no formato DD/MM/AAAA ou *MENU* para recomeçar:`,
      "CHOOSE_DATE"
    );
  }

  const displaySlots = slots.slice(0, 20);
  const list = displaySlots.map((s: any, i: number) => `*${i + 1}* - ${s.time}`).join("\n");
  payload._availableSlots = displaySlots;

  return ok(
    `📅 *${payload.date_display}* - Profissional: *${payload.staff_name}*\n\n` +
      `Horários disponíveis:\n\n${list}\n\n` +
      `Digite o *número* do horário:`,
    "CHOOSE_TIME"
  );
}

async function handleChooseTime(text: string, payload: Record<string, unknown>, tenantId: string) {
  const slots = payload._availableSlots as Array<{
    time: string; starts_at: string; ends_at: string; staff_id: string;
  }>;
  if (!slots?.length) {
    return ok("Sessão expirada. Digite *MENU* para recomeçar.", "MENU");
  }

  const choice = parseInt(text, 10);
  if (isNaN(choice) || choice < 1 || choice > slots.length) {
    return ok(`Digite um número de *1* a *${slots.length}*:`, "CHOOSE_TIME");
  }

  const selected = slots[choice - 1];
  payload.starts_at = selected.starts_at;
  payload.ends_at = selected.ends_at;
  payload.time_display = selected.time;

  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { data: hold, error: holdError } = await supabase
    .from("booking_holds")
    .insert({
      tenant_id: tenantId,
      remote_jid: payload._remote_jid as string,
      staff_id: payload.staff_id as string,
      service_id: payload.service_id as string,
      starts_at: selected.starts_at,
      ends_at: selected.ends_at,
      expires_at: expiresAt,
      status: "active",
    })
    .select("id")
    .single();

  if (holdError) {
    console.error("Error creating hold:", holdError);
  } else {
    payload.hold_id = hold?.id;
  }

  const { data: mpConn } = await supabase
    .from("mercadopago_connections")
    .select("id")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const { data: tenant } = await supabase
    .from("tenants")
    .select("settings")
    .eq("id", tenantId)
    .single();

  const allowOnline = tenant?.settings?.allow_online_payment && mpConn;

  if (allowOnline) {
    payload._hasOnlinePayment = true;
    return ok(
      `⏰ Horário reservado: *${selected.time}* em *${payload.date_display}*\n\n` +
        `Como deseja pagar?\n\n` +
        `*1* - 💵 Pagar no local\n` +
        `*2* - 📱 Pix online\n\n` +
        `Digite o número:`,
      "CHOOSE_PAYMENT"
    );
  }

  payload.payment_method = "local";
  return ok(
    `⏰ Horário reservado: *${selected.time}* em *${payload.date_display}*\n` +
      `💵 Pagamento no local\n\n` +
      `Por favor, me diga seu *nome completo*:`,
    "ASK_NAME"
  );
}

async function handleChoosePayment(text: string, payload: Record<string, unknown>) {
  if (text === "1") {
    payload.payment_method = "local";
  } else if (text === "2") {
    payload.payment_method = "pix";
  } else {
    return ok("Digite *1* para pagar no local ou *2* para Pix:", "CHOOSE_PAYMENT");
  }

  const methodLabel = payload.payment_method === "local" ? "💵 No local" : "📱 Pix online";
  return ok(
    `Forma de pagamento: ${methodLabel}\n\n` + `Por favor, me diga seu *nome completo*:`,
    "ASK_NAME"
  );
}

async function createPixCharge(tenantId: string, bookingId: string, amountCents: number, customerEmail?: string, customerName?: string) {
  try {
    const { data: mpConn } = await supabase
      .from("mercadopago_connections")
      .select("access_token")
      .eq("tenant_id", tenantId)
      .single();

    if (!mpConn?.access_token) {
      console.error("MP connection not found for PIX charge");
      return null;
    }

    // Create payment record
    const { data: paymentRecord, error: payErr } = await supabase
      .from("payments")
      .insert({
        tenant_id: tenantId,
        booking_id: bookingId,
        amount_cents: amountCents,
        status: "pending",
        provider: "mercadopago",
        currency: "BRL",
      })
      .select("id")
      .single();

    if (payErr || !paymentRecord) {
      console.error("Error creating payment record:", payErr);
      return null;
    }

    const mpBody = {
      transaction_amount: amountCents / 100,
      description: `Agendamento - ${customerName || "Cliente"}`,
      payment_method_id: "pix",
      payer: {
        email: customerEmail || "cliente@agendamento.com",
        first_name: customerName?.split(" ")[0] || "Cliente",
        last_name: customerName?.split(" ").slice(1).join(" ") || "",
      },
      external_reference: paymentRecord.id,
      metadata: {
        booking_id: bookingId,
        payment_id: paymentRecord.id,
        tenant_id: tenantId,
      },
    };

    const mpRes = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpConn.access_token}`,
        "X-Idempotency-Key": `wa-pix-${bookingId}-${Date.now()}`,
      },
      body: JSON.stringify(mpBody),
    });

    const mpResult = await mpRes.json();
    console.log("PIX charge result:", mpResult.id, mpResult.status);

    if (!mpRes.ok) {
      console.error("MP PIX error:", JSON.stringify(mpResult));
      await supabase.from("payments").update({ status: "failed" }).eq("id", paymentRecord.id);
      return null;
    }

    // Update payment with MP data
    await supabase.from("payments").update({
      external_id: mpResult.id?.toString(),
      status: mpResult.status === "approved" ? "paid" : "pending",
      updated_at: new Date().toISOString(),
    }).eq("id", paymentRecord.id);

    const txData = mpResult.point_of_interaction?.transaction_data;
    return {
      payment_id: paymentRecord.id,
      mp_payment_id: mpResult.id,
      status: mpResult.status,
      qr_code: txData?.qr_code || null,
      qr_code_base64: txData?.qr_code_base64 || null,
      ticket_url: txData?.ticket_url || null,
      expires_at: mpResult.date_of_expiration || null,
    };
  } catch (err) {
    console.error("createPixCharge error:", err);
    return null;
  }
}

async function handleAskName(text: string, payload: Record<string, unknown>, tenantId: string, phone: string) {
  const name = text.trim();
  if (name.length < 2) {
    return ok("Nome muito curto. Por favor, digite seu *nome completo*:", "ASK_NAME");
  }

  let cleanPhone = phone.replace(/\D/g, "").replace("@s.whatsapp.net", "");
  if (!(cleanPhone.length > 11 && cleanPhone.startsWith("55"))) {
    if (cleanPhone.length <= 11) cleanPhone = "55" + cleanPhone;
  }

  const { data: existingCustomer } = await supabase
    .from("customers")
    .select("id, name, email")
    .eq("tenant_id", tenantId)
    .eq("phone", cleanPhone)
    .maybeSingle();

  let customerId: string;
  let customerEmail: string | undefined;

  if (existingCustomer) {
    customerId = existingCustomer.id;
    customerEmail = existingCustomer.email || undefined;
    if (existingCustomer.name.toLowerCase() !== name.toLowerCase()) {
      await supabase.from("customers").update({ name }).eq("id", customerId);
    }
  } else {
    const { data: newCustomer, error: custError } = await supabase
      .from("customers")
      .insert({ tenant_id: tenantId, name, phone: cleanPhone })
      .select("id")
      .single();

    if (custError || !newCustomer) {
      console.error("Error creating customer:", custError);
      return error();
    }
    customerId = newCustomer.id;
  }

  const isPix = payload.payment_method === "pix";
  const bookingStatus = isPix ? "pending_payment" : "confirmed";

  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      tenant_id: tenantId,
      customer_id: customerId,
      service_id: payload.service_id as string,
      staff_id: payload.staff_id as string,
      starts_at: payload.starts_at as string,
      ends_at: payload.ends_at as string,
      status: bookingStatus,
      created_via: "whatsapp",
    })
    .select("id")
    .single();

  if (bookingError || !booking) {
    console.error("Error creating booking:", bookingError);
    return error();
  }

  if (payload.hold_id) {
    await supabase
      .from("booking_holds")
      .update({ status: "converted" })
      .eq("id", payload.hold_id as string);
  }

  const priceCents = (payload.service_price as number) || 0;

  const confirmationMsg =
    `🎉 *Agendamento ${isPix ? "criado" : "confirmado"}!*\n\n` +
    `📋 *Serviço:* ${payload.service_name}\n` +
    `👤 *Profissional:* ${payload.staff_name}\n` +
    `📅 *Data:* ${payload.date_display}\n` +
    `⏰ *Horário:* ${payload.time_display}\n` +
    `💰 *Valor:* ${formatCurrency(priceCents)}\n` +
    `📍 *Pagamento:* ${isPix ? "Pix" : "No local"}\n` +
    `📌 *Status:* ${isPix ? "⏳ Aguardando pagamento Pix" : "✅ Confirmado"}`;

  const postMenu =
    `O que deseja fazer agora?\n\n` +
    `*1* - 📅 Fazer um novo agendamento\n` +
    `*2* - 🔙 Voltar ao menu principal\n` +
    `*3* - ❌ Finalizar atendimento automatizado\n\n` +
    `Digite o número da opção:`;

  if (isPix) {
    const pixData = await createPixCharge(tenantId, booking.id, priceCents, customerEmail, name);

    if (!pixData) {
      // Fallback: booking created but PIX failed
      const fallbackMsg = confirmationMsg + "\n\n⚠️ Não foi possível gerar o Pix automaticamente. Entre em contato para efetuar o pagamento.";
      return ok([fallbackMsg, postMenu], "POST_ACTION");
    }

    const messages: string[] = [confirmationMsg];

    // PIX payment message
    let pixMsg = `📱 *Pagamento Pix*\n\n`;
    if (pixData.ticket_url) {
      pixMsg += `🔗 *Link de pagamento:*\n${pixData.ticket_url}\n\n`;
    }
    if (pixData.qr_code) {
      pixMsg += `📋 *Pix Copia e Cola:*\n\`\`\`${pixData.qr_code}\`\`\`\n\n`;
    }
    pixMsg += `⏰ Efetue o pagamento para confirmar seu agendamento.`;
    messages.push(pixMsg);

    messages.push(postMenu);

    // Store pix data in response for n8n (optional QR image)
    const result = ok(messages, "POST_ACTION");
    result.debug = {
      pix: {
        payment_link: pixData.ticket_url,
        pix_copia_e_cola: pixData.qr_code,
        qr_code_image_url: pixData.qr_code_base64 ? `data:image/png;base64,${pixData.qr_code_base64}` : null,
        payment_status: pixData.status,
        mp_payment_id: pixData.mp_payment_id,
      },
    };
    return result;
  }

  return ok([confirmationMsg, postMenu], "POST_ACTION");
}

async function handlePostAction(text: string, payload: Record<string, unknown>, tenantId: string) {
  const choice = text.trim();

  if (choice === "1") {
    // New booking: reset service-related payload but keep session
    const cleanPayload: Record<string, unknown> = {};
    return await handleChooseService("", cleanPayload, tenantId);
  }

  if (choice === "2") {
    return await handleMenu("", {}, tenantId, false);
  }

  if (choice === "3") {
    return ok(
      `Atendimento automatizado finalizado. 👋\n\nObrigado por usar nosso sistema! Até a próxima.`,
      "CANCELLED"
    );
  }

  return ok(
    "Por favor, digite *1* para novo agendamento, *2* para menu principal ou *3* para finalizar:",
    "POST_ACTION"
  );
}

// ── Main handler ───────────────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { tenant_id, phone, message_id, text } = body;

    if (!tenant_id || !phone || !message_id || text === undefined) {
      return new Response(
        JSON.stringify(error("Dados incompletos.")),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const remoteJid = normalizePhone(phone);
    const debugInfo = { tenant_id, phone: remoteJid };

    // ── Deduplication ──
    const { data: existingMsg } = await supabase
      .from("whatsapp_messages")
      .select("id")
      .eq("tenant_id", tenant_id)
      .eq("message_id", message_id)
      .maybeSingle();

    if (existingMsg) {
      const { data: convState } = await supabase
        .from("whatsapp_conversation_state")
        .select("last_message_id")
        .eq("tenant_id", tenant_id)
        .eq("remote_jid", remoteJid)
        .maybeSingle();

      if (convState?.last_message_id === message_id) {
        console.log("Duplicate message_id, skipping:", message_id);
        return new Response(JSON.stringify(skip()), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ── Get or create conversation state ──
    let { data: state } = await supabase
      .from("whatsapp_conversation_state")
      .select("*")
      .eq("tenant_id", tenant_id)
      .eq("remote_jid", remoteJid)
      .maybeSingle();

    const now = Date.now();
    let currentStep = "MENU";
    let payload: Record<string, unknown> = {};
    let isFirstInteraction = !state;

    if (state) {
      // If cancelled, don't respond to any further messages
      if (state.step === "CANCELLED") {
        return new Response(JSON.stringify(skip()), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const lastUpdated = new Date(state.updated_at).getTime();
      if (now - lastUpdated > CONVERSATION_TIMEOUT_MS) {
        currentStep = "MENU";
        payload = {};
        isFirstInteraction = true; // Treat timeout as fresh start
      } else {
        currentStep = state.step;
        payload = (state.payload as Record<string, unknown>) || {};
      }
    }

    // Global commands
    const normalizedText = text.trim().toLowerCase();
    if (normalizedText === "menu" || normalizedText === "voltar" || normalizedText === "cancelar" || normalizedText === "0") {
      currentStep = "MENU";
      payload = {};
    }

    payload._remote_jid = remoteJid;

    // ── State machine dispatch ──
    let result: any;

    switch (currentStep) {
      case "MENU":
        result = await handleMenu(text, payload, tenant_id, isFirstInteraction);
        break;
      case "AWAIT_MENU_CHOICE":
        result = await handleAwaitMenuChoice(text, payload, tenant_id);
        break;
      case "CHOOSE_SERVICE":
        result = await handleChooseService(text, payload, tenant_id);
        break;
      case "CHOOSE_STAFF":
        result = await handleChooseStaff(text, payload);
        break;
      case "CHOOSE_DATE":
        result = await handleChooseDate(text, payload);
        if (result?._action === "FETCH_SLOTS") {
          result = await fetchAndShowSlots(tenant_id, payload);
        }
        break;
      case "CHOOSE_TIME":
        result = await handleChooseTime(text, payload, tenant_id);
        break;
      case "CHOOSE_PAYMENT":
        result = await handleChoosePayment(text, payload);
        break;
      case "ASK_NAME":
        result = await handleAskName(text, payload, tenant_id, phone);
        break;
      case "POST_ACTION":
        result = await handlePostAction(text, payload, tenant_id);
        break;
      case "DONE":
        // Legacy: redirect to post-action
        result = postActionMenu();
        break;
      default:
        currentStep = "MENU";
        payload = {};
        result = await handleMenu(text, payload, tenant_id, true);
    }

    // ── Persist conversation state ──
    const nextStep = result.next_step || currentStep;

    const savePayload = { ...payload };
    delete savePayload._remote_jid;

    if (state) {
      await supabase
        .from("whatsapp_conversation_state")
        .update({
          step: nextStep,
          payload: savePayload,
          last_message_id: message_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", state.id);
    } else {
      await supabase.from("whatsapp_conversation_state").insert({
        tenant_id,
        remote_jid: remoteJid,
        step: nextStep,
        payload: savePayload,
        last_message_id: message_id,
      });
    }

    result.debug = debugInfo;

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("wa-booking-engine error:", err);
    return new Response(JSON.stringify(error()), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
