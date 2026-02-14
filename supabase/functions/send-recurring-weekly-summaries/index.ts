import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppNotification, formatBrPhone } from "../_shared/whatsapp-notify.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('[WEEKLY-SUMMARY] Starting recurring weekly summaries...');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Get current date in São Paulo timezone
    const now = new Date();
    const spFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' });
    const todayStr = spFormatter.format(now); // YYYY-MM-DD

    // Calculate week start (Monday) and week end (Sunday) 
    const todayDate = new Date(todayStr);
    const dayOfWeek = todayDate.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(todayDate);
    weekStart.setDate(todayDate.getDate() + mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekStartStr = weekStart.toISOString().split('T')[0];
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    console.log(`[WEEKLY-SUMMARY] Week: ${weekStartStr} to ${weekEndStr}`);

    // Fetch all active recurring clients with their service, customer, staff, and tenant
    const { data: recurringClients, error } = await supabase
      .from('recurring_clients')
      .select(`
        id, weekday, start_time, duration_minutes, notes,
        customer:customers!customer_id(id, name, phone),
        service:services!service_id(id, name, duration_minutes, price_cents),
        staff:staff!staff_id(id, name),
        tenant_id
      `)
      .eq('active', true)
      .not('service_id', 'is', null);

    if (error) {
      console.error('Error fetching recurring clients:', error);
      return new Response(JSON.stringify({ error: 'Query failed' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!recurringClients || recurringClients.length === 0) {
      console.log('[WEEKLY-SUMMARY] No active recurring clients found');
      return new Response(JSON.stringify({ processed: 0, sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[WEEKLY-SUMMARY] Found ${recurringClients.length} recurring client entries`);

    // Group by tenant_id + customer_id
    const groupedByTenantCustomer: Record<string, {
      tenantId: string;
      customer: any;
      entries: any[];
    }> = {};

    for (const rc of recurringClients) {
      const customer = rc.customer as any;
      if (!customer?.phone) continue;

      const key = `${rc.tenant_id}_${customer.id}`;
      if (!groupedByTenantCustomer[key]) {
        groupedByTenantCustomer[key] = {
          tenantId: rc.tenant_id,
          customer,
          entries: [],
        };
      }
      groupedByTenantCustomer[key].entries.push(rc);
    }

    // Cache tenant data
    const tenantCache: Record<string, any> = {};
    async function getTenant(tenantId: string) {
      if (!tenantCache[tenantId]) {
        const { data } = await supabase.from('tenants').select('name, slug, address, settings').eq('id', tenantId).single();
        tenantCache[tenantId] = data;
      }
      return tenantCache[tenantId];
    }

    let sentCount = 0;
    let skippedCount = 0;

    const weekdayNames: Record<number, string> = {
      0: 'Domingo', 1: 'Segunda-feira', 2: 'Terça-feira',
      3: 'Quarta-feira', 4: 'Quinta-feira', 5: 'Sexta-feira', 6: 'Sábado',
    };

    for (const [key, group] of Object.entries(groupedByTenantCustomer)) {
      const tenant = await getTenant(group.tenantId);
      if (!tenant) continue;

      const settings = tenant.settings || {};

      // Check if weekly summary is enabled for this tenant (default: true)
      if (settings.weekly_summary_enabled === false) {
        skippedCount += group.entries.length;
        continue;
      }

      // Filter entries whose weekday falls within this week (all active entries for the week)
      const weekEntries = group.entries.filter(e => {
        // All active entries are relevant - they repeat every week
        return true;
      });

      if (weekEntries.length === 0) continue;

      // Sort by weekday then start_time
      weekEntries.sort((a: any, b: any) => {
        if (a.weekday !== b.weekday) return a.weekday - b.weekday;
        return a.start_time.localeCompare(b.start_time);
      });

      // Build schedule lines
      const scheduleLines = weekEntries.map((e: any) => {
        const service = e.service as any;
        const staff = e.staff as any;
        const dayName = weekdayNames[e.weekday] || `Dia ${e.weekday}`;
        const time = e.start_time.substring(0, 5); // HH:MM
        return `📅 *${dayName}* às ${time}\n💈 ${service?.name || 'Serviço'} | 👤 ${staff?.name || 'Profissional'}`;
      }).join('\n\n');

      const tenantName = tenant.name || 'modoGESTOR';
      const addressLine = tenant.address ? `\n📍 *Local:* ${tenant.address}` : '';

      const message = `📋 *Resumo Semanal - Seus Horários Fixos*\n\nOlá ${group.customer.name}!\n\nConfira seus horários desta semana:\n\n${scheduleLines}${addressLine}\n\nPara remarcar ou cancelar, entre em contato conosco.\n\n${tenantName}`;

      const dedupKey = `weekly_${group.tenantId}_${group.customer.id}_${weekStartStr}`;

      const sent = await sendWhatsAppNotification({
        supabase,
        tenantId: group.tenantId,
        phone: group.customer.phone,
        message,
        eventType: 'recurring_weekly_summary',
        tenantSlug: tenant.slug || '',
        dedupKey,
        extra: {
          customer_name: group.customer.name,
          customer_id: group.customer.id,
          week_start: weekStartStr,
          week_end: weekEndStr,
          schedule_count: weekEntries.length,
        },
      });

      if (sent) sentCount++;
      else skippedCount++;
    }

    console.log(`[WEEKLY-SUMMARY] Done. Groups: ${Object.keys(groupedByTenantCustomer).length}, Sent: ${sentCount}, Skipped: ${skippedCount}`);

    return new Response(JSON.stringify({
      groups: Object.keys(groupedByTenantCustomer).length,
      sent: sentCount,
      skipped: skippedCount,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in send-recurring-weekly-summaries:', error);
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
