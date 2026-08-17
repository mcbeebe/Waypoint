/**
 * Set-new-password screen — shown when the user arrives via a
 * password-recovery email link (Supabase PASSWORD_RECOVERY session).
 */

import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Button from '@/components/Button';
import { updatePassword } from '@/lib/auth';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface ResetPasswordScreenProps {
  /** Called after the password is successfully changed. */
  onDone: () => void;
}

export default function ResetPasswordScreen({ onDone }: ResetPasswordScreenProps) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setError(null);
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSaving(true);
    const result = await updatePassword(password);
    setSaving(false);
    if (!result.success) {
      setError(result.error ?? 'Could not update password. Please try again.');
      return;
    }
    onDone();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>Waypoint</Text>
        <Text style={styles.title}>Choose a New Password</Text>
        <Text style={styles.subtitle}>
          You're signed in through your reset link. Set a new password to finish.
        </Text>

        <TextInput
          style={styles.input}
          value={password}
          onChangeText={(v) => { setPassword(v); setError(null); }}
          placeholder="New password (6+ characters)"
          placeholderTextColor={colors.mid}
          secureTextEntry
          accessibilityLabel="New password"
        />
        <TextInput
          style={styles.input}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); setError(null); }}
          placeholder="Confirm new password"
          placeholderTextColor={colors.mid}
          secureTextEntry
          accessibilityLabel="Confirm new password"
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Button
          title="Save New Password"
          onPress={handleSave}
          variant="primary"
          loading={saving}
          disabled={saving}
        />
        <Button
          title="Skip — keep my current password"
          onPress={onDone}
          variant="outline"
          disabled={saving}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    padding: spacing.lg,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    fontSize: 32,
    fontWeight: fonts.weights.extrabold as '800',
    color: colors.navy,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: fonts.sizes.base,
    color: colors.mid,
    textAlign: 'center',
    marginBottom: spacing.md,
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
  error: {
    fontSize: fonts.sizes.sm,
    color: colors.error,
    textAlign: 'center',
  },
});
