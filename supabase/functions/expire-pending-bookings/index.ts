import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const EXPIRATION_MINUTES = 5;

// Helper function to send WhatsApp notification
async function sendWhatsAppNotification(supabaseUrl: string, anonKey: string, bookingId: string, tenantId: string) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/send-whatsapp-notification`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
      },
      body: JSON.stringify({
        type: 'booking_expired',
        booking_id: bookingId,
        tenant_id: tenantId,
      }),
    });
    
    if (!response.ok) {
      console.error(`Failed to send expiration notification for booking ${bookingId}:`, await response.text());
    } else {
      console.log(`Expiration notification sent for booking ${bookingId}`);
    }
  } catch (error) {
    console.error(`Error sending expiration notification for booking ${bookingId}:`, error);
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log(`[${new Date().toISOString()}] Running expire-pending-bookings`);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Calculate cutoff time (5 minutes ago)
    const cutoffTime = new Date(Date.now() - (EXPIRATION_MINUTES * 60 * 1000)).toISOString();
    
    console.log(`Looking for pending_payment bookings created before: ${cutoffTime}`);

    // Find all bookings with status 'pending_payment' created more than 5 minutes ago
    const { data: expiredBookings, error: fetchError } = await supabase
      .from('bookings')
      .select('id, tenant_id, customer_id, service_id, starts_at, created_at')
      .eq('status', 'pending_payment')
      .lt('created_at', cutoffTime);

    if (fetchError) {
      console.error('Error fetching expired bookings:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch expired bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!expiredBookings || expiredBookings.length === 0) {
      console.log('No expired bookings found');
      return new Response(
        JSON.stringify({ message: 'No expired bookings', expired_count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${expiredBookings.length} expired booking(s)`);

    // Update all expired bookings to status 'expired'
    const bookingIds = expiredBookings.map(b => b.id);
    
    const { error: updateError } = await supabase
      .from('bookings')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('id', bookingIds);

    if (updateError) {
      console.error('Error updating bookings to expired:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update expired bookings' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Also update associated payments to expired
    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ 
        status: 'expired',
        updated_at: new Date().toISOString()
      })
      .in('booking_id', bookingIds)
      .eq('status', 'pending');

    if (paymentUpdateError) {
      console.error('Error updating payments to expired:', paymentUpdateError);
      // Don't fail the whole operation, just log
    }

    // Send WhatsApp notifications for each expired booking
    for (const booking of expiredBookings) {
      await sendWhatsAppNotification(supabaseUrl, anonKey, booking.id, booking.tenant_id);
    }

    console.log(`Successfully expired ${expiredBookings.length} booking(s):`, bookingIds);

    return new Response(
      JSON.stringify({ 
        message: 'Expired bookings processed',
        expired_count: expiredBookings.length,
        booking_ids: bookingIds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in expire-pending-bookings:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
