/**
 * Sentry crash reporting configuration
 *
 * Initializes Sentry for React Native with:
 * - Crash reporting and error tracking
 * - Performance monitoring
 * - User context tagging (family ID, no PII)
 *
 * Usage: Call `initSentry()` at app startup in App.tsx
 * In production, set EXPO_PUBLIC_SENTRY_DSN in .env
 */

import * as Sentry from '@sentry/react-native';
import Constants from 'expo-constants';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';

/** Whether Sentry is enabled (only if DSN is configured) */
export const isSentryEnabled = (): boolean => SENTRY_DSN.length > 0;

/**
 * Initialize Sentry crash reporting
 * Safe to call even if DSN is not configured (becomes a no-op)
 */
export function initSentry(): void {
  if (!isSentryEnabled()) {
    console.log('[Sentry] No DSN configured — crash reporting disabled');
    return;
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: Constants.expoConfig?.version
      ? `waypoint-app@${Constants.expoConfig.version}`
      : undefined,
    dist: Constants.expoConfig?.ios?.buildNumber ?? undefined,

    // Performance monitoring: sample 20% in production, 100% in dev
    tracesSampleRate: __DEV__ ? 1.0 : 0.2,

    // Don't send events in development by default
    enabled: !__DEV__,

    // Redact PII from breadcrumbs (we handle user context manually)
    beforeBreadcrumb(breadcrumb) {
      // Strip potential PII from navigation breadcrumbs
      if (breadcrumb.category === 'navigation' && breadcrumb.data) {
        delete breadcrumb.data.state;
      }
      return breadcrumb;
    },

    // Scrub sensitive data from error events
    beforeSend(event) {
      // Remove user email/IP (we set familyId manually)
      if (event.user) {
        delete event.user.email;
        delete event.user.ip_address;
      }
      return event;
    },
  });
}

/**
 * Set authenticated user context (family ID only, no PII)
 * Call after successful authentication
 */
export function setSentryUser(familyId: string): void {
  if (!isSentryEnabled()) return;
  Sentry.setUser({ id: familyId });
}

/**
 * Clear user context on sign-out
 */
export function clearSentryUser(): void {
  if (!isSentryEnabled()) return;
  Sentry.setUser(null);
}

/**
 * Capture a non-fatal error with optional context
 */
export function captureError(error: Error, context?: Record<string, string>): void {
  if (!isSentryEnabled()) return;

  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setTag(key, value);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Add a breadcrumb for debugging context
 */
export function addBreadcrumb(
  message: string,
  category: string,
  data?: Record<string, string | number | boolean>
): void {
  if (!isSentryEnabled()) return;
  Sentry.addBreadcrumb({ message, category, data, level: 'info' });
}

/** Wrap the root component with Sentry error boundary */
export const SentryWrap = Sentry.wrap;
