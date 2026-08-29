/**
 * Gmail integration client (owner feedback, Aug 27) — thin wrapper over
 * the gmail edge function (send in-thread, sync replies) and the
 * ai-proxy draft-reply action. The Google refresh token never reaches
 * the client; every call rides the user's Supabase JWT.
 */
import { supabase } from './supabase';

const GMAIL_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/gmail`;
const AI_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

async function authedPost(url: string, body: Record<string, unknown>): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session?.access_token ?? ''}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify(body),
  });
}

export interface GmailStatus {
  connected: boolean;
  gmail: boolean;
  email: string | null;
  /**
   * True when we could not reach the function at all (offline, 5xx). The
   * caller must not read this as "not connected" — Home says which it was.
   */
  failed?: boolean;
}

/** Whether the account is Google-connected and holds Gmail scopes. */
export async function gmailStatus(): Promise<GmailStatus> {
  try {
    const resp = await authedPost(GMAIL_FN_URL, { action: 'status' });
    if (!resp.ok) return { connected: false, gmail: false, email: null, failed: true };
    return (await resp.json()) as GmailStatus;
  } catch {
    return { connected: false, gmail: false, email: null, failed: true };
  }
}

export interface GmailSendInput {
  to: string;
  subject: string;
  body: string;
  /** Existing paper-trail row to mark sent + attach thread ids to. */
  communicationId?: string;
  /** Reply in the thread of this paper-trail entry. */
  replyToCommunicationId?: string;
}

/** Send through the connected Gmail account. Returns thread/message ids. */
export async function gmailSend(
  input: GmailSendInput
): Promise<{ ok: boolean; threadId?: string | null; error?: string }> {
  try {
    const resp = await authedPost(GMAIL_FN_URL, { action: 'send', ...input });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return { ok: false, error: data?.error ?? `Send failed (${resp.status})` };
    }
    return { ok: true, threadId: data?.threadId ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Send failed' };
  }
}

/** Pull new replies on tracked threads into the paper trail. */
export async function gmailSyncReplies(): Promise<{ ok: boolean; newReplies: number; error?: string }> {
  try {
    const resp = await authedPost(GMAIL_FN_URL, { action: 'sync' });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return { ok: false, newReplies: 0, error: data?.error ?? `Sync failed (${resp.status})` };
    }
    return { ok: true, newReplies: data?.newReplies ?? 0 };
  } catch (err) {
    return { ok: false, newReplies: 0, error: err instanceof Error ? err.message : 'Sync failed' };
  }
}

/**
 * Auto-sync guard: screens call this on mount; it actually syncs at most
 * once per interval per app session so navigation doesn't hammer Gmail.
 */
let lastAutoSyncAt = 0;

export type AutoSyncOutcome =
  /** A sync completed and the mailbox really was read. */
  | 'checked'
  /** We tried and could not read it — offline, revoked grant, 5xx. */
  | 'failed'
  /** Another screen synced inside the interval; nothing new was read now. */
  | 'throttled'
  /** No Gmail connection to check. */
  | 'not_connected';

/**
 * The outcome is typed because Home prints it: a sensor line that says
 * "Gmail checked 3:42 PM" after a failed sync is exactly the false claim the
 * line exists to prevent. `ran` alone could not tell those apart.
 */
export async function autoSyncReplies(
  minIntervalMs = 5 * 60 * 1000
): Promise<{ outcome: AutoSyncOutcome; ran: boolean; newReplies: number }> {
  if (Date.now() - lastAutoSyncAt < minIntervalMs) {
    return { outcome: 'throttled', ran: false, newReplies: 0 };
  }
  lastAutoSyncAt = Date.now();
  const status = await gmailStatus();
  if (!status.gmail) {
    return {
      outcome: status.failed ? 'failed' : 'not_connected',
      ran: false,
      newReplies: 0,
    };
  }
  const result = await gmailSyncReplies();
  if (!result.ok) return { outcome: 'failed', ran: true, newReplies: 0 };
  return { outcome: 'checked', ran: true, newReplies: result.newReplies };
}

/** Waypoint's recommended reply to a thread, ready to edit and send. */
export async function draftGmailReply(input: {
  thread: string;
  instructions?: string;
  senderName?: string;
  childName?: string;
  tone?: 'warm' | 'professional' | 'strong';
}): Promise<{ ok: boolean; reply?: string; error?: string }> {
  try {
    const resp = await authedPost(AI_FN_URL, { action: 'draft-reply', ...input });
    const data = await resp.json().catch(() => null);
    if (!resp.ok) {
      return { ok: false, error: data?.error ?? `Drafting failed (${resp.status})` };
    }
    return { ok: true, reply: data?.reply ?? '' };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Drafting failed' };
  }
}
