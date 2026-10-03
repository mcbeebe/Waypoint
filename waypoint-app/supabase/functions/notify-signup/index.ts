/**
 * notify-signup edge function — emails the owner when a new account is created.
 *
 * Migration 061 adds an AFTER INSERT trigger on auth.users that posts
 * `{ "user_id": "<uuid>", "capped": bool }` here via pg_net. The body carries
 * only the id: the function looks the user up itself with the service role,
 * so a forged call can at most re-send an alert about a real account. The
 * account email IS chosen by whoever signs up and appears in the alert
 * (HTML-escaped, but still their words) — treat it as untrusted text.
 * The trigger caps alerts at 10 per hour (see 061).
 *
 * Auth: verify_jwt=false (config.toml). Authenticity is the shared secret in
 * x-outbound-secret, compared timing-safe to OUTBOUND_CRON_SECRET (the same
 * Vault-held secret the reply poller uses, 052). Fails closed.
 *
 * Optional by design: with SIGNUP_NOTIFY_TO or RESEND_API_KEY unset it answers
 * 200 { skipped } and sends nothing. A sign-up never depends on this function
 * (pg_net is async and the trigger swallows its own errors), so every failure
 * here is reported in the response and logs, never retried.
 *
 * No CI covers Edge Functions — test by hand against a live project.
 *
 * Env: OUTBOUND_CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      RESEND_API_KEY, SIGNUP_NOTIFY_TO (comma-separated recipients),
 *      SIGNUP_NOTIFY_FROM (optional; default "Waypoint <hello@waypointchild.com>").
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { dashboardUsersUrl, renderSignupEmail } from '../_shared/signupNotify.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OUTBOUND_SECRET = Deno.env.get('OUTBOUND_CRON_SECRET') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const NOTIFY_TO = (Deno.env.get('SIGNUP_NOTIFY_TO') ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);
const FROM = Deno.env.get('SIGNUP_NOTIFY_FROM') ?? 'Waypoint <hello@waypointchild.com>';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length || a.length === 0) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  const secret = req.headers.get('x-outbound-secret') ?? '';
  if (!OUTBOUND_SECRET || !timingSafeEqual(secret, OUTBOUND_SECRET)) {
    return json({ error: 'unauthorized' }, 401);
  }

  let userId = '';
  let capped = false;
  try {
    const body = await req.json();
    userId = typeof body?.user_id === 'string' ? body.user_id : '';
    capped = body?.capped === true;
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!UUID.test(userId)) return json({ error: 'invalid_user_id' }, 400);

  if (NOTIFY_TO.length === 0 || !RESEND_API_KEY) {
    return json({ ok: true, skipped: 'not_configured' });
  }
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    return json({ error: 'server_misconfigured' }, 500);
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await admin.auth.admin.getUserById(userId);
    if (error || !data?.user) return json({ error: 'user_not_found' }, 404);
    const user = data.user;

    const { subject, text, html } = renderSignupEmail({
      email: user.email ?? null,
      provider: typeof user.app_metadata?.provider === 'string' ? user.app_metadata.provider : null,
      createdAt: user.created_at,
      confirmed: Boolean(user.email_confirmed_at),
      capped,
      userId: user.id,
      dashboardUrl: dashboardUsersUrl(SUPABASE_URL),
    });

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM, to: NOTIFY_TO, subject, text, html }),
    });
    if (!res.ok) {
      console.error('[notify-signup] resend failed', res.status);
      return json({ error: 'send_failed', status: res.status }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    console.error('[notify-signup] failed', e instanceof Error ? e.message : 'unknown');
    return json({ error: 'internal' }, 500);
  }
});
