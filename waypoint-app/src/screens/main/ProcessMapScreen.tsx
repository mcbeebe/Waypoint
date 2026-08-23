/**
 * Process Map — "you are here" in the Regional Center system (PRD W-G: G1).
 *
 * Renders the RC pipeline with the family's current position derived from
 * the primary child's rc_status, the statutory clock on each step, and the
 * lever letter for the steps that have one. The SDP fork renders for
 * active consumers — the path most families are never told about.
 */
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { RC_STAGES, SDP_FORK, deriveStageIndex, sdpAvailable } from '@/lib/processMap';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

export default function ProcessMapScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const child = children[0];

  const stageIndex = deriveStageIndex(child?.rc_status);
  const showSdp = sdpAvailable(child?.rc_status);
  const childName = child?.first_name || 'your child';

  const openLetter = (template: string) => {
    (navigation as any).navigate('Letters', { template });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>How the system works</Text>
      <Text style={styles.subtitle}>
        The Regional Center process for {childName}, step by step — with the
        deadline the law puts on each step and the letter that moves it. Every
        rule cites its source.
      </Text>

      {RC_STAGES.map((stage, i) => {
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
                  <Text style={styles.youAreHere}>YOU ARE HERE</Text>
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
          <Text style={styles.forkEyebrow}>THE FORK MOST FAMILIES NEVER HEAR ABOUT</Text>
          <Text style={styles.cardTitle}>{SDP_FORK.title}</Text>
          <Text style={styles.cardBody}>{SDP_FORK.body}</Text>
          <View style={styles.chipRow}>
            <View style={styles.clockChip}>
              <Text style={styles.clockChipText}>⏱ {SDP_FORK.clock}</Text>
            </View>
          </View>
          <Text style={styles.citation}>ⓘ {SDP_FORK.citation}</Text>
          <Pressable
            style={[styles.lever, styles.leverPrimary]}
            onPress={() => openLetter(SDP_FORK.leverTemplate!)}
          >
            <Text style={[styles.leverText, styles.leverTextPrimary]}>
              ✉️ {SDP_FORK.leverLabel}
            </Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Further down the road</Text>
          <Text style={styles.cardBody}>
            Once {childName} is an active Regional Center consumer, a second
            path opens: the Self-Determination Program, where services become a
            budget your family directs. We&apos;ll show it here when it applies.
          </Text>
        </View>
      )}

      <View style={styles.trust}>
        <Text style={styles.trustText}>
          Every deadline above cites the statute it comes from. When a step has
          no legal deadline, we say so — and give you the lever that creates
          one.
        </Text>
      </View>
    </ScrollView>
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
  trust: {
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.base,
    marginTop: spacing.xs,
  },
  trustText: { color: colors.dark, fontSize: fonts.sizes.sm, lineHeight: 19 },
});
