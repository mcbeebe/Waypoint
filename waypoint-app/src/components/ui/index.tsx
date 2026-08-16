/**
 * Waypoint UI kit (roadmap 0.5 / UX 1) — the primitives every screen
 * composes from, built on the theme tokens. New screens should reach for
 * these before writing bespoke card/label/chip styles.
 *
 * Exports: Card, SectionTitle, Chip, Skeleton
 * (Button, EmptyState, LoadingScreen, Toast live as siblings in components/)
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

// ─── Card ───────────────────────────────────────────────────────────────────

interface CardProps {
  children: React.ReactNode;
  /** Optional semantic accent shown as a left border + tinted background */
  tone?: 'success' | 'warning' | 'danger' | 'info';
  style?: StyleProp<ViewStyle>;
}

/** The standard surface: white, rounded, soft shadow. */
export function Card({ children, tone, style }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        tone && {
          backgroundColor: semantic[`${tone}Bg`],
          borderLeftWidth: 3,
          borderLeftColor: semantic[tone],
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// ─── SectionTitle ───────────────────────────────────────────────────────────

/** Consistent section heading used between cards on a screen. */
export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Text style={styles.sectionTitle} accessibilityRole="header">
      {children}
    </Text>
  );
}

// ─── Chip ───────────────────────────────────────────────────────────────────

interface ChipProps {
  label: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  textSize?: number;
}

/** Small status/metadata pill. */
export function Chip({ label, tone = 'neutral', textSize }: ChipProps) {
  const toneStyle =
    tone === 'neutral'
      ? { backgroundColor: colors.white, borderColor: colors.border }
      : { backgroundColor: semantic[`${tone}Bg`], borderColor: semantic[`${tone}Bg`] };
  const textColor = tone === 'neutral' ? colors.dark : semantic[tone];
  return (
    <View style={[styles.chip, toneStyle]}>
      <Text style={[styles.chipText, { color: textColor }, textSize != null && { fontSize: textSize }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Skeleton ───────────────────────────────────────────────────────────────

interface SkeletonProps {
  height?: number;
  width?: ViewStyle['width'];
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

/** Pulsing placeholder block for loading states (lists get these, not spinners). */
export function Skeleton({ height = 16, width = '100%', borderRadius = radii.sm, style }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      accessibilityElementsHidden
      style={[{ height, width, borderRadius, backgroundColor: colors.border, opacity }, style]}
    />
  );
}

/** Ready-made skeleton for an action/list card. */
export function SkeletonCard() {
  return (
    <View style={styles.card}>
      <Skeleton height={16} width="70%" />
      <View style={{ height: spacing.sm }} />
      <Skeleton height={12} width="45%" />
      <View style={{ height: spacing.sm }} />
      <Skeleton height={10} width="30%" />
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  chip: {
    borderRadius: radii.full,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium as '500',
  },
});
