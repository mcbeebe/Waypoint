/**
 * poll-replies edge function (phase 7, Lane B — initiative 003, slice 7B-4).
 *
 * The true app-closed loop. A pg_cron job (migration 052) posts here via
 * pg_net every few minutes. This function, with the service role and no user
 * session: (1) server-side-syncs Gmail replies for every consenting family
 * (has a push token + Gmail connected), writing new incoming rows to the paper
 * trail; then (2) runs the same push pipeline as `push-send` to deliver a
 * "you have a reply" push exactly once. Because it fires without any device
 * open, a family learns of a reply even if they never open the app.
 *
 * Auth: verify_jwt=false (config.toml). Authenticity is the shared secret in
 * x-outbound-secret, compared timing-safe to OUTBOUND_CRON_SECRET. Fails closed.
 *
 * No CI covers Edge Functions — test by hand against a live project.
 *
 * Env: OUTBOUND_CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 *      GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { syncAllAccounts } from '../_shared/gmailSync.ts';
import { runPushSend } from '../_shared/pushSend.ts';
import { acquireLease, releaseLease } from '../_shared/lease.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const OUTBOUND_SECRET = Deno.env.get('OUTBOUND_CRON_SECRET') ?? '';

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
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  // Single-flight: if a prior run (or a manual push-send) still holds the lease,
  // skip rather than double-send. pg_net fires every 5 min and may retry.
  if (!(await acquireLease(supabase))) {
    return json({ ok: true, skipped: 'locked' });
  }
  try {
    const synced = await syncAllAccounts(supabase);
    const sent = await runPushSend(supabase);
    return json({ ok: true, synced, sent });
  } catch (e) {
    return json({ error: String(e) }, 500);
  } finally {
    await releaseLease(supabase);
  }
});
