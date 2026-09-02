/**
 * Family Sharing B2 — sending the join-link email, from the app's side.
 *
 * The email itself is sent by the `family-invite` Edge Function (it holds the
 * provider key; authorization is RLS; the throttle is 057's send log). This is
 * the thin client that asks it to send. Pure delivery-state logic is in
 * inviteDelivery.ts.
 */
import { supabase } from '@/lib/supabase';

const FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/family-invite`;

export type SendResult =
  /** The provider accepted it (or it was sent within the last minute: `skipped`). */
  | { ok: true; sentAt: string | null; skipped?: 'cooldown' }
  /** Not sent. `code` is the function's failure code; `reason` its short detail. */
  | { ok: false; code: string; reason?: string };

/** Ask the Edge Function to email the join link for one invitation. */
export async function sendFamilyInvite(invitationId: string): Promise<SendResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, code: 'not_authenticated' };
    const res = await fetch(FN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invitation_id: invitationId }),
    });
    let payload: Record<string, unknown> = {};
    try {
      payload = (await res.json()) as Record<string, unknown>;
    } catch {
      // a non-JSON body is treated as a generic failure below
    }
    if (res.ok && payload.ok === true) {
      const sentAt = typeof payload.sent_at === 'string' ? payload.sent_at : null;
      return payload.skipped === 'cooldown' ? { ok: true, sentAt, skipped: 'cooldown' } : { ok: true, sentAt };
    }
    return {
      ok: false,
      code: typeof payload.error === 'string' ? payload.error : 'send_failed',
      reason: typeof payload.reason === 'string' ? payload.reason : undefined,
    };
  } catch {
    return { ok: false, code: 'read_failed' };
  }
}
