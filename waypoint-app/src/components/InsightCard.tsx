/**
 * "Waypoint noticed" — the Home card that surfaces the one path this
 * family is entitled to but not using (insights.ts decides which). Born
 * from the SDP gap: near-universal eligibility, ~1.5% enrollment, and the
 * families who were never told. Renders nothing when there's nothing
 * honest to say.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { HomeInsight } from '@/lib/insights';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface InsightCardProps {
  insight: HomeInsight;
  onOpen: (target: HomeInsight['target']) => void;
  /** "Remind me later" — snoozes the card (label localized by caller's insight). */
  onSnooze?: () => void;
  snoozeLabel?: string;
}

export default function InsightCard({ insight, onOpen, onSnooze, snoozeLabel }: InsightCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>✦ {insight.eyebrow}</Text>
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.body}>{insight.body}</Text>
      <View style={styles.footer}>
        <Text style={styles.citation}>ⓘ {insight.citation}</Text>
        <Pressable
          style={styles.cta}
          onPress={() => onOpen(insight.target)}
          accessibilityRole="button"
          accessibilityLabel={insight.ctaLabel}
        >
          <Text style={styles.ctaText}>{insight.ctaLabel}</Text>
        </Pressable>
      </View>
      {onSnooze && (
        <Pressable
          style={styles.snooze}
          onPress={onSnooze}
          accessibilityRole="button"
          accessibilityLabel={snoozeLabel ?? 'Remind me later'}
        >
          <Text style={styles.snoozeText}>{snoozeLabel ?? 'Remind me later'}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
  },
  eyebrow: {
    color: colors.teal,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
  },
  title: {
    marginTop: spacing.sm,
    color: colors.white,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.extrabold,
    lineHeight: 24,
  },
  body: { marginTop: spacing.sm, color: '#CBD5E1', fontSize: fonts.sizes.md, lineHeight: 20 },
  footer: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  citation: { color: '#8FA0B5', fontSize: fonts.sizes.xs },
  snooze: { marginTop: spacing.sm, minHeight: 28, justifyContent: 'center', alignSelf: 'flex-start' },
  snoozeText: {
    color: '#8FA0B5',
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  cta: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
});
