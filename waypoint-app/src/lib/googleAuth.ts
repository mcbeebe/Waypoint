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
 * Default connection is Calendar only — publishable without Google's
 * restricted-scope (CASA) verification. Gmail scopes are an OPT-IN deep
 * connection (connectGmailWeb) for families who want in-thread sending
 * and reply tracking; on an unverified OAuth app Google shows a warning
 * screen and, in Testing mode, expires refresh tokens after ~7 days.
 */
export const GOOGLE_API_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
];

export const GMAIL_API_SCOPES = [
  ...GOOGLE_API_SCOPES,
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.readonly',
];

const ACCESS_TOKEN_KEY = 'waypoint_google_web_access_token';
const ACCESS_EXPIRY_KEY = 'waypoint_google_web_access_expiry';
/** Scopes we asked for before the OAuth redirect (JS state dies at redirect). */
const REQUESTED_SCOPES_KEY = 'waypoint_google_requested_scopes';
const FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/google-auth`;

function oauthOptions(redirectPath: string, scopes: string[] = GOOGLE_API_SCOPES) {
  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : undefined;
  return {
    redirectTo: origin ? `${origin}${redirectPath}` : undefined,
    scopes: scopes.join(' '),
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
 * The Google identity already on this account, read from the LOCAL session —
 * `getSession()` is served from storage, no network call, so a transient auth
 * API failure can't misroute the connect (a wrong read that fell back to
 * linkIdentity would drop an already-linked user straight back into the 422
 * loop this fixes). Returns null when Google isn't linked yet.
 */
async function linkedGoogleIdentity(): Promise<{ email: string | null } | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const identities = (data.session?.user?.identities ?? []) as Array<{
      provider: string;
      identity_data?: { email?: string };
    }>;
    const google = identities.find((i) => i.provider === 'google');
    return google ? { email: google.identity_data?.email ?? null } : null;
  } catch {
    return null;
  }
}

/** The Gmail/Calendar scopes already stored, so a connect never NARROWS them. */
async function storedScopes(): Promise<string[]> {
  try {
    const { data } = await supabase.from('google_accounts').select('scopes').maybeSingle();
    return data?.scopes ? String(data.scopes).split(' ').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Start a Google connect for the signed-in user, choosing the method the
 * account's state actually needs:
 *
 * - Google NOT yet linked → linkIdentity (adds the Google identity).
 * - Google ALREADY linked → signInWithOAuth (re-consent as the same user).
 *
 * The decision has to be made HERE, before the redirect. linkIdentity on an
 * already-linked identity does not fail synchronously — it redirects to Google,
 * the user consents, and only the `/callback` returns `422: Identity is already
 * linked`. That deferred failure can't be caught after the fact (the old
 * "retry on error" fallback never fired, because linkIdentity returned no
 * error to the caller), and it left the user stuck: every attempt 422'd at the
 * callback, so provider tokens were never captured. Re-consenting via
 * signInWithOAuth is the path that works for an already-linked account (both
 * `access_type: offline` and `prompt: consent` are set, so Google returns a
 * fresh refresh token, which captureGoogleTokens then persists).
 *
 * Two guards on the re-consent path:
 *  - request the UNION of already-granted and desired scopes, so the base
 *    Calendar connect can never narrow an existing Gmail grant (which the gmail
 *    edge function reads straight off the stored `scopes` column).
 *  - pass `login_hint` with the linked Google email, so the account chooser
 *    pre-selects the right account and a re-consent doesn't silently switch to
 *    a different Google account.
 */
async function startGoogleConnect(
  redirectPath: string,
  desiredScopes: string[]
): Promise<{ success: boolean; error?: string }> {
  const scopes = Array.from(new Set([...(await storedScopes()), ...desiredScopes]));
  await AsyncStorage.setItem(REQUESTED_SCOPES_KEY, scopes.join(' ')).catch(() => undefined);
  const google = await linkedGoogleIdentity();
  const base = oauthOptions(redirectPath, scopes);
  if (google) {
    const options = google.email
      ? { ...base, queryParams: { ...base.queryParams, login_hint: google.email } }
      : base;
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options });
    return error ? { success: false, error: error.message } : { success: true };
  }
  const { error } = await supabase.auth.linkIdentity({ provider: 'google', options: base });
  return error ? { success: false, error: error.message } : { success: true };
}

/**
 * CONNECT Google to the already-signed-in account (Profile screen).
 * Calendar-scoped base connection. Links Google on a first connect, or
 * re-consents when it is already linked (see startGoogleConnect).
 */
export async function connectGoogleWeb(): Promise<{ success: boolean; error?: string }> {
  return startGoogleConnect('/profile', GOOGLE_API_SCOPES);
}

/**
 * CONNECT (or upgrade to) Gmail — the deep connection: send letters
 * in-thread and sync agency replies. Links Google on a first connect, or
 * re-consents (with the Gmail scopes) when it is already linked.
 */
export async function connectGmailWeb(
  redirectPath = '/'
): Promise<{ success: boolean; error?: string }> {
  return startGoogleConnect(redirectPath, GMAIL_API_SCOPES);
}

/**
 * What Google ACTUALLY granted for an access token.
 *
 * Supabase does not surface the granted scope list, and a consent can grant
 * LESS than was asked: Gmail's send/readonly are RESTRICTED scopes, so Google
 * can withhold them (unverified app, or the scopes not listed on the OAuth
 * consent screen) while still returning a perfectly good session. Recording
 * what we ASKED for would then make the app claim Gmail is connected when it
 * is not — and the gmail edge function reads this column to decide. So ask
 * Google. Empty means "couldn't tell", never "nothing granted".
 */
async function grantedScopes(accessToken: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { scope?: string };
    return typeof data.scope === 'string' ? data.scope.split(' ').filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * The scopes to store for this connection. NEVER narrower than what is already
 * stored — that was a real bug, and it is subtle enough to spell out:
 *
 * `captureGoogleTokens` runs on EVERY auth state change carrying provider
 * tokens, and Supabase keeps `provider_refresh_token` in the persisted
 * session. So it runs again on the next app load (INITIAL_SESSION), by which
 * point the one-shot requested-scopes note has already been consumed and
 * removed. The old code fell back to `GOOGLE_API_SCOPES` (Calendar only) and
 * upserted that over the row — so a successful Gmail consent was silently
 * downgraded to Calendar the next time the app started, and Home went back to
 * saying "Gmail not connected" forever. Observed live: a row whose
 * `connected_at` was days old, `updated_at` seconds old, and scopes
 * Calendar-only, minutes after a Gmail connect.
 *
 * Order: what Google says it granted (authoritative) → else preserve what is
 * stored, widened by anything this consent asked for → else the base Calendar
 * connection for a brand-new row.
 */
export async function resolveScopes(
  accessToken: string | null,
  requested: string | null
): Promise<string> {
  const granted = accessToken ? await grantedScopes(accessToken) : [];
  if (granted.length) return granted.join(' ');

  const existing = await storedScopes();
  const asked = requested ? requested.split(' ').filter(Boolean) : [];
  const merged = Array.from(new Set([...existing, ...asked]));
  return merged.length ? merged.join(' ') : GOOGLE_API_SCOPES.join(' ');
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
      // The requested-scopes note is a ONE-SHOT: it survives the redirect and
      // is consumed here. Everything about resolving the row's scopes is in
      // resolveScopes, because getting it wrong silently un-connects Gmail.
      const requested = await AsyncStorage.getItem(REQUESTED_SCOPES_KEY).catch(() => null);
      await AsyncStorage.removeItem(REQUESTED_SCOPES_KEY).catch(() => undefined);
      await supabase.from('google_accounts').upsert({
        user_id: session.user.id,
        refresh_token: session.provider_refresh_token,
        google_email: googleIdentity?.identity_data?.email ?? null,
        scopes: await resolveScopes(session.provider_token ?? null, requested),
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
export async function isGoogleConnectedWeb(): Promise<{
  connected: boolean;
  email: string | null;
  /** Gmail send+read actually granted — NOT implied by `connected`. */
  gmail: boolean;
}> {
  try {
    const { data } = await supabase
      .from('google_accounts')
      .select('google_email, scopes')
      .maybeSingle();
    const scopes = String(data?.scopes ?? '');
    return {
      connected: !!data,
      email: data?.google_email ?? null,
      // Gmail is a SEPARATE opt-in (restricted scopes), so a connected
      // account is routinely Calendar-only. Saying otherwise promises
      // sending and reply-tracking the app cannot do.
      gmail: scopes.includes('gmail.send') && scopes.includes('gmail.readonly'),
    };
  } catch {
    return { connected: false, email: null, gmail: false };
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
