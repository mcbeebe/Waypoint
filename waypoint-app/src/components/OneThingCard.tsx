/**
 * The One Thing card (Roadmap/Home-Rebuild-Plan.md phase 2) — Home stops
 * being a dashboard and becomes a decision.
 *
 * Everything decidable lives in `lib/homeTriage.ts` (which item, why, when it
 * comes back) and `lib/homeCard.ts` (the sheet, the copy). This file only
 * renders. The rules it is built to keep, from the 20-persona audit:
 *
 * - The kicker states the class and its provenance. Never "Waypoint noticed".
 * - "Why this" is visible on the card, not behind a tap, whenever it is open.
 * - "Not today" always says when the thing comes back, and the item stays
 *   listed under Later with Undo — it never silently disappears.
 * - The order is published: "How Waypoint decides" shows the whole ladder and
 *   what is sitting on every rung right now.
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type {
  TriageItem,
  TriageResult,
  TriageClass,
  LaterItem,
} from '@/lib/homeTriage';
import Citation from '@/components/Citation';
import { buildLadderSheet, calmKicker, cardLabels, deferNotice, laterLine } from '@/lib/homeCard';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, semantic, spacing, radii } from '@/lib/theme';

/** Kicker tints, one per rung — the same palette as the approved prototype. */
const KICKER_TINT: Record<TriageClass, { bg: string; fg: string }> = {
  resume: { bg: '#EDE9FE', fg: '#6D28D9' },
  crisis: { bg: semantic.dangerBg, fg: semantic.danger },
  overdue: { bg: semantic.dangerBg, fg: semantic.danger },
  reply: { bg: semantic.infoBg, fg: '#0369A1' },
  today: { bg: semantic.warningBg, fg: semantic.warning },
  clock: { bg: semantic.warningBg, fg: semantic.warning },
  question: { bg: '#F1F5F9', fg: '#475569' },
  opportunity: { bg: semantic.successBg, fg: semantic.success },
};

const CARD_OPEN_KEY = 'waypoint.home.cardOpen';

interface OneThingCardProps {
  result: TriageResult;
  locale: FunnelLocale;
  /** False when set-aside items live only on this device (048 not applied). */
  shared: boolean;
  completedIds?: string[];
  onAct: (item: TriageItem) => void;
  onDefer: (item: TriageItem) => void;
  onAnswer: (item: TriageItem, value: string) => void;
}

export default function OneThingCard({
  result,
  locale,
  shared,
  completedIds,
  onAct,
  onDefer,
  onAnswer,
}: OneThingCardProps) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const labels = cardLabels(locale);
  const [open, setOpen] = useState(true);
  const [sheetVisible, setSheetVisible] = useState(false);

  // The collapse choice is a per-device reading preference, remembered.
  useEffect(() => {
    AsyncStorage.getItem(CARD_OPEN_KEY)
      .then((v) => { if (v === '0') setOpen(false); })
      .catch(() => {});
  }, []);
  const toggle = () => {
    setOpen((prev) => {
      AsyncStorage.setItem(CARD_OPEN_KEY, prev ? '0' : '1').catch(() => {});
      return !prev;
    });
  };

  const item = result.item;
  const calm = result.calm;
  const tint = item ? KICKER_TINT[item.cls] : null;

  const head = (kicker: string, kickerTint: { bg: string; fg: string } | null) => (
    <View style={styles.head}>
      <View
        style={[styles.kicker, kickerTint ? { backgroundColor: kickerTint.bg } : styles.kickerCalm]}
      >
        <Text
          style={[
            styles.kickerText,
            { fontSize: sz(10.5) },
            kickerTint ? { color: kickerTint.fg } : { color: semantic.success },
          ]}
        >
          {kicker}
        </Text>
      </View>
      {!!item && (
        <Pressable
          onPress={toggle}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={open ? labels.collapse : labels.expand}
        >
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={colors.mid}
          />
        </Pressable>
      )}
    </View>
  );

  return (
    <>
      {item ? (
        <View style={[styles.card, !open && styles.cardTight]}>
          {head(item.kicker, tint)}
          <Text
            style={[styles.title, { fontSize: sz(open ? 18 : 16.5), lineHeight: sz(open ? 24 : 22) }]}
            numberOfLines={open ? undefined : 2}
          >
            {item.title}
          </Text>

          {open && (
            <Text style={[styles.why, { fontSize: sz(13), lineHeight: sz(20) }]}>
              {item.why}
            </Text>
          )}
          {/* The citation stays with the claim. Hiding the legal basis behind
              a toggle that persists, while the claim itself stays on screen,
              would invert the rule the card exists to keep. Phase 9c: it is now
              tappable — the authority, the claim, and the verified date behind
              the grey chip that used to be inert. */}
          {!!item.citation && <Citation citation={item.citation} locale={locale} fontSize={sz(11.5)} />}

          {item.answers ? (
            <View style={styles.answers}>
              {item.answers.map((a) => (
                <Pressable
                  key={a.value}
                  style={({ pressed }) => [styles.answer, pressed && styles.dim]}
                  onPress={() => onAnswer(item, a.value)}
                  accessibilityRole="button"
                  accessibilityLabel={a.label}
                >
                  <Text style={[styles.answerText, { fontSize: sz(14), lineHeight: sz(19) }]}>
                    {a.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : (
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.dim]}
              onPress={() => onAct(item)}
              accessibilityRole="button"
              accessibilityLabel={item.action.label}
            >
              <Text style={[styles.ctaText, { fontSize: sz(15), lineHeight: sz(20) }]}>
                {item.action.label}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [styles.ghost, pressed && styles.dim]}
            onPress={() => onDefer(item)}
            accessibilityRole="button"
            accessibilityLabel={`${labels.notToday}. ${deferNotice(item, { shared }, locale)}`}
          >
            <Text style={[styles.ghostText, { fontSize: sz(13), lineHeight: sz(18) }]}>
              {labels.notToday}
            </Text>
            {/* The return date is on the button, not only in the screen
                reader's label — a sighted parent used to learn it only after
                tapping. */}
            <Text style={[styles.ghostNote, { fontSize: sz(11.5), lineHeight: sz(16) }]}>
              {deferNotice(item, { shared }, locale)}
            </Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ghost, pressed && styles.dim]}
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={labels.howWeDecide}
          >
            <Text
              style={[styles.ghostText, styles.ghostFaint, { fontSize: sz(12.5), lineHeight: sz(18) }]}
            >
              {labels.howWeDecide}
            </Text>
          </Pressable>
        </View>
      ) : calm ? (
        <View style={[styles.card, styles.cardCalm]}>
          {head(calmKicker(calm.kind, locale), null)}
          <Text style={[styles.title, { fontSize: sz(18), lineHeight: sz(24) }]}>
            {calm.title}
          </Text>
          <Text style={[styles.why, { fontSize: sz(13.5), lineHeight: sz(20) }]}>{calm.body}</Text>
          <Pressable
            style={({ pressed }) => [styles.ghost, pressed && styles.dim]}
            onPress={() => setSheetVisible(true)}
            accessibilityRole="button"
            accessibilityLabel={labels.howWeDecide}
          >
            <Text style={[styles.ghostText, styles.ghostFaint, { fontSize: sz(12.5) }]}>
              {labels.howWeDecide}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <LadderSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        result={result}
        locale={locale}
        completedIds={completedIds}
      />
    </>
  );
}

/** The published order, with what is sitting on every rung right now. */
function LadderSheet({
  visible,
  onClose,
  result,
  locale,
  completedIds,
}: {
  visible: boolean;
  onClose: () => void;
  result: TriageResult;
  locale: FunnelLocale;
  completedIds?: string[];
}) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const sheet = buildLadderSheet({ result, locale, completedIds });

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.sheet} edges={['top']}>
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { fontSize: sz(17) }]}>{sheet.title}</Text>
          <Pressable
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel={sheet.dismissLabel}
          >
            <Ionicons name="close" size={24} color={colors.mid} />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.sheetBody}>
          <Text style={[styles.sheetIntro, { fontSize: sz(13.5), lineHeight: sz(20) }]}>
            {sheet.intro}
          </Text>
          {sheet.rows.map((row) => (
            <View
              key={row.cls ?? 'calm'}
              style={[styles.ladderRow, row.state === 'now' && styles.ladderRowHit]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`${row.position ?? ''} ${row.name}: ${row.stateLabel}`}
            >
              <Text style={[styles.ladderNum, { fontSize: sz(12) }]}>
                {row.position ?? '✓'}
              </Text>
              <Text style={[styles.ladderName, { fontSize: sz(13.5), lineHeight: sz(19) }]}>
                {row.name}
              </Text>
              <Text
                style={[
                  styles.ladderState,
                  { fontSize: sz(11.5) },
                  row.state === 'now' && styles.ladderStateHit,
                ]}
              >
                {row.stateLabel}
              </Text>
            </View>
          ))}
          <Pressable
            style={({ pressed }) => [styles.sheetDone, pressed && styles.dim]}
            onPress={onClose}
            accessibilityRole="button"
          >
            <Text style={[styles.sheetDoneText, { fontSize: sz(15) }]}>{sheet.dismissLabel}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

/**
 * Set aside, not gone. Every deferred item stays listed with the day it comes
 * back and an Undo — the permanent dismiss was the audit's #6 failure.
 */
export function LaterList({
  later,
  locale,
  shared,
  onUndo,
}: {
  later: LaterItem[];
  locale: FunnelLocale;
  shared: boolean;
  onUndo: (itemId: string) => void;
}) {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const labels = cardLabels(locale);
  if (later.length === 0) return null;

  return (
    <View style={styles.laterWrap}>
      <Text style={[styles.laterHeading, { fontSize: sz(11) }]}>
        {labels.laterHeading.toUpperCase()}
      </Text>
      {later.map((l) => (
        <View key={l.id} style={styles.laterRow}>
          <View style={styles.laterText}>
            <Text
              style={[styles.laterTitle, { fontSize: sz(13.5), lineHeight: sz(18) }]}
              numberOfLines={3}
            >
              {l.title}
            </Text>
            <Text style={[styles.laterWhen, { fontSize: sz(11.5) }]}>
              {deferNotice({ deferLabel: laterLine(l, locale) }, { shared }, locale)}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.undo, pressed && styles.dim]}
            onPress={() => onUndo(l.id)}
            accessibilityRole="button"
            accessibilityLabel={`${labels.undo}: ${l.title}`}
          >
            <Text style={[styles.undoText, { fontSize: sz(13) }]}>{labels.undo}</Text>
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.teal,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.sm,
    shadowColor: colors.teal,
    shadowOpacity: 0.1,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardTight: { gap: spacing.xs + 3, paddingVertical: spacing.md },
  cardCalm: { borderColor: '#A7D9C9', shadowOpacity: 0 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  kicker: { borderRadius: 6, paddingVertical: 3, paddingHorizontal: 8, flexShrink: 1 },
  kickerCalm: { backgroundColor: semantic.successBg },
  kickerText: { fontWeight: fonts.weights.extrabold, letterSpacing: 0.7 },
  title: {
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
    lineHeight: 24,
  },
  why: { color: colors.dark, lineHeight: 20 },
  cta: {
    minHeight: 46,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold, textAlign: 'center' },
  answers: { gap: spacing.sm },
  answer: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.light,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  answerText: { color: colors.navy, fontWeight: fonts.weights.semibold, textAlign: 'center' },
  // MIN_TOUCH_TARGET (lib/accessibility.ts) is 44; these were 32 and 36.
  ghost: {
    minHeight: 44,
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingVertical: spacing.xs,
  },
  ghostNote: { color: '#94A3B8', fontWeight: fonts.weights.medium },
  ghostText: { color: colors.mid, fontWeight: fonts.weights.semibold },
  ghostFaint: { color: '#94A3B8', fontWeight: fonts.weights.medium },
  dim: { opacity: 0.6 },

  sheet: { flex: 1, backgroundColor: colors.white },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.md,
  },
  sheetTitle: { flex: 1, fontWeight: fonts.weights.extrabold, color: colors.navy },
  sheetBody: { padding: spacing.lg, gap: spacing.sm },
  sheetIntro: { color: colors.dark, lineHeight: 20, marginBottom: spacing.sm },
  ladderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ladderRowHit: { backgroundColor: '#ECFEFF', borderRadius: radii.sm, paddingHorizontal: spacing.sm },
  ladderNum: {
    width: 22,
    textAlign: 'center',
    color: colors.mid,
    fontWeight: fonts.weights.bold,
  },
  ladderName: { flex: 1, color: colors.navy, lineHeight: 19 },
  ladderState: { color: colors.mid, fontWeight: fonts.weights.semibold },
  ladderStateHit: { color: colors.teal, fontWeight: fonts.weights.bold },
  sheetDone: {
    marginTop: spacing.lg,
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetDoneText: { color: colors.teal, fontWeight: fonts.weights.bold },

  laterWrap: { marginBottom: spacing.base, gap: spacing.sm },
  laterHeading: {
    color: colors.mid,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
  },
  laterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  laterText: { flex: 1, gap: 2 },
  laterTitle: { color: colors.navy, fontWeight: fonts.weights.semibold, lineHeight: 18 },
  laterWhen: { color: colors.mid },
  undo: {
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  undoText: { color: colors.teal, fontWeight: fonts.weights.bold },
});
