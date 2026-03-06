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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { signInWithApple, signInWithGoogle, signInWithEmail, signUpWithEmail } from '@/lib/auth';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function WelcomeScreen() {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<'apple' | 'google' | 'email' | null>(null);

  const handleApple = async () => {
    setLoading('apple');
    const result = await signInWithApple();
    setLoading(null);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      Alert.alert('Sign-In Failed', result.error);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    const result = await signInWithGoogle();
    setLoading(null);
    if (!result.success && result.error !== 'Sign-in cancelled') {
      Alert.alert('Sign-In Failed', result.error);
    }
  };

  const handleEmail = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }

    setLoading('email');
    const result = isSignUp
      ? await signUpWithEmail(email.trim(), password)
      : await signInWithEmail(email.trim(), password);
    setLoading(null);

    if (!result.success) {
      Alert.alert(isSignUp ? 'Sign-Up Failed' : 'Sign-In Failed', result.error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.logo}>Waypoint</Text>
          <Text style={styles.tagline}>
            Your child's unexpected journey.{'\n'}Every step, mapped.
          </Text>
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
              <Button
                title="Continue with Google"
                onPress={handleGoogle}
                variant="outline"
                loading={loading === 'google'}
                disabled={loading !== null}
              />
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
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor={colors.mid}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Password (6+ characters)"
                placeholderTextColor={colors.mid}
                secureTextEntry
              />

              <Button
                title={isSignUp ? 'Create Account' : 'Sign In'}
                onPress={handleEmail}
                variant="primary"
                loading={loading === 'email'}
                disabled={loading !== null}
              />

              <Button
                title={isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                onPress={() => setIsSignUp(!isSignUp)}
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
            By continuing, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
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
  logo: {
    fontSize: 42,
    fontWeight: fonts.weights.extrabold as '800',
    color: colors.navy,
    marginBottom: 12,
  },
  tagline: {
    fontSize: fonts.sizes.base,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 22,
  },
  actions: {
    gap: 12,
    paddingBottom: 20,
  },
  emailTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.md,
    color: colors.dark,
  },
  terms: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
});
