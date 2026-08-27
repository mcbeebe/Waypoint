/**
 * "Waypoint noticed" — Resource Stack edition (mockup Concept C): the mini
 * stack bars, the one observation about the fastest unlock, and the
 * WHAT/WHY/HOW sheet that converts it into a drafted request. Takes the
 * Waypoint-noticed slot on Home when a deep-dive unlock exists; renders
 * nothing otherwise (resourceStack.deriveStackInsight decides).
 */
import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import type { StackInsight } from '@/lib/resourceStack';
import type { FunnelLocale } from '@/lib/eligibility';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const SHEET_STRINGS: Record<FunnelLocale, {
  what: string; why: string; how: string; tip: string; close: string; reviewed: string; later: string;
}> = {
  en: { what: 'WHAT', why: 'WHY', how: 'HOW', tip: 'Parent tip.', close: 'Not now', reviewed: 'free feature', later: 'Remind me later' },
  es: { what: 'QUÉ', why: 'POR QUÉ', how: 'CÓMO', tip: 'Consejo de padres.', close: 'Ahora no', reviewed: 'función gratuita', later: 'Recuérdamelo después' },
  vi: { what: 'GÌ', why: 'VÌ SAO', how: 'CÁCH', tip: 'Mẹo cho phụ huynh.', close: 'Để sau', reviewed: 'tính năng miễn phí', later: 'Nhắc tôi sau' },
};

interface StackInsightCardProps {
  insight: StackInsight;
  locale: FunnelLocale;
  /** Open the lever letter (template key) — the sheet's primary action. */
  onDraft: (template: string) => void;
  /** Tap anywhere on the card body → the full Resource Stack view. */
  onOpenStack?: () => void;
  /** "Remind me later" — snoozes the card. */
  onSnooze?: () => void;
}

export default function StackInsightCard({ insight, locale, onDraft, onOpenStack, onSnooze }: StackInsightCardProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const S = SHEET_STRINGS[locale];
  const g = insight.guide;

  return (
    <Pressable
      style={styles.card}
      onPress={onOpenStack}
      disabled={!onOpenStack}
      accessibilityRole="button"
      accessibilityLabel={insight.title}
    >
      <Text style={styles.eyebrow}>✦ {insight.eyebrow}</Text>
      <View style={styles.bars}>
        {insight.bars.map((b) => (
          <View key={b.key} style={styles.barCol}>
            <View
              style={[
                styles.bar,
                b.status === 'secured' && styles.barSecured,
                b.status === 'in_progress' && styles.barProgress,
                b.key === g.layerKey && styles.barNext,
              ]}
            />
            <Text
              style={[styles.barLabel, b.key === g.layerKey && styles.barLabelNext]}
              numberOfLines={1}
            >
              {b.label}
              {b.status === 'secured' ? ' ✓' : ''}
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.title}>{insight.title}</Text>
      <Text style={styles.body}>{insight.body}</Text>
      <View style={styles.footer}>
        <Text style={styles.citation}>ⓘ {insight.citation}</Text>
        <Pressable
          style={styles.cta}
          onPress={(e) => {
            (e as { stopPropagation?: () => void })?.stopPropagation?.();
            setSheetOpen(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={insight.ctaLabel}
        >
          <Text style={styles.ctaText}>{insight.ctaLabel}</Text>
        </Pressable>
      </View>
      {onSnooze && (
        <Pressable
          style={styles.snooze}
          onPress={(e) => {
            (e as { stopPropagation?: () => void })?.stopPropagation?.();
            onSnooze();
          }}
          accessibilityRole="button"
          accessibilityLabel={S.later}
        >
          <Text style={styles.snoozeText}>{S.later}</Text>
        </Pressable>
      )}

      <Modal
        visible={sheetOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSheetOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setSheetOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => undefined}>
            <View style={styles.grabber} />
            <Text style={styles.sheetTitle}>{g.title}</Text>
            {(
              [
                [S.what, g.what],
                [S.why, g.why],
                [S.how, g.how],
              ] as const
            ).map(([label, text]) => (
              <View key={label} style={styles.row}>
                <Text style={styles.rowKey}>{label}</Text>
                <Text style={styles.rowText}>{text}</Text>
              </View>
            ))}
            <View style={styles.tipBox}>
              <Text style={styles.tipText}>
                <Text style={styles.tipLead}>{S.tip} </Text>
                {g.tip}
              </Text>
            </View>
            <Pressable
              style={styles.sheetCta}
              onPress={() => {
                setSheetOpen(false);
                onDraft(g.leverTemplate);
              }}
            >
              <Text style={styles.sheetCtaText}>{g.leverLabel}</Text>
            </Pressable>
            <Pressable style={styles.sheetClose} onPress={() => setSheetOpen(false)}>
              <Text style={styles.sheetCloseText}>{S.close}</Text>
            </Pressable>
            <Text style={styles.sheetFoot}>ⓘ {g.citation} · {S.reviewed}</Text>
          </Pressable>
        </Pressable>
      </Modal>
    </Pressable>
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
  bars: { flexDirection: 'row', gap: spacing.xs, marginTop: spacing.md },
  barCol: { flex: 1, alignItems: 'center', gap: 4 },
  bar: {
    alignSelf: 'stretch',
    height: 26,
    borderRadius: radii.sm - 4,
    backgroundColor: colors.dark,
  },
  barSecured: { backgroundColor: semantic.success },
  barProgress: { backgroundColor: colors.warning },
  barNext: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.teal,
  },
  barLabel: { color: '#8FA0B5', fontSize: fonts.sizes.xs },
  barLabelNext: { color: colors.teal, fontWeight: fonts.weights.bold },
  title: {
    marginTop: spacing.md,
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
  citation: { color: '#8FA0B5', fontSize: fonts.sizes.xs, flexShrink: 1 },
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.base,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
    lineHeight: 26,
  },
  row: { flexDirection: 'row', gap: spacing.md },
  rowKey: {
    minWidth: 52,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.extrabold,
    color: colors.teal,
  },
  rowText: { flex: 1, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  tipBox: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm + 2,
    padding: spacing.md,
  },
  tipText: { fontSize: fonts.sizes.md, color: '#78350F', lineHeight: 19 },
  tipLead: { fontWeight: fonts.weights.extrabold, color: semantic.warning },
  sheetCta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetCtaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  sheetClose: { minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  sheetCloseText: { color: colors.mid, fontSize: fonts.sizes.md, fontWeight: fonts.weights.semibold },
  sheetFoot: { textAlign: 'center', fontSize: fonts.sizes.xs, color: colors.mid },
});
