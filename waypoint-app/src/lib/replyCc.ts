/**
 * Who a reply from Paper Trail copies (initiative 014, PR B): everyone who
 * was on the email being answered, like Gmail's Reply all — so a spouse or
 * advocate copied on the thread does not silently drop out of it.
 */
import type { Communication } from '@/hooks/useCommunications';
import { isEmailAddress, MAX_CC } from '@/lib/letterAddress';

/** The pre-filled Cc, and how many more were on the thread than fit. */
export interface ReplyAllCc {
  cc: string[];
  /** People on the thread left off because a reply copies at most MAX_CC. */
  leftOff: number;
  /** Whether anyone came from the thread at all (drives the "kept" note). */
  fromThread: boolean;
}

function newest(rows: Communication[]): Communication[] {
  return [...rows].sort((a, b) => (b.sent_at ?? b.occurred_at).localeCompare(a.sent_at ?? a.occurred_at));
}

/**
 * The Cc a reply starts with. The source is the newest reply's recorded
 * "everyone else on it" (064). A thread recorded before 064 has no such
 * list, so it falls back to the Cc on the family's newest letter in the
 * thread. The addressee is never also copied; anything that is not one
 * plain address is dropped, because the server would refuse the whole send.
 */
export function replyAllCc(thread: Communication[], to: string): ReplyAllCc {
  const withCc = (rows: Communication[]) => newest(rows).find((c) => (c.cc?.length ?? 0) > 0);
  const source =
    withCc(thread.filter((c) => c.direction === 'incoming')) ??
    withCc(thread.filter((c) => c.direction === 'outgoing'));
  const seen = new Set([to.trim().toLowerCase()]);
  const all: string[] = [];
  for (const raw of source?.cc ?? []) {
    const email = raw.trim();
    if (!isEmailAddress(email) || seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    all.push(email);
  }
  return { cc: all.slice(0, MAX_CC), leftOff: Math.max(0, all.length - MAX_CC), fromThread: all.length > 0 };
}
