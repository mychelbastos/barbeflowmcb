/**
 * Shared helper for Mercado Pago token management.
 * Ensures access_token is always valid before use.
 * Automatically refreshes expired tokens using refresh_token.
 */

const TOKEN_REFRESH_BUFFER_MS = 30 * 60 * 1000; // Refresh 30 min before expiry

interface MpConnection {
  tenant_id: string;
  access_token: string;
  refresh_token: string | null;
  public_key: string | null;
  mp_user_id: string | null;
  token_expires_at: string | null;
}

interface ValidToken {
  access_token: string;
  tenant_id: string;
  public_key: string | null;
}

/**
 * Get a valid MP access_token for a specific tenant.
 * Refreshes automatically if expired or near expiry.
 */
export async function getValidMpToken(
  supabase: any,
  tenantId: string
): Promise<ValidToken | null> {
  const { data: conn, error } = await supabase
    .from('mercadopago_connections')
    .select('tenant_id, access_token, refresh_token, public_key, mp_user_id, token_expires_at')
    .eq('tenant_id', tenantId)
    .single();

  if (error || !conn) {
    console.error(`[MP-TOKEN] No MP connection for tenant ${tenantId}:`, error?.message);
    return null;
  }

  return ensureValidToken(supabase, conn);
}

/**
 * Get valid tokens for ALL tenants (used by webhook which doesn't know the tenant).
 * Returns array of valid tokens, refreshing any that are expired.
 */
export async function getAllValidMpTokens(
  supabase: any
): Promise<ValidToken[]> {
  const { data: connections, error } = await supabase
    .from('mercadopago_connections')
    .select('tenant_id, access_token, refresh_token, public_key, mp_user_id, token_expires_at');

  if (error || !connections?.length) {
    console.error('[MP-TOKEN] No MP connections found:', error?.message);
    return [];
  }

  const validTokens: ValidToken[] = [];
  for (const conn of connections) {
    const valid = await ensureValidToken(supabase, conn);
    if (valid) validTokens.push(valid);
  }
  return validTokens;
}

async function ensureValidToken(
  supabase: any,
  conn: MpConnection
): Promise<ValidToken | null> {
  if (!conn.access_token) {
    console.error(`[MP-TOKEN] Empty access_token for tenant ${conn.tenant_id}`);
    return null;
  }

  // Check if token needs refresh
  if (conn.token_expires_at) {
    const expiresAt = new Date(conn.token_expires_at).getTime();
    const now = Date.now();

    if (now >= expiresAt - TOKEN_REFRESH_BUFFER_MS) {
      console.log(`[MP-TOKEN] Token expired/expiring for tenant ${conn.tenant_id}, refreshing...`);
      const refreshed = await refreshMpToken(supabase, conn);
      if (refreshed) return refreshed;

      // If refresh failed but token hasn't actually expired yet, try using it
      if (now < expiresAt) {
        console.warn(`[MP-TOKEN] Refresh failed but token not yet expired, using existing token for tenant ${conn.tenant_id}`);
        return {
          access_token: conn.access_token,
          tenant_id: conn.tenant_id,
          public_key: conn.public_key,
        };
      }

      console.error(`[MP-TOKEN] Token expired and refresh failed for tenant ${conn.tenant_id}`);
      return null;
    }
  }

  // Token is valid
  return {
    access_token: conn.access_token,
    tenant_id: conn.tenant_id,
    public_key: conn.public_key,
  };
}

async function refreshMpToken(
  supabase: any,
  conn: MpConnection
): Promise<ValidToken | null> {
  if (!conn.refresh_token) {
    console.error(`[MP-TOKEN] No refresh_token for tenant ${conn.tenant_id}, cannot refresh`);
    return null;
  }

  const clientId = Deno.env.get('MP_CLIENT_ID');
  const clientSecret = Deno.env.get('MP_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    console.error('[MP-TOKEN] MP_CLIENT_ID or MP_CLIENT_SECRET not configured');
    return null;
  }

  try {
    const response = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: conn.refresh_token,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[MP-TOKEN] Refresh failed for tenant ${conn.tenant_id}: ${response.status} ${errorText}`);
      return null;
    }

    const tokenData = await response.json();
    const { access_token, refresh_token, expires_in, public_key: newPublicKey } = tokenData;

    if (!access_token) {
      console.error(`[MP-TOKEN] No access_token in refresh response for tenant ${conn.tenant_id}`);
      return null;
    }

    const newExpiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Update connection in database
    const { error: updateError } = await supabase
      .from('mercadopago_connections')
      .update({
        access_token,
        refresh_token: refresh_token || conn.refresh_token,
        public_key: newPublicKey || conn.public_key,
        token_expires_at: newExpiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_id', conn.tenant_id);

    if (updateError) {
      console.error(`[MP-TOKEN] Failed to save refreshed token for tenant ${conn.tenant_id}:`, updateError);
      // Still return the token — we got it, just couldn't persist
    }

    console.log(`[MP-TOKEN] Token refreshed successfully for tenant ${conn.tenant_id}, expires: ${newExpiresAt}`);

    return {
      access_token,
      tenant_id: conn.tenant_id,
      public_key: newPublicKey || conn.public_key,
    };
  } catch (err) {
    console.error(`[MP-TOKEN] Exception refreshing token for tenant ${conn.tenant_id}:`, err);
    return null;
  }
}
