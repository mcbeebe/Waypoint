/**
 * Waypoint App — Root navigation
 *
 * Flow:
 *   No session → WelcomeScreen (auth)
 *   Session + !onboarding_completed → OnboardingFlow
 *   Session + onboarding_completed → MainTabs
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import type { LinkingOptions } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as ExpoLinking from 'expo-linking';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from './src/hooks/useAuth';
import { useProfile } from './src/hooks/useProfile';
import { isStaffRole } from './src/lib/roles';
import { supabase } from './src/lib/supabase';
import { initSentry, setSentryUser, clearSentryUser } from './src/lib/sentry';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import ResetPasswordScreen from './src/screens/auth/ResetPasswordScreen';
import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import TermsOfService from './src/screens/legal/TermsOfService';
import PrivacyPolicy from './src/screens/legal/PrivacyPolicy';
import MainTabs from './src/navigation/MainTabs';
import StaffStack from './src/navigation/StaffStack';
import ErrorBoundary from './src/components/ErrorBoundary';
import LoadingScreen from './src/components/LoadingScreen';
import NetworkBanner from './src/components/NetworkBanner';
import WebFrame from './src/components/WebFrame';
import { ToastProvider } from './src/components/Toast';
import { I18nProvider } from './src/i18n';
import { TextScaleProvider } from './src/lib/textSize';
import { colors } from './src/lib/theme';
import type { RootStackParamList } from './src/types/navigation';
import { MAIN_LINKING } from './src/navigation/linking';
import JoinFamilyScreen from './src/screens/auth/JoinFamilyScreen';
import {
  extractJoinToken,
  stashPendingJoin,
  readPendingJoin,
  clearPendingJoin,
} from './src/lib/joinInvite';

// URL-per-screen linking (roadmap 0.5 / UX 2): on web this makes browser
// back/forward work and every screen shareable/bookmarkable; on native it
// enables waypoint:// deep links. Screens with non-serializable params
// (Thread, DocumentAnalysis) are deliberately not given paths.
// The nested config is cast because RootStackParamList doesn't embed the
// per-tab stack param lists (NavigatorScreenParams), so TS can't validate
// nested initialRouteName/screen names — they're checked at runtime instead.
const linking: LinkingOptions<RootStackParamList> = {
  prefixes: [ExpoLinking.createURL('/')],
  config: {
    screens: {
      Welcome: 'welcome',
      Onboarding: 'onboarding',
      Staff: {
        initialRouteName: 'StaffHome',
        screens: {
          StaffHome: 'staff',
          CaseDetail: 'staff/case/:familyId',
          PCPBuilder: 'staff/case/:familyId/pcp/:caseId',
          SpendingPlan: 'staff/case/:familyId/plan/:caseId',
          TimeCapture: 'staff/case/:familyId/time/:caseId',
          Baseline: 'staff/case/:familyId/baseline/:caseId',
          Billing: 'staff/billing',
          Scorecard: 'staff/scorecard',
        },
      },
      Terms: 'terms',
      Privacy: 'privacy',
      // Family Sharing B3: the invite link. The token is read by App itself
      // (see the pending-join effect) so it survives a sign-in; this entry
      // keeps the address bar honest on web.
      JoinFamily: 'join',
      Main: MAIN_LINKING,
    },
  } as unknown as LinkingOptions<RootStackParamList>['config'],
};

// Initialize Sentry crash reporting (no-op if DSN not configured)
initSentry();

const Stack = createNativeStackNavigator();

export default function App() {
  const { session, loading: authLoading, passwordRecovery, clearPasswordRecovery } = useAuth();
  // Role fork (035): resolve the profile role BEFORE touching families, so a
  // staff login never falls into parent onboarding or creates a family row.
  const { role, loading: profileLoading } = useProfile(session?.user?.id);
  const isStaff = isStaffRole(role);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  // Family Sharing B3 — a tokenised invite link. The token is captured from
  // the launch URL (cold) or a url event (warm) and stashed, because the
  // Join screen is only mounted once there is a session: a signed-out person
  // taps the link, signs in, and must come back to Join — not lose it.
  const [pendingJoin, setPendingJoin] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    const takeUrl = (url: string | null) => {
      const token = extractJoinToken(url);
      if (token && alive) {
        setPendingJoin(token);
        void stashPendingJoin(token);
      }
    };
    ExpoLinking.getInitialURL().then(takeUrl).catch(() => {});
    // A stash survives the reload an OAuth redirect causes on web.
    readPendingJoin().then((t) => { if (t && alive) setPendingJoin((cur) => cur ?? t); }).catch(() => {});
    const sub = ExpoLinking.addEventListener('url', ({ url }) => takeUrl(url));
    return () => { alive = false; sub.remove(); };
  }, []);

  // Check if user has completed onboarding (family accounts only — a staff
  // account has no families row and must not be pushed into onboarding).
  const checkOnboarding = useCallback(async () => {
    if (!session?.user?.id || isStaff) {
      setOnboardingComplete(null);
      return;
    }

    setCheckingOnboarding(true);
    try {
      const { data, error } = await supabase
        .from('families')
        .select('onboarding_completed')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Onboarding check error:', error.message);
        setOnboardingComplete(false);
        return;
      }

      if (data) {
        setOnboardingComplete(data.onboarding_completed ?? false);
        return;
      }

      // No owned family. A co-parent (Family Sharing, 007) joined someone
      // else's — that family is already set up, so they are onboarded and
      // must NOT be pushed into "create your own family". This client read
      // of family_members needs migration 055 (it removes the policy
      // recursion that made every such read raise 42P17); useFamily gets the
      // same fallback in B1 (#182). A failed read is logged, not swallowed.
      const { data: membership, error: memberError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', session.user.id)
        .limit(1)
        .maybeSingle();
      if (memberError) console.error('Membership check error:', memberError.message);
      setOnboardingComplete(!!membership?.family_id);
    } catch (err) {
      console.error('Onboarding check failed:', err);
      setOnboardingComplete(false);
    } finally {
      setCheckingOnboarding(false);
    }
  }, [session?.user?.id, isStaff]);

  useEffect(() => {
    checkOnboarding();
  }, [checkOnboarding]);

  // Track user context in Sentry for crash reports (family ID only, no PII)
  useEffect(() => {
    if (session?.user?.id) {
      setSentryUser(session.user.id);
    } else {
      clearSentryUser();
    }
  }, [session?.user?.id]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingComplete(true);
  }, []);

  /**
   * Accepted: the RPC succeeded, so this account IS a member of a set-up
   * family — onboarded by definition. Set that directly rather than
   * re-reading family_members (belt and braces: correct even if the client
   * read fails), then drop the token.
   */
  const finishJoin = useCallback(() => {
    setPendingJoin(null);
    void clearPendingJoin();
    setOnboardingComplete(true);
  }, []);

  /** "Not now" or a dead link: drop the token and fall through to the normal flow. */
  const dismissJoin = useCallback(() => {
    setPendingJoin(null);
    void clearPendingJoin();
  }, []);

  // Show loading while auth, role, or onboarding status is being determined
  if (authLoading || (session && profileLoading) || checkingOnboarding) {
    return (
      <SafeAreaProvider>
        <LoadingScreen />
      </SafeAreaProvider>
    );
  }

  return (
    <ErrorBoundary>
      <I18nProvider>
        <TextScaleProvider>
        <ToastProvider>
          <SafeAreaProvider>
            <WebFrame>
              <NetworkBanner />
              <NavigationContainer linking={linking}>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  {!session ? (
                    // Not authenticated → Welcome / Sign-In
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
                  ) : passwordRecovery ? (
                    // Arrived via a password-reset email link → set new password
                    <Stack.Screen name="ResetPassword">
                      {() => <ResetPasswordScreen onDone={clearPasswordRecovery} />}
                    </Stack.Screen>
                  ) : isStaff ? (
                    // Staff (facilitator/supervisor/admin) → facilitation
                    // workspace, never parent onboarding (035/036 role fork)
                    <Stack.Screen name="Staff" component={StaffStack} />
                  ) : pendingJoin ? (
                    // Family Sharing B3: an invite link, before onboarding on
                    // purpose — a co-parent joins a family, never creates one
                    <Stack.Screen name="JoinFamily">
                      {() => (
                        <JoinFamilyScreen token={pendingJoin} onDone={finishJoin} onNotNow={dismissJoin} />
                      )}
                    </Stack.Screen>
                  ) : !onboardingComplete ? (
                    // Authenticated but hasn't completed onboarding
                    <Stack.Screen name="Onboarding">
                      {() => <OnboardingFlow onComplete={handleOnboardingComplete} />}
                    </Stack.Screen>
                  ) : (
                    // Authenticated + onboarded → Main app
                    <Stack.Screen name="Main" component={MainTabs} />
                  )}
                  {/* Legal pages — reachable signed-in or signed-out */}
                  <Stack.Screen
                    name="Terms"
                    component={TermsOfService}
                    options={{ headerShown: true, title: 'Terms of Service', headerTintColor: '#0891B2' }}
                  />
                  <Stack.Screen
                    name="Privacy"
                    component={PrivacyPolicy}
                    options={{ headerShown: true, title: 'Privacy Policy', headerTintColor: '#0891B2' }}
                  />
                </Stack.Navigator>
              </NavigationContainer>
              <StatusBar style="dark" />
            </WebFrame>
          </SafeAreaProvider>
        </ToastProvider>
        </TextScaleProvider>
      </I18nProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.white,
  },
});
