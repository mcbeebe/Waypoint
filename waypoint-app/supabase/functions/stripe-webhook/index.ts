/**
 * Stripe webhook → entitlements (PRD W-E: E1/E2).
 *
 * The only writer of self-paid entitlement rows. Checkout happens on
 * Stripe-hosted Payment Links; the app passes the family id as
 * client_reference_id, and this function turns subscription lifecycle
 * events into entitlement rows (service role — RLS does not apply).
 *
 * Env (Supabase function secrets):
 *   STRIPE_WEBHOOK_SECRET  the signing secret from the Stripe dashboard
 *   SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY  standard
 *
 * Events handled:
 *   checkout.session.completed          → activate (family from client_reference_id)
 *   customer.subscription.deleted       → cancel (match on subscription id)
 *   invoice.payment_failed              → no-op here (Stripe retries; the
 *                                         subscription.deleted event ends it)
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const encoder = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/** Verify the Stripe-Signature header (t=...,v1=...) against the raw body. */
async function verifySignature(payload: string, header: string | null): Promise<boolean> {
  if (!header || !WEBHOOK_SECRET) return false;
  const parts = Object.fromEntries(
    header.split(',').map((kv) => kv.split('=') as [string, string])
  );
  const t = parts.t;
  const v1 = parts.v1;
  if (!t || !v1) return false;
  // Reject stale events (5-minute tolerance) — replay protection.
  const age = Math.abs(Date.now() / 1000 - Number(t));
  if (!Number.isFinite(age) || age > 300) return false;
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(WEBHOOK_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = hex(await crypto.subtle.sign('HMAC', key, encoder.encode(`${t}.${payload}`)));
  return timingSafeEqual(sig, v1);
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const payload = await req.text();
  const valid = await verifySignature(payload, req.headers.get('stripe-signature'));
  if (!valid) return new Response('Invalid signature', { status: 400 });

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    event = JSON.parse(payload);
  } catch {
    return new Response('Bad payload', { status: 400 });
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const familyId = session.client_reference_id as string | null;
      const subscriptionId =
        (session.subscription as string | null) ?? (session.id as string);
      if (!familyId) {
        // A checkout we can't attribute is a real problem — surface it in
        // the function logs rather than silently succeeding.
        console.error('checkout.session.completed without client_reference_id', session.id);
        return new Response('ok (unattributed)', { status: 200 });
      }
      // Idempotent: re-delivered events land on the same live row. (The
      // uniqueness guarantee is a partial index, which PostgREST upsert
      // can't target — so check-then-write explicitly.)
      const { data: existing, error: readErr } = await supabase
        .from('entitlements')
        .select('id')
        .eq('family_id', familyId)
        .eq('sponsor_type', 'self')
        .eq('status', 'active')
        .maybeSingle();
      if (readErr) throw readErr;
      const { error } = existing
        ? await supabase
            .from('entitlements')
            .update({ source: subscriptionId })
            .eq('id', existing.id)
        : await supabase.from('entitlements').insert({
            family_id: familyId,
            tier: 'premium',
            sponsor_type: 'self',
            source: subscriptionId,
            status: 'active',
            period_start: new Date().toISOString().slice(0, 10),
            period_end: null,
          });
      if (error) throw error;
    } else if (event.type === 'customer.subscription.deleted') {
      const sub = event.data.object;
      const { error } = await supabase
        .from('entitlements')
        .update({
          status: 'canceled',
          period_end: new Date().toISOString().slice(0, 10),
        })
        .eq('source', sub.id as string)
        .eq('sponsor_type', 'self')
        .eq('status', 'active');
      if (error) throw error;
    }
    // Other events acknowledged without action.
    return new Response('ok', { status: 200 });
  } catch (err) {
    console.error('stripe-webhook error', event.type, err);
    // Non-2xx makes Stripe retry — correct for transient DB failures.
    return new Response('error', { status: 500 });
  }
});
