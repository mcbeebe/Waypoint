/**
 * SDP Journey (Resource-Stack plan, phase 2 — mockup Concept B): the
 * enrollment path as a vertical stepper, steps 0–8 per DDS directive
 * D-2026-SDP-002. Exactly one primary CTA — on the current step — wired
 * to the matching lever letter; the family self-reports position by
 * marking steps done, and every claim carries its citation.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import { deriveSdpJourney, SDP_JOURNEY_TOTAL } from '@/lib/sdpJourney';
import type { SdpJourneyStep, SdpStepStatus } from '@/lib/sdpJourney';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const STRINGS: Record<FunnelLocale, {
  eyebrow: string;
  badge: string;
  heroTitle: (name: string) => string;
  stepOf: (n: number) => string;
  pace: string;
  youAreHere: string;
  youGet: string;
  markDone: string;
  imHere: string;
  doneNote: string;
  yourChild: string;
  saveFailed: string;
  saved: (n: number) => string;
}> = {
  en: {
    eyebrow: 'SELF-DETERMINATION JOURNEY',
    badge: 'Current — 2026 DDS rules',
    heroTitle: (name) => `${name}'s path to their own budget`,
    stepOf: (n) => `Step ${n} of ${SDP_JOURNEY_TOTAL}`,
    pace: 'Pace is set by your Regional Center — but every wait has a clock, and we track them.',
    youAreHere: 'You are here',
    youGet: 'You get:',
    markDone: 'I’ve done this — next step →',
    imHere: 'I’m on this step',
    doneNote: 'Done',
    yourChild: 'Your child',
    saveFailed: "Couldn't save your progress — please try again in a moment.",
    saved: (n) => `Saved — you're on step ${n}.`,
  },
  es: {
    eyebrow: 'CAMINO DE AUTODETERMINACIÓN',
    badge: 'Vigente — reglas DDS 2026',
    heroTitle: (name) => `El camino de ${name} hacia su propio presupuesto`,
    stepOf: (n) => `Paso ${n} de ${SDP_JOURNEY_TOTAL}`,
    pace: 'El ritmo lo marca su Centro Regional — pero cada espera tiene un plazo, y los seguimos.',
    youAreHere: 'Usted está aquí',
    youGet: 'Usted recibe:',
    markDone: 'Ya lo hice — siguiente paso →',
    imHere: 'Estoy en este paso',
    doneNote: 'Hecho',
    yourChild: 'Su hijo/a',
    saveFailed: 'No se pudo guardar su progreso — inténtelo de nuevo en un momento.',
    saved: (n) => `Guardado — está en el paso ${n}.`,
  },
  vi: {
    eyebrow: 'HÀNH TRÌNH TỰ QUYẾT',
    badge: 'Hiện hành — quy định DDS 2026',
    heroTitle: (name) => `Con đường của ${name} đến ngân sách riêng`,
    stepOf: (n) => `Bước ${n} / ${SDP_JOURNEY_TOTAL}`,
    pace: 'Nhịp độ do Trung tâm Khu vực quyết định — nhưng mỗi lần chờ đều có thời hạn, và chúng tôi theo dõi giúp quý vị.',
    youAreHere: 'Quý vị đang ở đây',
    youGet: 'Quý vị nhận được:',
    markDone: 'Tôi đã xong — bước tiếp theo →',
    imHere: 'Tôi đang ở bước này',
    doneNote: 'Đã xong',
    yourChild: 'Con quý vị',
    saveFailed: 'Không lưu được tiến trình — vui lòng thử lại sau giây lát.',
    saved: (n) => `Đã lưu — quý vị đang ở bước ${n}.`,
  },
};

type Nav = NativeStackNavigationProp<HomeStackParamList>;

export default function SdpJourneyScreen() {
  const navigation = useNavigation<Nav>();
  const { family } = useFamily();
  const { children, updateChild } = useChildren(family?.id);
  const child = children[0];
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const journey = useMemo(
    () => deriveSdpJourney(child?.sdp_step, funnelLocale),
    [child?.sdp_step, funnelLocale]
  );
  const currentN = journey.steps[journey.currentIndex]?.n ?? 0;
  const childName = child?.first_name || S.yourChild;

  const setStep = async (n: number) => {
    if (!child || saving) return;
    setSaving(true);
    try {
      const step = Math.min(Math.max(n, 0), SDP_JOURNEY_TOTAL);
      const ok = await updateChild(child.id, { sdp_step: step });
      // A failed save must be loud — a silent no-op reads as a dead button.
      if (ok) showToast(S.saved(step), 'success');
      else showToast(S.saveFailed, 'error');
    } finally {
      setSaving(false);
    }
  };

  const openLetter = (template: string) =>
    navigation.navigate('Letters', { template });

  const renderStep = (step: SdpJourneyStep & { status: SdpStepStatus }, isLast: boolean) => {
    const done = step.status === 'done';
    const current = step.status === 'current';
    return (
      <View key={step.key} style={styles.row}>
        <View style={styles.railCol}>
          <View
            style={[
              styles.node,
              done && styles.nodeDone,
              current && styles.nodeCurrent,
            ]}
          >
            <Text style={[styles.nodeText, (done || current) && styles.nodeTextOn]}>
              {done ? '✓' : step.n}
            </Text>
          </View>
          {!isLast && (
            <View style={[styles.rail, done && styles.railDone, current && styles.railCurrent]} />
          )}
        </View>
        <View style={[styles.card, current && styles.cardCurrent]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, current && styles.cardTitleCurrent]}>
              {step.title}
            </Text>
            {current && (
              <View style={styles.herePill}>
                <Text style={styles.herePillText}>{S.youAreHere}</Text>
              </View>
            )}
            {done && (
              <View style={styles.donePill}>
                <Text style={styles.donePillText}>✓ {S.doneNote}</Text>
              </View>
            )}
          </View>
          {(current || !done) && <Text style={styles.cardBody}>{current ? step.body : ''}</Text>}
          {!current && (
            <Text style={styles.youGet}>
              <Text style={styles.youGetLead}>{S.youGet} </Text>
              {step.youGet}
            </Text>
          )}
          {current && step.checklist.length > 0 && (
            <View style={styles.checklist}>
              {step.checklist.map((item) => (
                <Text key={item} style={styles.checkItem}>☐ {item}</Text>
              ))}
            </View>
          )}
          {current && step.leverTemplate && (
            <Pressable style={styles.cta} onPress={() => openLetter(step.leverTemplate!)}>
              <Text style={styles.ctaText}>✉️ {step.leverLabel}</Text>
            </Pressable>
          )}
          {current && (
            <Pressable
              style={({ pressed }) => [
                styles.advance,
                (pressed || saving) && styles.pressedDim,
              ]}
              hitSlop={8}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={S.markDone}
              onPress={() => setStep(step.n + 1)}
            >
              <Text style={styles.advanceText}>{S.markDone}</Text>
            </Pressable>
          )}
          {!current && !done && (
            <Pressable
              style={({ pressed }) => [styles.hereBtn, (pressed || saving) && styles.pressedDim]}
              hitSlop={8}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={S.imHere}
              onPress={() => setStep(step.n)}
            >
              <Text style={styles.hereBtnText}>{S.imHere}</Text>
            </Pressable>
          )}
          <Text style={styles.citation}>ⓘ {step.citation}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.topRow}>
        <Text style={styles.eyebrow}>{S.eyebrow}</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{S.badge}</Text>
        </View>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{S.heroTitle(childName)}</Text>
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${journey.progressPct}%` }]} />
          </View>
          <Text style={styles.progressLabel}>{S.stepOf(Math.min(currentN, SDP_JOURNEY_TOTAL))}</Text>
        </View>
        <Text style={styles.heroPace}>{S.pace}</Text>
      </View>

      {journey.steps.map((s, i) => renderStep(s, i === journey.steps.length - 1))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.teal,
    flexShrink: 1,
  },
  badge: {
    backgroundColor: '#E0F2FE',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  badgeText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, color: colors.teal },
  hero: {
    backgroundColor: colors.navy,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.white,
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.extrabold,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  progressTrack: {
    flex: 1,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.dark,
    overflow: 'hidden',
  },
  progressFill: { height: 8, backgroundColor: colors.teal },
  progressLabel: { color: colors.white, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  heroPace: { color: '#94A3B8', fontSize: fonts.sizes.sm },
  row: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  railCol: { alignItems: 'center' },
  node: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nodeDone: { backgroundColor: semantic.success, borderColor: semantic.success },
  nodeCurrent: { backgroundColor: colors.teal, borderColor: colors.teal },
  nodeText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.extrabold, color: colors.mid },
  nodeTextOn: { color: colors.white },
  rail: { width: 2, flexGrow: 1, backgroundColor: colors.border, marginTop: 2 },
  railDone: { backgroundColor: semantic.success },
  railCurrent: { backgroundColor: colors.teal },
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: spacing.sm,
  },
  cardCurrent: { borderColor: colors.teal, borderWidth: 2 },
  cardHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardTitle: {
    flex: 1,
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  cardTitleCurrent: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.extrabold },
  herePill: {
    backgroundColor: '#E0F2FE',
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  herePillText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, color: colors.teal },
  donePill: {
    backgroundColor: semantic.successBg,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  donePillText: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, color: semantic.success },
  cardBody: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  youGet: { fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 20 },
  youGetLead: { fontWeight: fonts.weights.bold, color: semantic.success },
  checklist: { gap: spacing.xs },
  checkItem: { fontSize: fonts.sizes.md, color: colors.dark },
  cta: {
    minHeight: 44,
    borderRadius: radii.sm + 2,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  advance: {
    minHeight: 40,
    borderRadius: radii.sm + 2,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  advanceText: { color: colors.teal, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold },
  pressedDim: { opacity: 0.55 },
  hereBtn: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
  hereBtnText: {
    color: colors.mid,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  citation: { fontSize: fonts.sizes.xs, color: colors.mid },
});
