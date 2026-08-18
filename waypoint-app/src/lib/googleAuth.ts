/**
 * Web Google OAuth — Phase 3 (Communication Suite).
 *
 * On web, Google connects through Supabase OAuth (linkIdentity for
 * already-signed-in users, signInWithOAuth at the welcome screen). The
 * redirect back carries a short-lived provider access token plus — on
 * first consent — a refresh token. We persist the refresh token in
 * public.google_accounts (RLS: owner only) and mint fresh access tokens
 * through the google-auth edge function, which holds the client secret.
 *
 * Native keeps its @react-native-google-signin path in lib/auth.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

/**
 * Calendar only — Gmail scopes removed so the OAuth app can be published
 * without Google's restricted-scope (CASA) verification. Email features
 * use Gmail compose URLs / mailto instead of the API.
 */
export const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
];

const ACCESS_TOKEN_KEY = 'waypoint_google_web_access_token';
const ACCESS_EXPIRY_KEY = 'waypoint_google_web_access_expiry';
const FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/google-auth`;

function oauthOptions(redirectPath: string) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : undefined;
  return {
    redirectTo: origin ? `${origin}${redirectPath}` : undefined,
    scopes: GOOGLE_API_SCOPES.join(' '),
    // offline + consent → Google returns a refresh token we can store
    queryParams: { access_type: 'offline', prompt: 'consent' },
  };
}

/**
 * Sign IN with Google on web (welcome screen — no existing session).
 * Redirects the browser away; the promise resolving means the redirect
 * started, not that sign-in finished.
 */
export async function signInWithGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: oauthOptions('/'),
  });
  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * CONNECT Google to the already-signed-in account (Profile screen).
 * Uses linkIdentity so the email/password user gains the Google identity
 * instead of signing in as a different user. Requires "manual linking"
 * enabled in Supabase Auth settings.
 */
export async function connectGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.auth.linkIdentity({
    provider: 'google',
    options: oauthOptions('/profile'),
  });
  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * Capture Google provider tokens off a Supabase session. Called from
 * useAuth on every auth state change — after the OAuth redirect the
 * session carries provider_token (+ provider_refresh_token on first
 * consent). Cheap no-op on sessions without provider tokens.
 */
export async function captureGoogleTokens(session: {
  provider_token?: string | null;
  provider_refresh_token?: string | null;
  user?: { id: string; identities?: Array<{ provider: string; identity_data?: { email?: string } }> | null } | null;
} | null): Promise<void> {
  if (!session?.provider_token && !session?.provider_refresh_token) return;
  try {
    if (session.provider_token) {
      // Google access tokens last ~1h; cache for 55min
      await AsyncStorage.setItem(ACCESS_TOKEN_KEY, session.provider_token);
      await AsyncStorage.setItem(ACCESS_EXPIRY_KEY, String(Date.now() + 55 * 60 * 1000));
    }
    if (session.provider_refresh_token && session.user) {
      const googleIdentity = session.user.identities?.find((i) => i.provider === 'google');
      await supabase.from('google_accounts').upsert({
        user_id: session.user.id,
        refresh_token: session.provider_refresh_token,
        google_email: googleIdentity?.identity_data?.email ?? null,
        scopes: GOOGLE_API_SCOPES.join(' '),
      });
    }
  } catch (err) {
    console.warn('Failed to capture Google tokens:', err);
  }
}

async function callGoogleAuthFn(action: 'refresh' | 'disconnect'): Promise<Response> {
  const { data } = await supabase.auth.getSession();
  const jwt = data.session?.access_token;
  return fetch(FN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt ?? ''}`,
      apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ action }),
  });
}

/** Get a valid Google access token on web: cached, else server refresh. */
export async function getWebGoogleAccessToken(forceRefresh = false): Promise<string | null> {
  try {
    if (!forceRefresh) {
      const [token, expiry] = await Promise.all([
        AsyncStorage.getItem(ACCESS_TOKEN_KEY),
        AsyncStorage.getItem(ACCESS_EXPIRY_KEY),
      ]);
      if (token && expiry && Date.now() < Number(expiry)) {
        return token;
      }
    }

    const response = await callGoogleAuthFn('refresh');
    if (!response.ok) {
      if (response.status === 401) {
        // reconnect_required — grant revoked or never connected
        await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, ACCESS_EXPIRY_KEY]);
      }
      return null;
    }
    const data = await response.json();
    if (!data.access_token) return null;

    const expiresMs = Math.max((data.expires_in ?? 3600) - 300, 300) * 1000;
    await AsyncStorage.setItem(ACCESS_TOKEN_KEY, data.access_token);
    await AsyncStorage.setItem(ACCESS_EXPIRY_KEY, String(Date.now() + expiresMs));
    return data.access_token;
  } catch {
    return null;
  }
}

/** Whether this user has a Google account connected (web). */
export async function isGoogleConnectedWeb(): Promise<{ connected: boolean; email: string | null }> {
  try {
    const { data } = await supabase
      .from('google_accounts')
      .select('google_email')
      .maybeSingle();
    return { connected: !!data, email: data?.google_email ?? null };
  } catch {
    return { connected: false, email: null };
  }
}

/** Disconnect Google: revoke server-side, clear local cache. */
export async function disconnectGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await callGoogleAuthFn('disconnect');
    await AsyncStorage.multiRemove([ACCESS_TOKEN_KEY, ACCESS_EXPIRY_KEY]);
    if (!response.ok && response.status !== 401) {
      return { success: false, error: `Disconnect failed (${response.status})` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Disconnect failed' };
  }
}
