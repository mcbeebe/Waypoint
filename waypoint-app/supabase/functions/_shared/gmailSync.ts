/**
 * Server-side Gmail reply sync (phase 7, Lane B — 7B-4), run by the cron
 * poller with the service role and NO user session. It mirrors the per-thread
 * sync in functions/gmail (action "sync") — the two must stay behaviourally
 * aligned; this copy exists because the cron has no caller JWT and sweeps many
 * families, which the user-scoped gmail function cannot. Not folded into gmail
 * to avoid refactoring the production send/sync path in this PR.
 *
 * Consent + cost scope: only families that have a push token (notifications
 * ON) are synced. A family that never opted in is never server-side Gmail-read
 * here, and the sweep is bounded regardless.
 *
 * No CI covers Edge Functions — test by hand against a live project.
 */
import type { createClient } from 'jsr:@supabase/supabase-js@2';

type Supabase = ReturnType<typeof createClient>;

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

/** Bounds so one sweep finishes well under the edge-function wall clock
 *  (~150s). Accounts are processed least-recently-synced first and stamped, so
 *  runs ROTATE through everyone across cycles — no account is ever starved, and
 *  the per-run work is capped regardless of how many families connect. */
const MAX_ACCOUNTS = 25;
const THREADS_PER_ACCOUNT = 15;

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  headers?: Array<{ name: string; value: string }>;
}

function decodeB64url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

function extractText(payload: GmailPayload | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeB64url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const t = extractText(part);
    if (t) return t;
  }
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeB64url(payload.body.data)
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+\n/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .trim();
  }
  return '';
}

function header(payload: GmailPayload | undefined, name: string): string {
  return (
    payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
  );
}

async function accessTokenFor(refreshToken: string): Promise<string | null> {
  const resp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!resp.ok) return null; // revoked/expired grant → the family reconnects in-app
  return (await resp.json()).access_token as string;
}

/** Sync one family's tracked threads. Returns the count of new incoming rows. */
async function syncFamily(
  supabase: Supabase,
  familyId: string,
  selfEmail: string,
  accessToken: string
): Promise<number> {
  const gmailHeaders = { Authorization: `Bearer ${accessToken}` };

  const { data: tracked } = await supabase
    .from('communications')
    .select('gmail_thread_id')
    .eq('family_id', familyId)
    .eq('direction', 'outgoing')
    .not('gmail_thread_id', 'is', null)
    .order('created_at', { ascending: false })
    .limit(THREADS_PER_ACCOUNT);
  const threadIds = [
    ...new Set(((tracked ?? []) as { gmail_thread_id: string }[]).map((t) => t.gmail_thread_id)),
  ];
  if (threadIds.length === 0) return 0;

  const { data: known } = await supabase
    .from('communications')
    .select('gmail_message_id')
    .eq('family_id', familyId)
    .not('gmail_message_id', 'is', null);
  const knownIds = new Set(
    ((known ?? []) as { gmail_message_id: string }[]).map((k) => k.gmail_message_id)
  );
  const self = selfEmail.toLowerCase();

  let newReplies = 0;
  for (const threadId of threadIds) {
    const resp = await fetch(`${GMAIL_API}/threads/${threadId}?format=full`, {
      headers: gmailHeaders,
    });
    if (!resp.ok) continue;
    const thread = await resp.json();
    for (const msg of thread.messages ?? []) {
      if (knownIds.has(msg.id)) continue;
      const from = header(msg.payload, 'From');
      if (self && from.toLowerCase().includes(self)) continue; // our own message
      if ((msg.labelIds ?? []).includes('SENT')) continue;
      const text = extractText(msg.payload).slice(0, 20_000);
      if (!text) continue;
      const receivedAt = new Date(Number(msg.internalDate ?? Date.now())).toISOString();
      const { error } = await supabase.from('communications').insert({
        family_id: familyId,
        kind: 'email',
        subject: header(msg.payload, 'Subject') || '(no subject)',
        body: text,
        organization: 'regional_center',
        contact: from,
        status: 'sent',
        sent_at: receivedAt,
        occurred_at: receivedAt,
        gmail_thread_id: threadId,
        gmail_message_id: msg.id,
        direction: 'incoming',
      });
      if (!error) {
        knownIds.add(msg.id);
        newReplies++;
      }
    }
  }
  return newReplies;
}

/**
 * Sync every consenting family (has a push token, has Gmail connected).
 * Returns totals for the run.
 */
export async function syncAllAccounts(
  supabase: Supabase
): Promise<{ accounts: number; newReplies: number }> {
  // Only families whose token carries the explicit app-closed-sync consent
  // (owner #1/B). Wanting push is NOT consent to a background server-side
  // mailbox read; server_sync gates that read specifically. (Reply pushes for
  // replies synced while the app was open still reach everyone with a token —
  // that path runs in runPushSend, which is not gated here.)
  const { data: tokenRows } = await supabase
    .from('push_tokens')
    .select('family_id')
    .eq('server_sync', true);
  const familyIds = [
    ...new Set(((tokenRows ?? []) as { family_id: string }[]).map((t) => t.family_id)),
  ];
  if (familyIds.length === 0) return { accounts: 0, newReplies: 0 };

  // Map those families → their owner user_ids → Gmail-connected accounts.
  const { data: fams } = await supabase
    .from('families')
    .select('id, user_id')
    .in('id', familyIds);
  const familyByUser = new Map<string, string>();
  for (const f of (fams ?? []) as { id: string; user_id: string }[]) {
    if (f.user_id) familyByUser.set(f.user_id, f.id);
  }
  const userIds = [...familyByUser.keys()];
  if (userIds.length === 0) return { accounts: 0, newReplies: 0 };

  // Least-recently-synced first (nulls = never synced) so runs rotate through
  // all accounts and never starve the tail; capped per run for the wall clock.
  const { data: accounts } = await supabase
    .from('google_accounts')
    .select('user_id, google_email, refresh_token, scopes')
    .in('user_id', userIds)
    .order('synced_at', { ascending: true, nullsFirst: true })
    .limit(MAX_ACCOUNTS);

  let processed = 0;
  let newReplies = 0;
  for (const acc of (accounts ?? []) as {
    user_id: string;
    google_email: string | null;
    refresh_token: string;
    scopes: string | null;
  }[]) {
    // Stamp synced_at for EVERY account we take this run — processed, skipped
    // for missing scopes, or a failed token refresh alike — so the rotation
    // advances and a stuck account can't be re-selected every cycle.
    const stampSynced = () =>
      supabase
        .from('google_accounts')
        .update({ synced_at: new Date().toISOString() })
        .eq('user_id', acc.user_id);

    const hasGmail = GMAIL_SCOPES.every((s) => (acc.scopes ?? '').includes(s));
    const familyId = familyByUser.get(acc.user_id);
    if (!hasGmail || !familyId) {
      await stampSynced();
      continue;
    }
    const token = await accessTokenFor(acc.refresh_token);
    if (!token) {
      await stampSynced();
      continue;
    }
    processed += 1;
    newReplies += await syncFamily(supabase, familyId, acc.google_email ?? '', token);
    await stampSynced();
  }
  return { accounts: processed, newReplies };
}
