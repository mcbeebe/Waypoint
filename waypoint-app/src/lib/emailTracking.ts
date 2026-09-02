/**
 * The decisions behind a *tracked* outbound email — the pure half.
 *
 * THE BUG THIS EXISTS TO FIX. The Waypoint Navigator's "Email this response"
 * button opened a compose window and, in the same breath, wrote a
 * `communications` row with `status: 'sent'`. It recorded a send at the moment
 * the draft appeared on screen — before any address was typed, before anything
 * left the outbox. Live rows show exactly that: `status: 'sent'`,
 * `contact: null`, `gmail_thread_id: null`, `request_id: null`. Nothing could
 * ever sync a reply onto them (poll-replies keys off the thread id), and a
 * parent reading their paper trail saw sends that never happened.
 *
 * The Letters screen already had the honest process: save a DRAFT row → send
 * through the connected Gmail account (the edge function marks the row sent and
 * stores the thread id) or hand off to the parent's own mail app → and only
 * mark the row sent when the send is real. This module holds the routing and
 * copy decisions of that process so the Navigator and an action item can run it
 * too, and so the rules are tested rather than re-typed per screen.
 *
 * Pure — no react-native, no supabase — so it runs in the `logic` project.
 */

/** How the email actually leaves: our Gmail integration, or the parent's app. */
export type SendRoute = 'gmail' | 'handoff';

export interface RouteInput {
  /** The account is Google-connected AND holds the Gmail send scope. */
  gmailReady: boolean;
  /** What the parent typed in the To field. */
  to: string;
}

export interface RoutePlan {
  route: SendRoute;
  /** False when we should not attempt anything yet. */
  canSend: boolean;
  /** Why not — shown to the parent verbatim. Empty when canSend. */
  blockedReason: string;
}

/**
 * Deliberately loose: this guards against "" and obvious typos, not against
 * every RFC 5322 shape. A real address that this rejected would be worse than
 * a bad one the mail server bounces.
 */
export function isEmailAddress(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  return /^[^@]+@[^@.]+(\.[^@.]+)+$/.test(v);
}

/**
 * Where this send goes, and whether it may go at all.
 *
 * A recipient is now REQUIRED on both routes. It used to be optional on the
 * hand-off route — the compose window opened with an empty To field — which is
 * how the paper trail ended up with sends addressed to nobody. Recording who a
 * letter went to is the whole point of a paper trail.
 */
export function planEmailRoute({ gmailReady, to }: RouteInput): RoutePlan {
  if (!to.trim()) {
    return {
      route: 'handoff',
      canSend: false,
      blockedReason: 'Add the email address this should go to — your paper trail records who you wrote to.',
    };
  }
  if (!isEmailAddress(to)) {
    return {
      route: 'handoff',
      canSend: false,
      blockedReason: "That doesn't look like an email address — please check it.",
    };
  }
  return { route: gmailReady ? 'gmail' : 'handoff', canSend: true, blockedReason: '' };
}

/**
 * What the screen says once the compose window is open but the parent has not
 * yet confirmed. The row is a DRAFT at this point and the copy has to say so —
 * "Sent!" here is the false claim this whole module removes.
 *
 * `kind` mirrors composeTarget(): 'gmail' is desktop Gmail's compose window,
 * 'mail' is whatever mail app the device opened.
 */
export function handoffCopy(kind: 'gmail' | 'mail'): {
  headline: string;
  body: string;
  confirmLabel: string;
  laterLabel: string;
} {
  const where = kind === 'gmail' ? 'Gmail' : 'your email app';
  return {
    headline: `Opened in ${where}`,
    body:
      'Saved to your paper trail as a draft. Once you hit send over there, tell us — ' +
      'that starts the clock and dates the record.',
    confirmLabel: "I sent it",
    laterLabel: 'Not yet',
  };
}

/** Confirmation copy after a real, tracked Gmail send. */
export const GMAIL_SENT_MESSAGE =
  'Sent through Gmail — saved to your paper trail, and replies will sync back here.';

/**
 * A real Gmail send whose thread id did not come back. The mail went; reply
 * syncing cannot be promised, because poll-replies keys off the thread id.
 */
export const GMAIL_SENT_NO_THREAD =
  'Sent through Gmail and saved to your paper trail. Replies may not sync back automatically.';

/** Confirmation copy after the parent confirms a hand-off send. */
export const HANDOFF_SENT_MESSAGE = 'Marked as sent — it is in your paper trail.';

/**
 * What to say when the send left but the paper trail did not record it. Never
 * silently swallow this: a parent who believes an email is tracked and later
 * finds no record has lost the evidence they were told they were building.
 */
export const TRAIL_FAILED_MESSAGE =
  "The email is ready to send, but we couldn't save it to your paper trail — you may need to log it by hand.";

/**
 * The worse version: the mail is already gone and the record did not stick.
 * The parent has to know, because everything downstream — the clock, the reply
 * sync, Home's "finish the letter you started" — now disagrees with reality.
 */
export const TRAIL_FAILED_AFTER_SEND =
  "Your email sent, but we couldn't mark it sent in your paper trail — please log it by hand.";
