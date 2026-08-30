/**
 * Expo push-token capture (phase 7, Lane B — initiative 003). When a family
 * grants notifications, we register this device's Expo push token so the
 * server-side sender can deliver a "you have a reply" push while the app is
 * closed. On-device Lane A needs none of this; only the server push does.
 *
 * Safe by construction: no token on web or a simulator, and no crash when the
 * EAS projectId isn't configured — it just skips, so a missing projectId never
 * breaks notifications, it only defers server push until the id is added.
 */
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

export interface PushTokenRow {
  family_id: string;
  expo_token: string;
  platform: 'ios' | 'android' | 'web';
  user_id: string | null;
}

export type RegisterResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported_platform' | 'no_project_id' | 'no_token' | 'error' };

/** The EAS project id `getExpoPushTokenAsync` needs in a standalone build.
 *  Absent today (owner must add `expo.extra.eas.projectId` to app.json). */
export function easProjectId(): string | null {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? null;
}

/** Build the row we upsert — pure, so the shape is testable without Expo. */
export function pushTokenRow(
  familyId: string,
  token: string,
  userId: string | null
): PushTokenRow {
  return {
    family_id: familyId,
    expo_token: token,
    platform: (Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web'),
    user_id: userId,
  };
}

/**
 * Register (or refresh) this device's push token for the family. Idempotent:
 * upserts on the token, so re-registering the same device updates one row.
 */
export async function registerPushToken(familyId: string): Promise<RegisterResult> {
  // Expo push tokens are a native-device concept; the web PWA has no APNs/FCM.
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { ok: false, reason: 'unsupported_platform' };
  }
  const projectId = easProjectId();
  if (!projectId) return { ok: false, reason: 'no_project_id' };

  try {
    const tokenResult = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResult?.data;
    if (!token) return { ok: false, reason: 'no_token' };

    const { data: userData } = await supabase.auth.getUser();
    const row = pushTokenRow(familyId, token, userData?.user?.id ?? null);

    const { error } = await supabase.from('push_tokens').upsert(row, { onConflict: 'expo_token' });
    if (error) {
      console.warn('[pushTokens] upsert failed:', error.message);
      return { ok: false, reason: 'error' };
    }
    return { ok: true };
  } catch (err) {
    console.warn('[pushTokens] registration failed:', err);
    return { ok: false, reason: 'error' };
  }
}
