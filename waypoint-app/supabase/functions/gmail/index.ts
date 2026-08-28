/**
 * gmail edge function — send letters through the connected Gmail account
 * and sync thread replies into the paper trail (owner feedback, Aug 27:
 * "track responses to an email thread and propose recommendations for
 * responses instead of copying and pasting").
 *
 * Auth: standard Supabase JWT (config verify_jwt=true). The Google
 * refresh token lives in public.google_accounts (RLS: owner only) and is
 * read with the caller's own JWT — this function holds only the Google
 * client secret, shared with google-auth.
 *
 * Actions:
 *   - "status": { connected, gmail, email } — whether Gmail scopes are held
 *   - "send":   { to, subject, body, communicationId?, replyToCommunicationId? }
 *               Sends via the Gmail API. Replies thread properly
 *               (threadId + In-Reply-To/References). Updates/creates the
 *               paper-trail row with thread + message ids.
 *   - "sync":   pulls new messages on every tracked thread, inserts
 *               incoming replies into communications (idempotent on
 *               gmail_message_id). Returns { newReplies }.
 *
 * Secrets required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET (already set
 * for google-auth; Supabase secrets are project-wide).
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID') ?? '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET') ?? '';

const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';
const GMAIL_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

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

/** Base64url for the Gmail raw message format. */
function b64url(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function decodeB64url(data: string): string {
  const b64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

/** RFC 2047 encode a header value if it has non-ASCII characters. */
function encodeHeader(value: string): string {
  // deno-lint-ignore no-control-regex
  return /[^\x00-\x7F]/.test(value) ? `=?UTF-8?B?${b64url(value).replace(/-/g, '+').replace(/_/g, '/')}?=` : value;
}

interface GmailPayload {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayload[];
  headers?: Array<{ name: string; value: string }>;
}

/** Best-effort plain-text extraction from a Gmail message payload. */
function extractText(payload: GmailPayload | undefined): string {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeB64url(payload.body.data);
  }
  for (const part of payload.parts ?? []) {
    const t = extractText(part);
    if (t) return t;
  }
  // Fall back to HTML stripped to text
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

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);

  const authHeader = req.headers.get('Authorization') ?? '';
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return json({ error: 'Not authenticated' }, 401);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON' }, 400);
  }
  const action = body.action as string;

  // ── Google account + access token (owner-scoped via RLS) ─────────
  const { data: account } = await userClient
    .from('google_accounts')
    .select('refresh_token, google_email, scopes')
    .maybeSingle();
  const hasGmail =
    !!account && GMAIL_SCOPES.every((s) => (account.scopes ?? '').includes(s));

  if (action === 'status') {
    return json({
      connected: !!account,
      gmail: hasGmail,
      email: account?.google_email ?? null,
    });
  }

  if (!account) return json({ error: 'google_not_connected' }, 401);
  if (!hasGmail) return json({ error: 'gmail_scopes_missing' }, 403);

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: account.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  if (!tokenResp.ok) {
    // invalid_grant = revoked/expired grant → the client should reconnect
    return json({ error: 'reconnect_required' }, 401);
  }
  const accessToken = (await tokenResp.json()).access_token as string;
  const gmailHeaders = { Authorization: `Bearer ${accessToken}` };

  // Family id for paper-trail writes (RLS-scoped to the caller anyway)
  const { data: family } = await userClient.from('families').select('id').maybeSingle();

  // ── Send (new message or threaded reply) ─────────────────────────
  if (action === 'send') {
    const to = String(body.to ?? '').trim();
    const subject = String(body.subject ?? '').trim();
    const messageBody = String(body.body ?? '');
    const communicationId = (body.communicationId as string) || null;
    const replyToCommunicationId = (body.replyToCommunicationId as string) || null;
    if (!to || !messageBody) return json({ error: 'to and body are required' }, 400);
    if (messageBody.length > 100_000) return json({ error: 'body too large' }, 400);

    // Threading: pull thread id + last Message-ID when replying
    let threadId: string | null = null;
    let inReplyTo = '';
    let references = '';
    let replySubject = subject;
    if (replyToCommunicationId) {
      const { data: prior } = await userClient
        .from('communications')
        .select('gmail_thread_id, subject')
        .eq('id', replyToCommunicationId)
        .maybeSingle();
      threadId = prior?.gmail_thread_id ?? null;
      if (threadId) {
        const threadResp = await fetch(
          `${GMAIL_API}/threads/${threadId}?format=metadata&metadataHeaders=Message-ID&metadataHeaders=References`,
          { headers: gmailHeaders }
        );
        if (threadResp.ok) {
          const thread = await threadResp.json();
          const last = thread.messages?.[thread.messages.length - 1];
          inReplyTo = header(last?.payload, 'Message-ID');
          references = [header(last?.payload, 'References'), inReplyTo]
            .filter(Boolean)
            .join(' ');
        }
        if (!replySubject) {
          const base = (prior?.subject ?? '').replace(/^(re:\s*)+/i, '');
          replySubject = base ? `Re: ${base}` : 'Re:';
        }
      }
    }

    const raw = [
      `To: ${to}`,
      `Subject: ${encodeHeader(replySubject || subject || '(no subject)')}`,
      inReplyTo ? `In-Reply-To: ${inReplyTo}` : '',
      references ? `References: ${references}` : '',
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset="UTF-8"',
      'Content-Transfer-Encoding: base64',
      '',
      b64url(messageBody).replace(/-/g, '+').replace(/_/g, '/'),
    ]
      .filter((l) => l !== '')
      .join('\r\n');

    const sendResp = await fetch(`${GMAIL_API}/messages/send`, {
      method: 'POST',
      headers: { ...gmailHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw: b64url(raw), ...(threadId ? { threadId } : {}) }),
    });
    if (!sendResp.ok) {
      const err = await sendResp.json().catch(() => null);
      return json(
        { error: err?.error?.message ?? `Gmail send failed (${sendResp.status})` },
        502
      );
    }
    const sent = await sendResp.json();

    // Paper trail: update the existing draft row, or record the reply
    if (communicationId) {
      await userClient
        .from('communications')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          gmail_thread_id: sent.threadId ?? null,
          gmail_message_id: sent.id ?? null,
          direction: 'outgoing',
        })
        .eq('id', communicationId);
    } else if (family?.id) {
      await userClient.from('communications').insert({
        family_id: family.id,
        kind: 'email',
        subject: replySubject || subject,
        body: messageBody,
        organization: 'regional_center',
        contact: to,
        status: 'sent',
        sent_at: new Date().toISOString(),
        gmail_thread_id: sent.threadId ?? null,
        gmail_message_id: sent.id ?? null,
        direction: 'outgoing',
      });
    }

    return json({ ok: true, threadId: sent.threadId ?? null, messageId: sent.id ?? null });
  }

  // ── Sync replies on tracked threads ──────────────────────────────
  if (action === 'sync') {
    const { data: tracked } = await userClient
      .from('communications')
      .select('gmail_thread_id, family_id')
      .not('gmail_thread_id', 'is', null)
      .eq('direction', 'outgoing')
      .order('created_at', { ascending: false })
      .limit(25);
    const threadIds = [...new Set((tracked ?? []).map((t) => t.gmail_thread_id as string))];
    if (threadIds.length === 0) return json({ newReplies: 0 });

    const { data: known } = await userClient
      .from('communications')
      .select('gmail_message_id')
      .not('gmail_message_id', 'is', null);
    const knownIds = new Set((known ?? []).map((k) => k.gmail_message_id as string));
    const selfEmail = (account.google_email ?? '').toLowerCase();

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
        // Skip the family's own messages (already in the trail, or sent
        // from Gmail directly — those aren't replies to surface)
        if (selfEmail && from.toLowerCase().includes(selfEmail)) continue;
        if ((msg.labelIds ?? []).includes('SENT')) continue;
        const text = extractText(msg.payload).slice(0, 20_000);
        if (!text) continue;
        const fam = tracked?.find((t) => t.gmail_thread_id === threadId)?.family_id;
        if (!fam) continue;
        const receivedAt = new Date(Number(msg.internalDate ?? Date.now())).toISOString();
        const { error: insertErr } = await userClient.from('communications').insert({
          family_id: fam,
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
        if (!insertErr) {
          knownIds.add(msg.id);
          newReplies++;
        }
      }
    }
    return json({ newReplies });
  }

  return json({ error: `Unknown action: ${action}` }, 400);
});
