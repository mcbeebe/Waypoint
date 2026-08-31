/**
 * Brand kit primitives (initiative 006, phase 2) — the warm card vocabulary
 * every migrated screen shares. Colors from the `brand` tokens; not yet used
 * by any screen (phase 3 applies them).
 *
 *  - BrandCard     white panel, warm border, soft shadow
 *  - SectionLabel  the small uppercase pine section header
 *  - ProgressRail  the sage progress bar (green = moving forward), with an
 *                  accessible value AND a text amount — color never carries
 *                  the meaning alone (the audience critique).
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { useTextScale } from '@/lib/textSize';
import { brand, fonts, radii, spacing } from '@/lib/theme';

export function BrandCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function SectionLabel({ children }: { children: string }) {
  const { scale } = useTextScale();
  return (
    <Text style={[styles.sectionLabel, { fontSize: Math.round(12 * scale) }]}>
      {children}
    </Text>
  );
}

/**
 * A progress bar. `value` is 0–1. `amount` (e.g. "5 of 8 done") is REQUIRED —
 * it's both the screen-reader value and a visible caption, so the sage fill
 * never carries the meaning by color alone.
 */
export function ProgressRail({ value, amount }: { value: number; amount: string }) {
  // Number.isFinite guards NaN/±Infinity — a caller computing `done / total`
  // hits 0/0 = NaN for an empty section, which would otherwise slip past the
  // Math.max/min clamp into "NaN%" width and a NaN accessibility value.
  const clamped = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
      accessibilityLabel={amount}
    >
      <View style={styles.railTrack}>
        <View testID="progress-fill" style={[styles.railFill, { width: `${clamped * 100}%` }]} />
      </View>
      <Text style={styles.railAmount}>{amount}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.lg,
    padding: spacing.base,
    shadowColor: '#3C2D19',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 2,
  },
  sectionLabel: {
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.9,
    textTransform: 'uppercase',
    color: brand.pine,
  },
  railTrack: {
    height: 8,
    borderRadius: 8,
    backgroundColor: brand.sageTint,
    overflow: 'hidden',
  },
  railFill: {
    height: '100%',
    backgroundColor: brand.sage,
    borderRadius: 8,
  },
  railAmount: {
    fontSize: 13,
    color: brand.inkSoft,
    marginTop: 7,
  },
});
