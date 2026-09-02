/**
 * Family Sharing B2 — sending the join-link email, from the app's side.
 *
 * The email itself is sent by the `family-invite` Edge Function (it holds the
 * provider key; authorization is RLS). This is the thin client that asks it
 * to send. The pure delivery-state helpers are in inviteDelivery.ts.
 */
import { supabase } from '@/lib/supabase';
import { describeSendFailure } from '@/lib/inviteDelivery';

export { deliveryState, describeSendFailure, shortDate } from '@/lib/inviteDelivery';
export type { DeliveryState } from '@/lib/inviteDelivery';

const FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/family-invite`;

export type SendResult = { ok: true; sentAt: string } | { ok: false; reason: string };

/** Ask the Edge Function to email the join link for one invitation. */
export async function sendFamilyInvite(invitationId: string): Promise<SendResult> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return { ok: false, reason: describeSendFailure('not_authenticated') };
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
    if (res.ok && payload.ok === true && typeof payload.sent_at === 'string') {
      return { ok: true, sentAt: payload.sent_at };
    }
    const code = typeof payload.error === 'string' ? payload.error : undefined;
    const reason = typeof payload.reason === 'string' ? payload.reason : undefined;
    return { ok: false, reason: describeSendFailure(code, reason) };
  } catch {
    return { ok: false, reason: "The email didn't send — check your connection and tap Resend." };
  }
}
