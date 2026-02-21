import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../../components/Button';
import { colors, fonts, spacing } from '../../lib/theme';

export function WelcomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.logo}>Waypoint</Text>
        <Text style={styles.tagline}>
          Your child's unexpected journey.{'\n'}Every step, mapped.
        </Text>
      </View>

      <View style={styles.actions}>
        {/* Auth buttons — wired up in Issue #3 */}
        <Button
          title="Continue with Apple"
          onPress={() => {}}
          variant="secondary"
        />
        <Button
          title="Continue with Google"
          onPress={() => {}}
          variant="outline"
        />
        <Button
          title="Sign up with Email"
          onPress={() => {}}
          variant="primary"
        />

        <Text style={styles.terms}>
          By continuing, you agree to our Terms of Service and Privacy Policy
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'space-between',
    padding: spacing.lg,
  },
  hero: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: fonts.weights.extrabold,
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
  terms: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 14,
  },
});
