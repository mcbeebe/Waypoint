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
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

import { useAuth } from './src/hooks/useAuth';
import { supabase } from './src/lib/supabase';
import { initSentry, setSentryUser, clearSentryUser } from './src/lib/sentry';
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import TermsOfService from './src/screens/legal/TermsOfService';
import PrivacyPolicy from './src/screens/legal/PrivacyPolicy';
import MainTabs from './src/navigation/MainTabs';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkBanner from './src/components/NetworkBanner';
import WebFrame from './src/components/WebFrame';
import { ToastProvider } from './src/components/Toast';
import { I18nProvider } from './src/i18n';
import { TextScaleProvider } from './src/lib/textSize';
import { colors } from './src/lib/theme';

// Initialize Sentry crash reporting (no-op if DSN not configured)
initSentry();

const Stack = createNativeStackNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.teal} />
    </View>
  );
}

export default function App() {
  const { session, loading: authLoading } = useAuth();
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);
  const [checkingOnboarding, setCheckingOnboarding] = useState(false);

  // Check if user has completed onboarding
  const checkOnboarding = useCallback(async () => {
    if (!session?.user?.id) {
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
  }, [session?.user?.id]);

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

  // Show loading while auth or onboarding status is being determined
  if (authLoading || checkingOnboarding) {
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
              <NavigationContainer>
                <Stack.Navigator screenOptions={{ headerShown: false }}>
                  {!session ? (
                    // Not authenticated → Welcome / Sign-In
                    <Stack.Screen name="Welcome" component={WelcomeScreen} />
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
