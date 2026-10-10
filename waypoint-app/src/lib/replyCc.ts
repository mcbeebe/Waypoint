/**
 * Who a reply from Paper Trail copies (initiative 014, PR B): the people who
 * were on the email being answered, like Gmail's Reply all — so a spouse or
 * advocate copied on the thread does not silently drop out of it.
 */
import type { Communication } from '@/hooks/useCommunications';
import { isEmailAddress, MAX_CC } from '@/lib/letterAddress';

/** The pre-filled Cc, everyone else who was on it, and who cannot be sent to. */
export interface ReplyAllCc {
  /** Pre-filled, at most MAX_CC. */
  cc: string[];
  /** Also on the email but past MAX_CC — named, so the parent can swap them in. */
  more: string[];
  /** Recorded but not one plain address the send accepts — named, never dropped silently. */
  unsendable: string[];
}

/**
 * The Cc a reply starts with: everyone else on the message being answered
 * (its 064 `cc` — To and Cc, minus the family and the sender). Only that
 * message, as Gmail's Reply all does: a sender who answered the family
 * alone left the others off on purpose, and an earlier message's list must
 * not bring them back. A message recorded before 064 has no list, so the
 * reply starts with no one copied.
 *
 * People the family itself copied earlier in the thread come first, so a
 * spouse or advocate is not the one pushed past MAX_CC by a long To line.
 * The addressee is never also copied.
 */
export function replyAllCc(
  answering: Communication | null | undefined,
  thread: Communication[],
  to: string
): ReplyAllCc {
  const familyCopied = new Set(
    thread
      .filter((c) => c.direction === 'outgoing' && c.status === 'sent')
      .flatMap((c) => c.cc ?? [])
      .map((e) => e.toLowerCase())
  );
  const seen = new Set([to.trim().toLowerCase()]);
  const sendable: string[] = [];
  const unsendable: string[] = [];
  for (const raw of answering?.cc ?? []) {
    const email = raw.trim();
    const key = email.toLowerCase();
    if (!email || seen.has(key)) continue;
    seen.add(key);
    (isEmailAddress(email) ? sendable : unsendable).push(email);
  }
  const ranked = [
    ...sendable.filter((e) => familyCopied.has(e.toLowerCase())),
    ...sendable.filter((e) => !familyCopied.has(e.toLowerCase())),
  ];
  return { cc: ranked.slice(0, MAX_CC), more: ranked.slice(MAX_CC), unsendable };
}
