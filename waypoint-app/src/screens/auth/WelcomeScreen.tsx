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
import { useI18n } from '@/i18n';
import { toFunnelLocale } from '@/lib/eligibility';
import {
  welcomeCopy,
  emailNeededForReset,
  confirmationSent,
  resetSent,
  localizeAuthError,
} from '@/lib/welcomeCopy';
import { brand, fonts, spacing, radii } from '@/lib/theme';

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
  // The app opens in the device's language (see `src/i18n/resolveLocale.ts`),
  // so this is the first screen where that seed is visible to a parent.
  const { locale } = useI18n();
  const fl = toFunnelLocale(locale);
  const copy = welcomeCopy(fl);
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
      setError(localizeAuthError(result.error, copy, fl));
    }
  };

  const handleGoogle = async () => {
    clearMessages();
    setLoading('google');
    const result = await signInWithGoogle();
    setLoading(null);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      setError(localizeAuthError(result.error, copy, fl));
    }
  };

  const handleEmail = async () => {
    clearMessages();
    if (!email.trim() || !password.trim()) {
      setError(copy.missingCredentials);
      return;
    }
    if (password.length < 6) {
      setError(copy.passwordTooShort);
      return;
    }

    setLoading('email');
    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);
    setLoading(null);

    if (!result.success) {
      // Everything auth.ts returns is English — its own prose and Supabase's
      // alike — so it is mapped to the parent's language here rather than
      // rendered raw under a translated UI.
      setError(localizeAuthError(result.error, copy, fl));
      return;
    }
    if (isSignUp && 'needsConfirmation' in result && result.needsConfirmation) {
      setInfo(confirmationSent(email.trim(), fl));
    }
  };

  const handleForgotPassword = async () => {
    clearMessages();
    if (!email.trim()) {
      setError(emailNeededForReset(copy.forgotPassword, fl));
      return;
    }
    setLoading('reset');
    const result = await requestPasswordReset(email.trim());
    setLoading(null);
    if (!result.success) {
      setError(localizeAuthError(result.error, copy, fl));
      return;
    }
    setInfo(resetSent(email.trim(), fl));
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
          <Text style={styles.tagline}>{copy.tagline}</Text>
          {/* Value props (wave 4) — why sign up, in three lines */}
          {!showEmailForm && (
            <View style={styles.valueProps}>
              <Text style={styles.valueProp}>{copy.valueProp1}</Text>
              <Text style={styles.valueProp}>{copy.valueProp2}</Text>
              <Text style={styles.valueProp}>{copy.valueProp3}</Text>
            </View>
          )}
        </View>

        {/* Auth Buttons */}
        <View style={styles.actions}>
          {!showEmailForm ? (
            <>
              {Platform.OS === 'ios' && (
                <Button
                  title={copy.continueWithApple}
                  onPress={handleApple}
                  variant="secondary"
                  loading={loading === 'apple'}
                  disabled={loading !== null}
                />
              )}
              {GOOGLE_SIGNIN_ENABLED && (
                <Button
                  title={copy.continueWithGoogle}
                  onPress={handleGoogle}
                  variant="outline"
                  loading={loading === 'google'}
                  disabled={loading !== null}
                />
              )}
              <Button
                title={copy.signUpWithEmail}
                onPress={() => setShowEmailForm(true)}
                variant="primary"
                disabled={loading !== null}
              />
            </>
          ) : (
            <>
              <Text style={styles.emailTitle}>
                {isSignUp ? copy.createAccount : copy.signIn}
              </Text>

              <TextInput
                style={styles.input}
                value={email}
                onChangeText={(v) => { setEmail(v); setError(null); }}
                placeholder={copy.emailPlaceholder}
                placeholderTextColor={brand.inkFaint}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={(v) => { setPassword(v); setError(null); }}
                placeholder={copy.passwordPlaceholder}
                placeholderTextColor={brand.inkFaint}
                secureTextEntry
              />

              {error ? <Text style={styles.errorText}>{error}</Text> : null}
              {info ? <Text style={styles.infoText}>{info}</Text> : null}

              <Button
                title={isSignUp ? copy.createAccount : copy.signIn}
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
                  {loading === 'reset' ? copy.sendingReset : copy.forgotPassword}
                </Text>
              )}

              <Button
                title={isSignUp ? copy.haveAccount : copy.noAccount}
                onPress={() => { setIsSignUp(!isSignUp); clearMessages(); }}
                variant="outline"
                disabled={loading !== null}
              />

              <Button
                title={copy.backToOptions}
                onPress={() => setShowEmailForm(false)}
                variant="outline"
                disabled={loading !== null}
              />
            </>
          )}

          <Text style={styles.terms}>
            {copy.termsPrefix}
            <Text
              style={styles.termsLink}
              onPress={() => (navigation as any).navigate('Terms')}
              accessibilityRole="link"
            >
              {copy.termsOfService}
            </Text>
            {copy.termsAnd}
            <Text
              style={styles.termsLink}
              onPress={() => (navigation as any).navigate('Privacy')}
              accessibilityRole="link"
            >
              {copy.privacyPolicy}
            </Text>
            {copy.termsSuffix}
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
    color: brand.urgent,
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
