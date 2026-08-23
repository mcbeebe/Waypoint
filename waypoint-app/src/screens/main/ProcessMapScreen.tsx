/**
 * Process Map — "you are here" in the Regional Center system (PRD W-G: G1).
 *
 * Renders the RC pipeline with the family's current position derived from
 * the primary child's rc_status, the statutory clock on each step, and the
 * lever letter for the steps that have one. The SDP fork renders for
 * active consumers — the path most families are never told about.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { getRcStages, getSdpFork, deriveStageIndex, sdpAvailable } from '@/lib/processMap';
import { decidePath, getPathQuestions } from '@/lib/pathDecision';
import type { PathAnswers } from '@/lib/pathDecision';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

/** Screen chrome in EN/ES. Vietnamese falls back to English for now. */
const STRINGS: Record<FunnelLocale, {
  title: string;
  subtitle: (name: string) => string;
  youAreHere: string;
  forkEyebrow: string;
  laterTitle: string;
  laterBody: (name: string) => string;
  trust: string;
  yourChild: string;
}> = {
  en: {
    title: 'How the system works',
    subtitle: (name) =>
      `The Regional Center process for ${name}, step by step — with the deadline the law puts on each step and the letter that moves it. Every rule cites its source.`,
    youAreHere: 'YOU ARE HERE',
    forkEyebrow: 'THE FORK MOST FAMILIES NEVER HEAR ABOUT',
    laterTitle: 'Further down the road',
    laterBody: (name) =>
      `Once ${name} is an active Regional Center consumer, a second path opens: the Self-Determination Program, where services become a budget your family directs. We'll show it here when it applies.`,
    trust:
      'Every deadline above cites the statute it comes from. When a step has no legal deadline, we say so — and give you the lever that creates one.',
    yourChild: 'your child',
  },
  es: {
    title: 'Cómo funciona el sistema',
    subtitle: (name) =>
      `El proceso del Centro Regional para ${name}, paso a paso — con el plazo que la ley pone en cada paso y la carta que lo impulsa. Cada regla cita su fuente.`,
    youAreHere: 'USTED ESTÁ AQUÍ',
    forkEyebrow: 'EL CAMINO DEL QUE POCAS FAMILIAS SE ENTERAN',
    laterTitle: 'Más adelante en el camino',
    laterBody: (name) =>
      `Cuando ${name} sea consumidor activo del Centro Regional, se abre un segundo camino: el Programa de Autodeterminación, donde los servicios se convierten en un presupuesto que su familia dirige. Se lo mostraremos aquí cuando aplique.`,
    trust:
      'Cada plazo de arriba cita el estatuto del que proviene. Cuando un paso no tiene plazo legal, se lo decimos — y le damos la herramienta que crea uno.',
    yourChild: 'su hijo/a',
  },
};

export default function ProcessMapScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = locale === 'es' ? 'es' : 'en';
  const S = STRINGS[funnelLocale];
  const rcStages = getRcStages(funnelLocale);
  const sdpFork = getSdpFork(funnelLocale);

  const stageIndex = deriveStageIndex(child?.rc_status);
  const showSdp = sdpAvailable(child?.rc_status);
  const childName = child?.first_name || S.yourChild;

  const openLetter = (template: string) => {
    (navigation as any).navigate('Letters', { template });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{S.title}</Text>
      <Text style={styles.subtitle}>{S.subtitle(childName)}</Text>

      {rcStages.map((stage, i) => {
        const state = i < stageIndex ? 'done' : i === stageIndex ? 'current' : 'upcoming';
        return (
          <View
            key={stage.key}
            style={[styles.card, state === 'current' && styles.cardCurrent]}
          >
            <View style={styles.cardHead}>
              <View
                style={[
                  styles.stepDot,
                  state === 'done' && styles.stepDotDone,
                  state === 'current' && styles.stepDotCurrent,
                ]}
              >
                <Text style={styles.stepDotText}>{state === 'done' ? '✓' : i + 1}</Text>
              </View>
              <View style={styles.cardHeadText}>
                <Text style={styles.cardTitle}>{stage.title}</Text>
                {state === 'current' && (
                  <Text style={styles.youAreHere}>{S.youAreHere}</Text>
                )}
              </View>
            </View>
            <Text style={styles.cardBody}>{stage.body}</Text>
            <View style={styles.chipRow}>
              <View style={styles.clockChip}>
                <Text style={styles.clockChipText}>⏱ {stage.clock}</Text>
              </View>
            </View>
            <Text style={styles.citation}>ⓘ {stage.citation}</Text>
            {stage.leverTemplate && state !== 'done' && (
              <Pressable
                style={[styles.lever, state === 'current' && styles.leverPrimary]}
                onPress={() => openLetter(stage.leverTemplate!)}
              >
                <Text
                  style={[
                    styles.leverText,
                    state === 'current' && styles.leverTextPrimary,
                  ]}
                >
                  ✉️ {stage.leverLabel}
                </Text>
              </Pressable>
            )}
          </View>
        );
      })}

      {showSdp ? (
        <View style={[styles.card, styles.forkCard]}>
          <Text style={styles.forkEyebrow}>{S.forkEyebrow}</Text>
          <Text style={styles.cardTitle}>{sdpFork.title}</Text>
          <Text style={styles.cardBody}>{sdpFork.body}</Text>
          <View style={styles.chipRow}>
            <View style={styles.clockChip}>
              <Text style={styles.clockChipText}>⏱ {sdpFork.clock}</Text>
            </View>
          </View>
          <Text style={styles.citation}>ⓘ {sdpFork.citation}</Text>
          <Pressable
            style={[styles.lever, styles.leverPrimary]}
            onPress={() => openLetter(sdpFork.leverTemplate!)}
          >
            <Text style={[styles.leverText, styles.leverTextPrimary]}>
              ✉️ {sdpFork.leverLabel}
            </Text>
          </Pressable>
          <PathDecider onLever={openLetter} locale={funnelLocale} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{S.laterTitle}</Text>
          <Text style={styles.cardBody}>{S.laterBody(childName)}</Text>
        </View>
      )}

      <View style={styles.trust}>
        <Text style={styles.trustText}>{S.trust}</Text>
      </View>
    </ScrollView>
  );
}

/**
 * "Which path fits us?" (PRD W-G: G2) — three honest questions, answered on
 * the screen, no data leaves the device. The recommendation states the
 * catches and hands the family the matching lever letter.
 */
function PathDecider({
  onLever,
  locale,
}: {
  onLever: (template: string) => void;
  locale: FunnelLocale;
}) {
  const [answers, setAnswers] = useState<PathAnswers>({
    hasAuthorizationHistory: null,
    unmetNeedsDocumented: null,
    wantsControl: null,
  });
  const es = locale === 'es';
  const result = decidePath(answers, locale);
  const questions = getPathQuestions(locale);

  return (
    <View style={styles.decider}>
      <Text style={styles.deciderTitle}>
        {es ? '\u00bfQu\u00e9 camino le conviene a su familia?' : 'Which path fits your family?'}
      </Text>
      {questions.map((q) => (
        <View key={q.key} style={styles.deciderRow}>
          <Text style={styles.deciderQuestion}>{q.label}</Text>
          <View style={styles.deciderPills}>
            {([true, false] as const).map((val) => {
              const active = answers[q.key] === val;
              return (
                <Pressable
                  key={String(val)}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setAnswers((a) => ({ ...a, [q.key]: val }))}
                >
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {val ? (es ? 'Sí' : 'Yes') : 'No'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}
      <View
        style={[
          styles.deciderResult,
          result.recommendation !== 'incomplete' && styles.deciderResultReady,
        ]}
      >
        <Text style={styles.deciderHeadline}>{result.headline}</Text>
        <Text style={styles.deciderBody}>{result.body}</Text>
        {result.leverTemplate && (
          <Pressable
            style={[styles.lever, styles.leverPrimary]}
            onPress={() => onLever(result.leverTemplate!)}
          >
            <Text style={[styles.leverText, styles.leverTextPrimary]}>
              ✉️ {result.leverLabel}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
  },
  subtitle: {
    marginTop: spacing.xs,
    marginBottom: spacing.base,
    fontSize: fonts.sizes.md,
    color: colors.mid,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardCurrent: { borderColor: colors.teal, borderWidth: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  cardHeadText: { flex: 1 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: semantic.success },
  stepDotCurrent: { backgroundColor: colors.teal },
  stepDotText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  cardTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  youAreHere: {
    marginTop: 2,
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.teal,
  },
  cardBody: {
    marginTop: spacing.sm,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    lineHeight: 20,
  },
  chipRow: { marginTop: spacing.sm },
  clockChip: {
    backgroundColor: semantic.warningBg,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignSelf: 'flex-start',
  },
  clockChipText: { color: semantic.warning, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  citation: { marginTop: spacing.sm, fontSize: fonts.sizes.xs, color: colors.mid },
  lever: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  leverPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  leverText: { fontWeight: fonts.weights.semibold, color: colors.dark, fontSize: fonts.sizes.md },
  leverTextPrimary: { color: colors.white },
  forkCard: { borderColor: colors.navy, borderWidth: 2 },
  forkEyebrow: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.coral,
    marginBottom: spacing.sm,
  },
  decider: {
    marginTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.base,
    gap: spacing.md,
  },
  deciderTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  deciderRow: { gap: spacing.sm },
  deciderQuestion: { fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 19 },
  deciderPills: { flexDirection: 'row', gap: spacing.sm },
  pill: {
    minHeight: 44,
    minWidth: 72,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  pillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { fontWeight: fonts.weights.semibold, color: colors.dark },
  pillTextActive: { color: colors.white },
  deciderResult: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  deciderResultReady: { backgroundColor: semantic.infoBg },
  deciderHeadline: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.base },
  deciderBody: { marginTop: spacing.xs, color: colors.dark, fontSize: fonts.sizes.sm, lineHeight: 19 },
  trust: {
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.xs,
  },
  trustText: { color: colors.dark, fontSize: fonts.sizes.sm, lineHeight: 19 },
});
