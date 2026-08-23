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
      Main: {
        screens: {
          Home: {
            // Deep links to nested screens get the list/root screen placed
            // beneath them, so Back always has somewhere to go (e.g. opening
            // /actions/:id directly no longer strands the user).
            initialRouteName: 'HomeMain',
            screens: {
              HomeMain: '',
              Journey: 'journey',
              ProcessMap: 'how-it-works',
              EligibilityResult: 'your-result',
              FundedOffer: 'free-help',
              RequestTracker: 'requests',
              Pricing: 'premium',
              JourneyPhase: 'journey/:journeyKey/:phaseIndex',
              Agencies: 'agencies',
              Reimbursables: 'rc-funding',
              Insights: 'insights',
              Documents: 'documents',
              IEPHub: 'iep',
              Letters: 'letters',
              EmailAnalyzer: 'email-analyzer',
              CommunicationLog: 'paper-trail',
              Providers: 'providers',
              Services: 'services',
              Insurance: 'insurance',
              HealthRecords: 'health-records',
              FamilySharing: 'family',
              ProviderPortal: 'provider-portal',
              Forum: 'community',
              Messages: 'messages',
            },
          },
          JourneyTab: {
            screens: { JourneyMain: 'journey-map' },
          },
          Navigator: {
            initialRouteName: 'NavigatorMain',
            screens: { NavigatorMain: 'ask', Resources: 'resources', Blog: 'blog' },
          },
          Tracker: {
            initialRouteName: 'TrackerList',
            screens: { TrackerList: 'actions', ActionDetail: 'actions/:actionId' },
          },
          Calendar: {
            initialRouteName: 'CalendarMain',
            screens: { CalendarMain: 'calendar', Expenses: 'expenses', TaxReport: 'tax-report' },
          },
          Profile: {
            screens: { ProfileMain: 'profile' },
          },
        },
      },
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

      setOnboardingComplete(data?.onboarding_completed ?? false);
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
