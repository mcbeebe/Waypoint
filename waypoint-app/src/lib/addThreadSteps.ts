/**
 * "When you press Add" — what adding a Gmail thread will do (initiative 014,
 * PR D). Pure, so the copy is tested without rendering the sheet. English
 * only, like the rest of Paper Trail today.
 */
import { NEW_REPLY_DAYS } from '@/lib/replyInbox';

/** Must equal MAX_IMPORT_MESSAGES in supabase/functions/_shared/threadImport.ts. */
export const ADD_THREAD_MAX_MESSAGES = 50;

/**
 * The numbered steps for the confirm screen. They state what happens, not
 * what the agency did: the newest message "hasn't been answered yet", never
 * "they're waiting on you" (CLAUDE.md tone rule).
 */
export function addThreadSteps(input: {
  messageCount: number;
  orgLabel: string;
  lastFrom: string;
  lastFromFamily: boolean;
  lastAt: string;
  now: Date;
}): string[] {
  const { messageCount: n, orgLabel } = input;
  // `messageCount` counts delivered messages only — drafts and trash are
  // never copied (the server skips them, and so does the count).
  const copied =
    n > ADD_THREAD_MAX_MESSAGES
      ? `Its first message and the newest ${ADD_THREAD_MAX_MESSAGES - 1} of ${n} are copied`
      : n === 1
        ? 'Its message is copied'
        : `All ${n} messages are copied`;
  const steps = [
    `${copied} into your Paper Trail under ${orgLabel}. Nothing is sent, and nothing changes in Gmail.`,
    'Waypoint checks the thread for new replies, and they show on Home.',
  ];
  const ageMs = input.now.getTime() - new Date(input.lastAt).getTime();
  if (input.lastFromFamily) {
    steps.push('The newest message is yours, so nothing new shows on Home until a reply comes in.');
  } else if (ageMs <= NEW_REPLY_DAYS * 24 * 60 * 60 * 1000) {
    steps.push(
      `The newest message is from ${input.lastFrom} and hasn’t been answered yet, so it shows on Home as a new reply.`
    );
  } else {
    steps.push(
      `The newest message is from ${input.lastFrom} but is more than ${NEW_REPLY_DAYS} days old, so it’s filed as history rather than shown as new.`
    );
  }
  return steps;
}
