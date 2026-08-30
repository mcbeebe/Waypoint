/**
 * push-send edge function (phase 7, Lane B — initiative 003, slice 7B-3).
 *
 * The server-side "you have a reply" sender. Scans the paper trail for incoming
 * replies that still owe a push (never notified, not already answered), sends
 * ONE push per family via Expo (per-device language), and stamps
 * communications.notified_at so each reply fires exactly once. The pipeline
 * lives in _shared/pushSend.ts so the cron poller (7B-4) reuses it directly.
 *
 * Auth: verify_jwt=false (config.toml) — no user session; called by the cron
 * poller and invocable by the owner to test. Authenticity is a shared secret in
 * the x-outbound-secret header, compared timing-safe to OUTBOUND_CRON_SECRET.
 * No secret set → refuses (fails closed).
 *
 * No CI covers Edge Functions — test by hand against a live project.
 *
 * Env: OUTBOUND_CRON_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';
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

export function timingSafeEqual(a: string, b: string): boolean {
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
  // Share the outbound lease with poll-replies so a manual send can't race the
  // cron into a double-push.
  if (!(await acquireLease(supabase))) {
    return json({ ok: true, skipped: 'locked' });
  }
  try {
    const result = await runPushSend(supabase);
    return json({ ok: true, ...result });
  } catch (e) {
    return json({ error: String(e) }, 500);
  } finally {
    await releaseLease(supabase);
  }
});
