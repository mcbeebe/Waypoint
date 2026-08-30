/**
 * The reply-push pipeline, shared by the `push-send` function (7B-3, invoked
 * directly) and the `poll-replies` cron function (7B-4, which syncs Gmail then
 * calls this). Kept out of either index.ts so poll-replies can reuse it without
 * importing a module that runs Deno.serve at import time.
 *
 * Selection + copy come from _shared/replyPush.ts (mirror of the tested
 * src/lib/replyPush.ts). No CI covers Edge Functions — test by hand.
 */
import type { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  pendingReplyPushes,
  groupByFamily,
  replyCopy,
  pushLocale,
  type ReplyRow,
} from './replyPush.ts';

type Supabase = ReturnType<typeof createClient>;

const EXPO_PUSH_API = 'https://exp.host/--/api/v2/push/send';
/** Bound each run so one sweep can't fan out unbounded. */
const SCAN_LIMIT = 300;

interface PushOutcome {
  /** At least one device actually accepted the push. */
  delivered: boolean;
  /** Tokens Expo reports as gone (DeviceNotRegistered) — prune them. */
  deadTokens: string[];
  /** The send call itself failed (network) — nothing decided, retry next run. */
  transportFailed: boolean;
}

/**
 * Push for one family: one message per registered device, in that device's
 * language. The Expo API returns HTTP 200 even when individual tickets fail,
 * so we MUST read the per-ticket statuses: a DeviceNotRegistered token is dead
 * (reinstall / new phone) and must be pruned, or it "succeeds" forever and the
 * family silently loses every reply. Delivery is true only if a ticket came
 * back ok — the caller stamps notified_at only then.
 */
async function sendFamilyPush(
  tokens: { expo_token: string; locale: string | null }[],
  count: number
): Promise<PushOutcome> {
  const messages = tokens.map((t) => {
    const copy = replyCopy(count, pushLocale(t.locale));
    return { to: t.expo_token, title: copy.title, body: copy.body, sound: 'default' };
  });
  if (messages.length === 0) return { delivered: false, deadTokens: [], transportFailed: false };
  try {
    const resp = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    if (!resp.ok) return { delivered: false, deadTokens: [], transportFailed: true };
    const body = await resp.json().catch(() => null);
    const tickets: { status?: string; details?: { error?: string } }[] = body?.data ?? [];
    let delivered = false;
    const deadTokens: string[] = [];
    tickets.forEach((ticket, i) => {
      if (ticket?.status === 'ok') delivered = true;
      else if (ticket?.details?.error === 'DeviceNotRegistered' && tokens[i]) {
        deadTokens.push(tokens[i].expo_token);
      }
    });
    // A 200 with no parseable tickets: treat as delivered (don't re-spam) but
    // nothing to prune.
    if (tickets.length === 0) delivered = true;
    return { delivered, deadTokens, transportFailed: false };
  } catch {
    return { delivered: false, deadTokens: [], transportFailed: true };
  }
}

export async function runPushSend(
  supabase: Supabase
): Promise<{ families: number; pushed: number; rows: number }> {
  // Candidate incoming replies never pushed (partial index
  // communications_unnotified_incoming_idx serves this exactly).
  const { data: incoming } = await supabase
    .from('communications')
    .select('id, family_id, direction, gmail_thread_id, occurred_at, notified_at')
    .eq('direction', 'incoming')
    .is('notified_at', null)
    .order('occurred_at', { ascending: false })
    .limit(SCAN_LIMIT);
  const incomingRows = (incoming ?? []) as ReplyRow[];
  if (incomingRows.length === 0) return { families: 0, pushed: 0, rows: 0 };

  // Outgoing rows on those threads decide "already answered".
  const threadIds = [
    ...new Set(incomingRows.map((r) => r.gmail_thread_id).filter((t): t is string => !!t)),
  ];
  let outgoing: ReplyRow[] = [];
  if (threadIds.length > 0) {
    const { data: out } = await supabase
      .from('communications')
      .select('id, family_id, direction, gmail_thread_id, occurred_at, notified_at')
      .eq('direction', 'outgoing')
      .in('gmail_thread_id', threadIds);
    outgoing = (out ?? []) as ReplyRow[];
  }

  const pending = pendingReplyPushes([...incomingRows, ...outgoing]);
  const byFamily = groupByFamily(pending);

  let pushed = 0;
  for (const [familyId, rows] of byFamily) {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('expo_token, locale')
      .eq('family_id', familyId);
    const list = (tokens ?? []) as { expo_token: string; locale: string | null }[];

    let stamp: boolean;
    if (list.length === 0) {
      // No token = notifications off (consent withdrawn) or no device: nothing
      // to deliver AND nothing to retry, so stamp so the row doesn't re-scan
      // forever and a later opt-in doesn't retro-push a stale reply.
      stamp = true;
    } else {
      const outcome = await sendFamilyPush(list, rows.length);
      // Prune tokens Expo says are gone so they don't "succeed" forever and
      // silently swallow every future reply (H1).
      if (outcome.deadTokens.length > 0) {
        await supabase.from('push_tokens').delete().in('expo_token', outcome.deadTokens);
      }
      // Transport failure decides nothing — leave unnotified so the next run
      // retries. Otherwise stamp: either a device took it, or every token was
      // dead and now pruned (nothing left to deliver to).
      if (outcome.transportFailed) stamp = false;
      else stamp = outcome.delivered || outcome.deadTokens.length === list.length;
      if (outcome.delivered) pushed += 1;
    }
    if (!stamp) continue;

    const { error: stampErr } = await supabase
      .from('communications')
      .update({ notified_at: new Date().toISOString() })
      .in('id', rows.map((r) => r.id));
    // If the stamp fails after a delivered push, the next run would re-send
    // (M1) — accept that over losing the notification; surface it in logs.
    if (stampErr) console.error('[push-send] stamp failed', familyId, stampErr.message);
  }

  return { families: byFamily.size, pushed, rows: pending.length };
}
