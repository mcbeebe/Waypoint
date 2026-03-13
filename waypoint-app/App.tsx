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
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import OnboardingFlow from './src/screens/onboarding/OnboardingFlow';
import MainTabs from './src/navigation/MainTabs';
import ErrorBoundary from './src/components/ErrorBoundary';
import NetworkBanner from './src/components/NetworkBanner';
import { ToastProvider } from './src/components/Toast';
import { I18nProvider } from './src/i18n';
import { colors } from './src/lib/theme';

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
        <ToastProvider>
          <SafeAreaProvider>
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
              </Stack.Navigator>
            </NavigationContainer>
            <StatusBar style="dark" />
          </SafeAreaProvider>
        </ToastProvider>
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
