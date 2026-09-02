/**
 * Family Sharing B2 — delivery state, pure.
 *
 * What the owner is told about an invitation email must be TRUE, so the logic
 * that turns a row into "Email sent Sep 2" / the failure reason / "not sent
 * yet" lives here with no I/O, where the logic suite can pin it. The network
 * sender is in familyInvite.ts.
 */
import type { FamilyInvitation } from '@/types/database';

/** Short, owner-readable reasons for each way a send can fail. */
export function describeSendFailure(code: string | undefined, reason?: string): string {
  switch (code) {
    case 'delivery_not_configured':
      return 'Email delivery is not set up yet — the invite is saved; share the join link by hand for now.';
    case 'not_pending':
      return 'This invite was already answered.';
    case 'expired':
      return 'This invite has expired — send a new one.';
    case 'not_found':
      return "Couldn't find that invite.";
    case 'not_authenticated':
      return 'Please sign in again and retry.';
    case 'send_failed':
      return reason ? `The email didn't send (${reason}).` : "The email didn't send.";
    default:
      return "The email didn't send — tap Resend to try again.";
  }
}

export type DeliveryState =
  | { kind: 'sent'; at: string }
  | { kind: 'failed'; reason: string }
  | { kind: 'unsent' };

/** What the pending card says about delivery — the truth, from the row. */
export function deliveryState(inv: Pick<FamilyInvitation, 'sent_at' | 'send_error'>): DeliveryState {
  if (inv.sent_at) return { kind: 'sent', at: inv.sent_at };
  if (inv.send_error) return { kind: 'failed', reason: inv.send_error };
  return { kind: 'unsent' };
}

/** Short date for "Email sent Sep 2". Hermes-safe: no toLocaleDateString. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
}
