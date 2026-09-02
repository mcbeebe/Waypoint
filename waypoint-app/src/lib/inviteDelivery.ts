/**
 * Family Sharing B2 — delivery state, pure.
 *
 * What the owner is told about an invitation email must be TRUE, so the logic
 * that turns a row into "Email sent Sep 2" / the failure reason / "Expired" /
 * "not sent yet" lives here with no I/O, where the logic suite can pin it. The
 * network sender is in familyInvite.ts.
 *
 * One vocabulary on both sides: `send_error` holds `code` or `code:reason`
 * (the Edge Function writes the same shape the client stores), so the card
 * reads the same after a refresh as it did the moment the send failed.
 */
import { DEFAULT_WEB_ORIGIN } from '@/lib/appLinks';
import type { FamilyInvitation } from '@/types/database';

/** One address, no display-name form, no lists — mirrors 057's CHECK. */
export const INVITE_EMAIL_RE = /^[^\s@<>,;]+@[^\s@<>,;]+\.[^\s@<>,;]+$/;

export function isValidInviteEmail(s: string): boolean {
  const v = s.trim();
  return v.length <= 254 && INVITE_EMAIL_RE.test(v);
}

/** The link an owner can share by hand; the same one the email carries. */
export function joinLinkFor(token: string): string {
  return `${DEFAULT_WEB_ORIGIN}/join?token=${encodeURIComponent(token)}`;
}

/** `code` or `code:reason` → parts. */
export function parseSendError(value: string | null | undefined): { code: string; reason?: string } | null {
  if (!value) return null;
  const i = value.indexOf(':');
  if (i === -1) return { code: value };
  return { code: value.slice(0, i), reason: value.slice(i + 1) || undefined };
}

/** Short, owner-readable copy for each way a send can fail. */
export function describeSendFailure(code: string | undefined, reason?: string): string {
  switch (code) {
    case 'delivery_not_configured':
      return reason
        ? `Email delivery isn't ready on the server yet (${reason}). The invite is saved — use Copy link to share it by hand.`
        : 'Email delivery is not set up yet. The invite is saved — use Copy link to share it by hand.';
    case 'invalid_email':
      return "That doesn't look like a single email address — revoke this invite and send a new one.";
    case 'rate_limited':
      return 'This family has sent a lot of invites today — try again tomorrow, or use Copy link.';
    case 'not_pending':
      return 'This invite was already answered.';
    case 'expired':
      return 'This invite has expired — send a new one.';
    case 'not_found':
      return "Couldn't find that invite.";
    case 'not_authenticated':
      return 'Please sign in again and retry.';
    case 'read_failed':
      return "Couldn't reach the server — check your connection and tap Resend.";
    case 'send_failed':
      return reason ? `The email didn't send (${reason}).` : "The email didn't send.";
    default:
      return "The email didn't send — tap Resend to try again.";
  }
}

export type DeliveryState =
  | { kind: 'expired'; at: string }
  | { kind: 'failed'; code: string; reason?: string; text: string }
  | { kind: 'sent'; at: string }
  | { kind: 'unsent' };

/**
 * What the pending card says about delivery, from the row alone.
 * Order matters: an expired invite is expired whatever was sent; a present
 * send_error is the LATEST attempt (the function nulls it on success), so it
 * outranks an older sent_at; then sent; then nothing yet.
 */
export function deliveryState(
  inv: Pick<FamilyInvitation, 'sent_at' | 'send_error'> & { expires_at?: string | null },
  now: Date = new Date()
): DeliveryState {
  if (inv.expires_at) {
    const exp = new Date(inv.expires_at);
    if (!isNaN(exp.getTime()) && exp.getTime() < now.getTime()) return { kind: 'expired', at: inv.expires_at };
  }
  const err = parseSendError(inv.send_error);
  if (err) return { kind: 'failed', code: err.code, reason: err.reason, text: describeSendFailure(err.code, err.reason) };
  if (inv.sent_at) return { kind: 'sent', at: inv.sent_at };
  return { kind: 'unsent' };
}

/** Short date for "Email sent Sep 2". Hermes-safe: no toLocaleDateString. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
