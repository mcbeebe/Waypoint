/**
 * Expo push-token registration (phase 7, Lane B — initiative 003). When a
 * family has notifications on, we register this device's Expo push token so the
 * server-side sender can deliver a "you have a reply" push while the app is
 * closed. On-device Lane A needs none of this; only the server push does.
 *
 * Registration goes through the `register_push_token` / `unregister_push_token`
 * SECURITY DEFINER RPCs (migration 050), never a direct table write, for two
 * reasons:
 *   - a device maps to exactly one family, and only a definer function can
 *     clear a token's PRIOR owner when a device changes hands (client RLS
 *     can't), preventing one family's reply pushes reaching another's phone;
 *   - the family is derived server-side from auth.uid(), so a client can never
 *     register a token under a family it doesn't own.
 *
 * Because the app's master notification toggle lives in on-device storage the
 * server can't read, the token's PRESENCE is the consent signal: we register on
 * opt-in and UNregister on opt-out / sign-out, so turning notifications off
 * actually stops server pushes.
 *
 * Safe by construction: guarded on web, and any native failure (a simulator has
 * no APNs/FCM; a missing EAS projectId) is caught — it defers server push, it
 * never breaks notifications or crashes the caller.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported_platform' | 'no_project_id' | 'no_token' | 'error' };

/** The EAS project id `getExpoPushTokenAsync` needs in a standalone build.
 *  Absent today (owner must add `expo.extra.eas.projectId` to app.json). */
export function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? null;
}

/** Resolve this device's Expo push token, or null when it can't (web,
 *  simulator, no projectId, or no permission). Never throws. */
async function currentToken(): Promise<string | null> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return null;
  const projectId = easProjectId();
  if (!projectId) return null;
  try {
    const res = await Notifications.getExpoPushTokenAsync({ projectId });
    return res?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Register (or refresh) this device's push token for the caller's family. The
 * RPC clears any prior owner of the token first, so a hand-me-down device never
 * keeps delivering the previous family's pushes.
 */
export async function registerPushToken(): Promise<RegisterResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { ok: false, reason: 'unsupported_platform' };
  }
  if (!easProjectId()) return { ok: false, reason: 'no_project_id' };
  const token = await currentToken();
  if (!token) return { ok: false, reason: 'no_token' };

  const platform: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';
  const { error } = await supabase.rpc('register_push_token', {
    p_token: token,
    p_platform: platform,
  });
  if (error) {
    console.warn('[pushTokens] register failed:', error.message);
    return { ok: false, reason: 'error' };
  }
  return { ok: true };
}

/**
 * Remove this device's push token — the family's withdrawal of consent for
 * app-closed pushes (turned off in-app, or signed out). Best-effort and quiet:
 * if the token can't be resolved there's nothing server-side to remove.
 */
export async function unregisterPushToken(): Promise<void> {
  const token = await currentToken();
  if (!token) return;
  const { error } = await supabase.rpc('unregister_push_token', { p_token: token });
  if (error) console.warn('[pushTokens] unregister failed:', error.message);
}
