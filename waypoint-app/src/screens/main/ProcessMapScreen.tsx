/**
 * Process Map — "you are here" in the Regional Center system (PRD W-G: G1).
 *
 * Renders the RC pipeline with the family's current position derived from
 * the primary child's rc_status, the statutory clock on each step, and the
 * lever letter for the steps that have one. The SDP fork renders for
 * active consumers — the path most families are never told about.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { getRcStages, getSdpFork, deriveStageIndex, sdpAvailable } from '@/lib/processMap';
import type { ProcessStage } from '@/lib/processMap';
import { stableKeyFor } from '@/lib/actionKeys';
import { decidePath, getPathQuestions } from '@/lib/pathDecision';
import type { PathAnswers } from '@/lib/pathDecision';
import type { FunnelLocale } from '@/lib/eligibility';
import type { Action } from '@/types/database';
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
  inPlan: string;
  statusLabel: Record<Action['status'], string>;
  ippHaveTitle: string;
  ippHaveBody: string;
  ippUpload: string;
  ippRecords: string;
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
    inPlan: 'IN YOUR PLAN',
    statusLabel: {
      not_started: 'To do',
      in_progress: 'In progress',
      completed: 'Done ✓',
      dismissed: 'Dismissed',
    },
    ippHaveTitle: 'Do you already have an IPP?',
    ippHaveBody:
      "It's a document titled \"Individual Program Plan,\" written at a meeting with your Service Coordinator (at least yearly). If you've never seen one, your coordinator has it — and you're entitled to a copy.",
    ippUpload: 'I have it — add it to Waypoint',
    ippRecords: "Not sure? Request your records",
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
    inPlan: 'EN SU PLAN',
    statusLabel: {
      not_started: 'Pendiente',
      in_progress: 'En curso',
      completed: 'Hecho ✓',
      dismissed: 'Descartado',
    },
    ippHaveTitle: '¿Ya tiene un IPP?',
    ippHaveBody:
      'Es un documento titulado "Plan de Programa Individual", escrito en una reunión con su coordinador/a de servicios (al menos una vez al año). Si nunca lo ha visto, su coordinador/a lo tiene — y usted tiene derecho a una copia.',
    ippUpload: 'Lo tengo — agregarlo a Waypoint',
    ippRecords: '¿No está seguro/a? Solicite sus registros',
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

  // The map and the plan are one surface: each stage lists its live plan
  // items (matched on stable action keys), tappable through to the action.
  const { actions } = useActions({ familyId: family?.id ?? '' });
  const actionsByKey = useMemo(() => {
    const m = new Map<string, Action>();
    for (const a of actions) {
      const k = stableKeyFor(a.title);
      if (k && !m.has(k)) m.set(k, a);
    }
    return m;
  }, [actions]);

  const openLetter = (template: string) => {
    (navigation as any).navigate('Letters', { template });
  };

  const openAction = (actionId: string) => {
    (navigation as any).navigate('Tracker', {
      screen: 'ActionDetail',
      params: { actionId },
      initial: false,
    });
  };

  const stageActions = (stage: ProcessStage): Action[] =>
    stage.actionKeys
      .map((k) => actionsByKey.get(k))
      .filter((a): a is Action => !!a && a.status !== 'dismissed');

  const renderStageActions = (stage: ProcessStage) => {
    const linked = stageActions(stage);
    if (linked.length === 0) return null;
    return (
      <View style={styles.planLinks}>
        <Text style={styles.planLinksLabel}>{S.inPlan}</Text>
        {linked.map((a) => (
          <Pressable
            key={a.id}
            style={styles.planLink}
            onPress={() => openAction(a.id)}
            accessibilityRole="button"
            accessibilityLabel={a.title}
          >
            <View
              style={[
                styles.planLinkDot,
                a.status === 'completed' && styles.planLinkDotDone,
                a.status === 'in_progress' && styles.planLinkDotActive,
              ]}
            />
            <Text style={styles.planLinkTitle} numberOfLines={1}>{a.title}</Text>
            <Text style={styles.planLinkStatus}>{S.statusLabel[a.status]} ›</Text>
          </Pressable>
        ))}
      </View>
    );
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
            {renderStageActions(stage)}
            {stage.key === 'ipp' && (
              <View style={styles.ippBox}>
                <Text style={styles.ippTitle}>{S.ippHaveTitle}</Text>
                <Text style={styles.ippBody}>{S.ippHaveBody}</Text>
                <View style={styles.ippButtons}>
                  <Pressable
                    style={styles.ippButton}
                    onPress={() => (navigation as any).navigate('Documents')}
                  >
                    <Text style={styles.ippButtonText}>📄 {S.ippUpload}</Text>
                  </Pressable>
                  <Pressable
                    style={styles.ippButton}
                    onPress={() => openLetter('records_request')}
                  >
                    <Text style={styles.ippButtonText}>✉️ {S.ippRecords}</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
          {renderStageActions(sdpFork)}
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
  planLinks: { marginTop: spacing.md, gap: spacing.xs },
  planLinksLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.mid,
  },
  planLink: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
  },
  planLinkDot: {
    width: 10,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  planLinkDotActive: { backgroundColor: semantic.warning },
  planLinkDotDone: { backgroundColor: semantic.success },
  planLinkTitle: { flex: 1, fontSize: fonts.sizes.sm, color: colors.dark, fontWeight: fonts.weights.semibold },
  planLinkStatus: { fontSize: fonts.sizes.sm, color: colors.teal, fontWeight: fonts.weights.semibold },
  ippBox: {
    marginTop: spacing.md,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  ippTitle: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.md },
  ippBody: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 19 },
  ippButtons: { marginTop: spacing.md, gap: spacing.sm },
  ippButton: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  ippButtonText: { fontWeight: fonts.weights.semibold, color: colors.dark, fontSize: fonts.sizes.sm },
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
