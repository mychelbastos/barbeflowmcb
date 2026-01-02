import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://lovable.dev';

    console.log('OAuth callback received, code:', code ? 'present' : 'missing', 'state:', state ? 'present' : 'missing');

    if (!code || !state) {
      console.error('Missing code or state in callback');
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=missing_params`, 302);
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(atob(state));
    } catch (e) {
      console.error('Invalid state format:', e);
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=invalid_state`, 302);
    }

    const { tenant_id, exp } = stateData;

    // Check expiration
    if (!tenant_id || !exp || Date.now() > exp) {
      console.error('State expired or missing tenant_id');
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=expired`, 302);
    }

    // Get MP credentials
    const clientId = Deno.env.get('MP_CLIENT_ID');
    const clientSecret = Deno.env.get('MP_CLIENT_SECRET');
    const redirectUri = Deno.env.get('MP_REDIRECT_URI');

    if (!clientId || !clientSecret || !redirectUri) {
      console.error('MP credentials not configured');
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=config_error`, 302);
    }

    // Exchange code for tokens
    console.log('Exchanging code for tokens...');
    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=token_exchange_failed`, 302);
    }

    const tokenData = await tokenResponse.json();
    console.log('Token exchange successful, user_id:', tokenData.user_id);

    const {
      access_token,
      refresh_token,
      expires_in,
      user_id: mp_user_id,
    } = tokenData;

    if (!access_token) {
      console.error('No access_token in response');
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=no_token`, 302);
    }

    // Calculate token expiration
    const tokenExpiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Create Supabase client with service role for upserting connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Upsert mercadopago_connections
    const { error: upsertError } = await supabase
      .from('mercadopago_connections')
      .upsert({
        tenant_id,
        mp_user_id: mp_user_id?.toString(),
        access_token,
        refresh_token,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id',
      });

    if (upsertError) {
      console.error('Error upserting connection:', upsertError);
      return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=db_error`, 302);
    }

    console.log('MP connection saved for tenant:', tenant_id);

    // Redirect to settings with success
    return Response.redirect(`${frontBaseUrl}/app/settings?mp_connected=1`, 302);

  } catch (error) {
    console.error('Error in mp-oauth-callback:', error);
    const frontBaseUrl = Deno.env.get('FRONT_BASE_URL') || 'https://lovable.dev';
    return Response.redirect(`${frontBaseUrl}/app/settings?mp_error=server_error`, 302);
  }
});
