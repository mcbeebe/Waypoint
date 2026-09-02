/**
 * Authentication module for Waypoint
 * Supports Apple Sign-In, Google Sign-In (with Calendar/Gmail scopes), and Email/Password
 */

import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as SecureStore from 'expo-secure-store';
import { supabase } from './supabase';

// Google OAuth scopes requested upfront (used in Sprint 4-5 for Calendar/Gmail)
const GOOGLE_SCOPES = [
  'profile',
  'email',
  // Calendar only — Gmail scopes removed so the OAuth app can be published
  // without Google's restricted-scope (CASA) verification. Email features
  // use Gmail compose URLs / mailto instead of the API.
  'https://www.googleapis.com/auth/calendar',
];

const GOOGLE_TOKEN_KEY = 'waypoint_google_token';
const GOOGLE_REFRESH_TOKEN_KEY = 'waypoint_google_refresh_token';

/**
 * Sign in with Apple.
 * Uses expo-apple-authentication to get credential, then exchanges with Supabase Auth.
 */
export async function signInWithApple(): Promise<{ success: boolean; error?: string }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    if (!credential.identityToken) {
      return { success: false, error: 'No identity token received from Apple' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    if (error.code === 'ERR_REQUEST_CANCELED') {
      return { success: false, error: 'Sign-in cancelled' };
    }
    return { success: false, error: error.message || 'Apple Sign-In failed' };
  }
}

/**
 * Sign in with Google.
 * Uses @react-native-google-signin with Calendar + Gmail scopes.
 * Stores OAuth access token in SecureStore for Calendar/Gmail API use in Sprint 4-5.
 *
 * NOTE: Requires EAS development build (not Expo Go).
 * Google Sign-In must be configured in Google Cloud Console with:
 *   - iOS client ID
 *   - Web client ID (for Supabase)
 *   - Calendar API enabled
 *   - Gmail API enabled
 */
export async function signInWithGoogle(): Promise<{ success: boolean; error?: string }> {
  // Web: Supabase-hosted OAuth redirect (native GoogleSignin has no web support)
  if (Platform.OS === 'web') {
    const { signInWithGoogleWeb } = await import('./googleAuth');
    return signInWithGoogleWeb();
  }
  try {
    // Dynamic import to avoid crash if package not installed yet
    const { GoogleSignin, statusCodes } = await import(
      '@react-native-google-signin/google-signin'
    );

    GoogleSignin.configure({
      scopes: GOOGLE_SCOPES,
      // Client IDs come from env (.env.example documents the Cloud Console setup)
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '',
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || '',
      offlineAccess: true, // Request refresh token for Calendar/Gmail
    });

    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (!response.data?.idToken) {
      return { success: false, error: 'No ID token received from Google' };
    }

    // Store Google access token for Calendar/Gmail API (Sprint 4-5)
    const tokens = await GoogleSignin.getTokens();
    if (tokens.accessToken) {
      await SecureStore.setItemAsync(GOOGLE_TOKEN_KEY, tokens.accessToken);
    }

    // Exchange with Supabase Auth
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: response.data.idToken,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err: unknown) {
    const error = err as { code?: string; message?: string };
    // Handle specific Google Sign-In errors
    if (error.code === '12501' || error.code === 'SIGN_IN_CANCELLED') {
      return { success: false, error: 'Sign-in cancelled' };
    }
    if (error.code === '7' || error.code === 'NETWORK_ERROR') {
      return { success: false, error: 'Network error. Please check your connection.' };
    }
    return { success: false, error: error.message || 'Google Sign-In failed' };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || 'Sign-in failed' };
  }
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string
): Promise<{ success: boolean; needsConfirmation?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    // When "Confirm email" is on in Supabase Auth, signUp creates the user
    // but returns no session — the account activates via the emailed link.
    // Supabase also anti-enumerates: signing up an EXISTING confirmed email
    // returns a user with empty identities and no session.
    if (!data.session) {
      const isExisting = (data.user?.identities?.length ?? 0) === 0;
      if (isExisting) {
        return {
          success: false,
          error: 'An account with this email already exists. Try signing in instead.',
        };
      }
      return { success: true, needsConfirmation: true };
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || 'Sign-up failed' };
  }
}

/**
 * Send a password-reset email. The link signs the user in with a recovery
 * session (PASSWORD_RECOVERY auth event) and the app then shows the
 * set-new-password screen.
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const redirectTo =
      typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || 'Could not send reset email' };
  }
}

/**
 * Set a new password for the signed-in user (used after a recovery link).
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const error = err as { message?: string };
    return { success: false, error: error.message || 'Could not update password' };
  }
}

/**
 * Sign out from all providers
 */
export async function signOut(): Promise<void> {
  // A pending Family Sharing join token belongs to THIS person; it must not
  // greet whoever signs in next on the same device.
  import('./joinInvite').then(({ clearPendingJoin }) => clearPendingJoin()).catch(() => {});
  try {
    // Clear Google tokens
    await SecureStore.deleteItemAsync(GOOGLE_TOKEN_KEY);
    await SecureStore.deleteItemAsync(GOOGLE_REFRESH_TOKEN_KEY);

    // Try Google sign out (may fail if not signed in with Google)
    try {
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
      await GoogleSignin.signOut();
    } catch {
      // Not signed in with Google — ignore
    }
  } catch {
    // SecureStore cleanup failed — continue with Supabase sign out
  }

  await supabase.auth.signOut();
}

/**
 * Get stored Google access token for Calendar/Gmail API calls
 * Used in Sprint 4 (Calendar) and Sprint 5 (Gmail)
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const { getWebGoogleAccessToken } = await import('./googleAuth');
    return getWebGoogleAccessToken();
  }
  try {
    return await SecureStore.getItemAsync(GOOGLE_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Refresh Google access token if expired
 */
export async function refreshGoogleToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    const { getWebGoogleAccessToken } = await import('./googleAuth');
    return getWebGoogleAccessToken(true);
  }
  try {
    const { GoogleSignin } = await import('@react-native-google-signin/google-signin');
    const tokens = await GoogleSignin.getTokens();
    if (tokens.accessToken) {
      await SecureStore.setItemAsync(GOOGLE_TOKEN_KEY, tokens.accessToken);
      return tokens.accessToken;
    }
    return null;
  } catch {
    return null;
  }
}
