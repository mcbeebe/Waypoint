/**
 * Premium gate (PRD W-E: E3) — wraps a Premium feature. Premium (or
 * sponsored) families see the feature; free families see a value
 * explanation with the path to Premium — never a dead end, and never a
 * gate on anything the free tier promises.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '@/hooks/useFamily';
import { useEntitlement } from '@/hooks/useEntitlement';
import { gateCopy } from '@/lib/entitlements';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

interface PremiumGateProps {
  /** Human name of the feature, e.g. "IEP document analysis". */
  feature: string;
  children: React.ReactNode;
}

export default function PremiumGate({ feature, children }: PremiumGateProps) {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { isPremium, loading } = useEntitlement(family?.id);

  // While resolving, render nothing gated-looking — a flash of paywall on
  // every load would punish paying families.
  if (loading || isPremium) return <>{children}</>;

  const copy = gateCopy(feature);
  return (
    <View style={styles.card}>
      <Text style={styles.badge}>PREMIUM</Text>
      <Text style={styles.title}>{copy.title}</Text>
      <Text style={styles.body}>{copy.body}</Text>
      <Pressable
        style={styles.cta}
        onPress={() => (navigation as any).navigate('Pricing')}
      >
        <Text style={styles.ctaText}>See what Premium includes</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.lg,
    margin: spacing.base,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: semantic.infoBg,
    color: semantic.info,
    fontWeight: fonts.weights.bold,
    fontSize: fonts.sizes.xs,
    letterSpacing: 1,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  title: {
    marginTop: spacing.md,
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
  },
  body: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 21 },
  cta: {
    marginTop: spacing.base,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.base },
});
