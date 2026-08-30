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

/**
 * Push for one family: one message per registered device, in that device's
 * language. Returns true only if Expo accepted the batch — the caller stamps
 * notified_at only on success, so a transient failure is retried next run.
 */
async function sendFamilyPush(
  tokens: { expo_token: string; locale: string | null }[],
  count: number
): Promise<boolean> {
  const messages = tokens.map((t) => {
    const copy = replyCopy(count, pushLocale(t.locale));
    return { to: t.expo_token, title: copy.title, body: copy.body, sound: 'default' };
  });
  if (messages.length === 0) return true;
  try {
    const resp = await fetch(EXPO_PUSH_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(messages),
    });
    return resp.ok;
  } catch {
    return false;
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

    // No token = notifications off (consent withdrawn) or no device: nothing to
    // deliver AND nothing to retry, so stamp so the row doesn't re-scan forever
    // and a later opt-in doesn't retro-push a stale reply. Token present: stamp
    // only if Expo accepted, so a transient send failure is retried next run.
    const ok = list.length === 0 ? true : await sendFamilyPush(list, rows.length);
    if (!ok) continue;
    if (list.length > 0) pushed += 1;

    await supabase
      .from('communications')
      .update({ notified_at: new Date().toISOString() })
      .in('id', rows.map((r) => r.id));
  }

  return { families: byFamily.size, pushed, rows: pending.length };
}
