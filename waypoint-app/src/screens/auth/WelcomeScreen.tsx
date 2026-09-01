/**
 * Welcome / Sign-In screen
 * Apple Sign-In, Google Sign-In (with Calendar/Gmail scopes), Email sign-up
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Button from '@/components/Button';
import { Brandmark } from '@/components/Brandmark';
import {
  signInWithApple,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  requestPasswordReset,
} from '@/lib/auth';
import { colors, brand, fonts, spacing, radii } from '@/lib/theme';

/**
 * Google Sign-In gate. Web goes through Supabase OAuth and needs only the
 * provider configured — the web client ID env var doubles as the feature
 * flag. Native additionally needs the iOS client ID.
 */
const GOOGLE_SIGNIN_ENABLED =
  Platform.OS === 'web'
    ? !!process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
    : !!(
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID &&
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
      );

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'apple' | 'google' | 'email' | 'reset' | null>(null);
  // Inline messages instead of Alert.alert — Alert is a NO-OP on
  // react-native-web, which made wrong-password failures silent.
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const clearMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleApple = async () => {
    clearMessages();
    setLoading('apple');
    const result = await signInWithApple();
    setLoading(null);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      setError(result.error ?? 'Apple Sign-In failed.');
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    setLoading('google');
    const result = await signInWithGoogle();
    setLoading(null);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      setError(result.error ?? 'Google Sign-In failed.');
    }
  };

  const handleEmail = async () => {
    clearMessages();
    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading('email');
    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);
    setLoading(null);

    if (!result.success) {
      const message = result.error ?? 'Something went wrong. Please try again.';
      // Supabase's raw message for a bad login is terse — make it friendly
      setError(
        /invalid login credentials/i.test(message)
          ? 'Incorrect email or password. Double-check both, or tap "Forgot password?" below.'
          : message
      );
      return;
    }
    if (isSignUp && 'needsConfirmation' in result && result.needsConfirmation) {
      setInfo(
        `Almost there! We sent a confirmation link to ${email.trim()}. ` +
          'Open it to activate your account, then come back and sign in.'
      );
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    if (!email.trim()) {
      setError('Enter your email above first, then tap "Forgot password?" again.');
      return;
    }
    setLoading('reset');
    const result = await requestPasswordReset(email.trim());
    setLoading(null);
    if (!result.success) {
      setError(result.error ?? 'Could not send the reset email. Please try again.');
      return;
    }
    setInfo(
      `Password reset link sent to ${email.trim()}. ` +
        'Open the email and follow the link to choose a new password.'
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.mark}>
            <Brandmark size={72} route />
          </View>
          <Text style={styles.logo}>Waypoint</Text>
          <Text style={styles.tagline}>
            Your child's unexpected journey.{'\n'}Every step, mapped.
          </Text>
          {/* Value props (wave 4) — why sign up, in three lines */}
          {!showEmailForm && (
            <View style={styles.valueProps}>
              <Text style={styles.valueProp}>📍 Answers that cite California law — with the exact words to say</Text>
              <Text style={styles.valueProp}>📋 A personalized action plan for Regional Center, IEP & benefits</Text>
              <Text style={styles.valueProp}>✉️ Ready-to-send letters, appeals & records requests — free</Text>
            </View>
          )}
        </View>

        {/* Auth Buttons */}
        <View style={styles.actions}>
          {!showEmailForm ? (
            <>
              {Platform.OS === 'ios' && (
                <Button
                  title="Continue with Apple"
                  onPress={handleApple}
                  variant="secondary"
                  loading={loading === 'apple'}
                  disabled={loading !== null}
                />
              )}
              {GOOGLE_SIGNIN_ENABLED && (
                <Button
                  title="Continue with Google"
                  onPress={handleGoogle}
                  variant="outline"
                  loading={loading === 'google'}
                  disabled={loading !== null}
                />
              )}
              <Button
                title="Sign up with Email"
                onPress={() => setShowEmailForm(true)}
                variant="primary"
                disabled={loading !== null}
              />
            </>
          ) : (
            <>
              <Text style={styles.emailTitle}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                placeholder="Email address"
                placeholderTextColor={brand.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                placeholder="Password (6+ characters)"
                placeholderTextColor={brand.inkFaint}
                secureTextEntry
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {info ? <Text style={styles.infoText}>{info}</Text> : null}

              <Button
                title={isSignUp ? 'Create Account' : 'Sign In'}
                onPress={handleEmail}
                variant="primary"
                loading={loading === 'email'}
                disabled={loading !== null}
              />

              {!isSignUp && (
                <Text
                  style={styles.forgotLink}
                  onPress={loading === null ? handleForgotPassword : undefined}
                  accessibilityRole="link"
                >
                  {loading === 'reset' ? 'Sending reset email…' : 'Forgot password?'}
                </Text>
              )}

              <Button
                title={isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                onPress={() => { setIsSignUp(!isSignUp); clearMessages(); }}
                variant="outline"
                disabled={loading !== null}
              />

              <Button
                title="Back to other options"
                onPress={() => setShowEmailForm(false)}
                variant="outline"
                disabled={loading !== null}
              />
            </>
          )}

          <Text style={styles.terms}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.termsLink}
              onPress={() => (navigation as any).navigate('Terms')}
              accessibilityRole="link"
            >
              Terms of Service
            </Text>
            {' '}and{' '}
            <Text
              style={styles.termsLink}
              onPress={() => (navigation as any).navigate('Privacy')}
              accessibilityRole="link"
            >
              Privacy Policy
            </Text>
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
    padding: spacing.lg,
  },
  flex: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mark: { marginBottom: spacing.base },
  logo: {
    fontSize: 42,
    fontWeight: fonts.weights.extrabold as '800',
    color: brand.ink,
    marginBottom: 12,
  },
  tagline: {
    fontSize: fonts.sizes.base,
    color: brand.inkFaint,
    textAlign: 'center',
    lineHeight: 22,
  },
  valueProps: {
    marginTop: spacing.lg,
    gap: spacing.sm,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.md,
  },
  valueProp: {
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    lineHeight: 19,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  emailTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.md,
    color: brand.inkSoft,
  },
  errorText: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    textAlign: 'center',
    lineHeight: 18,
  },
  infoText: {
    fontSize: fonts.sizes.sm,
    color: brand.pine,
    textAlign: 'center',
    lineHeight: 18,
  },
  forgotLink: {
    fontSize: fonts.sizes.sm,
    color: brand.pine,
    textAlign: 'center',
    textDecorationLine: 'underline',
    paddingVertical: 4,
  },
  terms: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
  termsLink: {
    color: brand.pine,
    textDecorationLine: 'underline',
  },
});
