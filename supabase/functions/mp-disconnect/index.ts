import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Usuário não autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get tenant_id from request body
    const { tenant_id } = await req.json();
    if (!tenant_id) {
      return new Response(
        JSON.stringify({ error: 'tenant_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin of tenant
    const { data: membership, error: membershipError } = await supabase
      .from('users_tenant')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership || membership.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Apenas administradores podem desconectar o Mercado Pago' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to delete connection and update tenant settings
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // Delete MP connection
    const { error: deleteError } = await adminSupabase
      .from('mercadopago_connections')
      .delete()
      .eq('tenant_id', tenant_id);

    if (deleteError) {
      console.error('Error deleting connection:', deleteError);
      return new Response(
        JSON.stringify({ error: 'Erro ao desconectar Mercado Pago' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get current tenant settings
    const { data: tenant, error: tenantError } = await adminSupabase
      .from('tenants')
      .select('settings')
      .eq('id', tenant_id)
      .single();

    if (tenantError) {
      console.error('Error fetching tenant:', tenantError);
    } else {
      // Update tenant settings to disable online payment
      const updatedSettings = {
        ...tenant.settings,
        allow_online_payment: false,
        require_prepayment: false,
      };

      const { error: updateError } = await adminSupabase
        .from('tenants')
        .update({ settings: updatedSettings })
        .eq('id', tenant_id);

      if (updateError) {
        console.error('Error updating tenant settings:', updateError);
      }
    }

    console.log('MP disconnected for tenant:', tenant_id);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-disconnect:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
