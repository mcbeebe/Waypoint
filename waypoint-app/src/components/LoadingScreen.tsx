/**
 * Full-screen loading indicator — used during auth checks, data fetching, etc.
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, fonts, spacing } from '@/lib/theme';

interface LoadingScreenProps {
  message?: string;
}

export default function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message ?? 'Loading'}>
      <ActivityIndicator size="large" color={colors.teal} />
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8FAFB',
    padding: spacing.xl,
  },
  message: {
    marginTop: spacing.md,
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
  },
});
