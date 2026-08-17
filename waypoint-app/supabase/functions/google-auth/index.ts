/**
 * google-auth edge function — server-side Google OAuth token management.
 *
 * The web app connects Google through Supabase OAuth and stores the
 * refresh token in public.google_accounts (RLS: owner only). This
 * function holds the Google client secret and exchanges that refresh
 * token for short-lived access tokens on demand.
 *
 * Actions:
 *   - "refresh":    mint a fresh access token for the caller
 *   - "disconnect": revoke the grant at Google (best effort) and delete
 *                   the caller's stored refresh token
 *
 * Secrets required (supabase secrets set / dashboard):
 *   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing authorization' }, 401);
    }
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return json({ error: 'google_not_configured' }, 503);
    }

    // JWT-scoped client — RLS confines every query to the caller's rows.
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData?.user) {
      return json({ error: 'Invalid token' }, 401);
    }

    const { action } = await req.json();

    const { data: account } = await userClient
      .from('google_accounts')
      .select('refresh_token, google_email')
      .maybeSingle();

    if (!account) {
      return json({ error: 'reconnect_required' }, 401);
    }

    if (action === 'refresh') {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: account.refresh_token,
          grant_type: 'refresh_token',
        }),
      });
      const tokenData = await tokenResponse.json();

      if (!tokenResponse.ok) {
        // invalid_grant = user revoked access from their Google account —
        // the stored refresh token is dead; clear it so the app shows
        // "reconnect" instead of failing forever.
        if (tokenData?.error === 'invalid_grant') {
          await userClient.from('google_accounts').delete().neq('refresh_token', '');
          return json({ error: 'reconnect_required' }, 401);
        }
        console.error('Google token refresh failed:', JSON.stringify(tokenData));
        return json({ error: 'refresh_failed' }, 502);
      }

      return json({
        access_token: tokenData.access_token,
        expires_in: tokenData.expires_in ?? 3600,
        google_email: account.google_email,
      });
    }

    if (action === 'disconnect') {
      // Best-effort revoke at Google; the delete is what matters locally.
      try {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(account.refresh_token)}`,
          { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );
      } catch {
        // Network failure on revoke is non-fatal
      }
      await userClient.from('google_accounts').delete().neq('refresh_token', '');
      return json({ disconnected: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    console.error('google-auth error:', err);
    return json({ error: 'Internal error' }, 500);
  }
});
