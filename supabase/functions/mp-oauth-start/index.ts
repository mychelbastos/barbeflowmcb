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

    // Verify user belongs to tenant
    const { data: membership, error: membershipError } = await supabase
      .from('users_tenant')
      .select('role')
      .eq('user_id', user.id)
      .eq('tenant_id', tenant_id)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: 'Você não tem acesso a esta barbearia' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get MP credentials from env
    const clientId = Deno.env.get('MP_CLIENT_ID');
    const redirectUri = Deno.env.get('MP_REDIRECT_URI');

    if (!clientId || !redirectUri) {
      console.error('MP_CLIENT_ID or MP_REDIRECT_URI not configured');
      return new Response(
        JSON.stringify({ error: 'Mercado Pago não configurado no servidor' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create state with tenant_id and expiration (JWT-like, but simple base64 for now)
    const stateData = {
      tenant_id,
      user_id: user.id,
      exp: Date.now() + 10 * 60 * 1000, // 10 minutes
    };
    const state = btoa(JSON.stringify(stateData));

    // Build OAuth URL
    const oauthUrl = new URL('https://auth.mercadopago.com.br/authorization');
    oauthUrl.searchParams.set('client_id', clientId);
    oauthUrl.searchParams.set('response_type', 'code');
    oauthUrl.searchParams.set('platform_id', 'mp');
    oauthUrl.searchParams.set('redirect_uri', redirectUri);
    oauthUrl.searchParams.set('state', state);

    console.log('Generated OAuth URL for tenant:', tenant_id);

    return new Response(
      JSON.stringify({ url: oauthUrl.toString() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-oauth-start:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
