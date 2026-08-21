/**
 * One stage of the journey, in full — what's happening, who to work with,
 * and the next steps a parent can put straight into their plan.
 *
 * The journey map answers "where are we"; this answers "so what do I do".
 */

import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useToast } from '@/components/Toast';
import { getJourneyByKey } from '@/data/journeyMaps';
import { phaseToActions, phaseQuestion } from '@/lib/journeyActions';
import { useTextScale } from '@/lib/textSize';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function JourneyPhaseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HomeStackParamList, 'JourneyPhase'>>();
  const { journeyKey, phaseIndex } = route.params;

  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) || children[0];
  const childName = primaryChild?.first_name ?? null;

  const { createAction } = useActions({ familyId: family?.id ?? '' });
  const { showToast } = useToast();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  const journey = useMemo(() => getJourneyByKey(journeyKey), [journeyKey]);
  const phase = journey.phases[phaseIndex] ?? journey.phases[0];
  const drafts = useMemo(() => phaseToActions(phase, childName), [phase, childName]);

  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const addOne = useCallback(
    async (index: number) => {
      if (busy || addedIndexes.has(index)) return;
      setBusy(true);
      const draft = drafts[index];
      const created = await createAction({
        title: draft.title,
        description: draft.description,
        category: draft.category,
        priority: draft.priority,
        child_id: primaryChild?.id,
        source: 'system',
      });
      setBusy(false);
      if (created) {
        setAddedIndexes((prev) => new Set(prev).add(index));
        showToast('Added to your Action Plan', 'success');
      } else {
        showToast("Couldn't add that — please try again.", 'error');
      }
    },
    [busy, addedIndexes, drafts, createAction, primaryChild?.id, showToast]
  );

  const addAll = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    let added = 0;
    for (let i = 0; i < drafts.length; i++) {
      if (addedIndexes.has(i)) continue;
      const d = drafts[i];
      const created = await createAction({
        title: d.title,
        description: d.description,
        category: d.category,
        priority: d.priority,
        child_id: primaryChild?.id,
        source: 'system',
      });
      if (created) added++;
    }
    setBusy(false);
    setAddedIndexes(new Set(drafts.map((_, i) => i)));
    showToast(
      added > 0 ? `${added} step${added === 1 ? '' : 's'} added to your plan` : "Couldn't add these — please try again.",
      added > 0 ? 'success' : 'error'
    );
  }, [busy, drafts, addedIndexes, createAction, primaryChild?.id, showToast]);

  const askAI = useCallback(() => {
    navigation.navigate('Navigator', {
      screen: 'NavigatorMain',
      params: { ask: phaseQuestion(phase, journey.title, childName) },
    });
  }, [navigation, phase, journey.title, childName]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stage header */}
        <View style={[styles.hero, { backgroundColor: phase.bg, borderColor: phase.color }]}>
          <Text style={styles.heroIcon}>{phase.icon}</Text>
          <Text style={[styles.heroAge, { color: phase.color, fontSize: sz(11) }]}>
            AGES {phase.age}
          </Text>
          <Text style={[styles.heroTitle, { fontSize: sz(20) }]}>{phase.label}</Text>
          <Text style={[styles.heroJourney, { fontSize: sz(12) }]}>
            {journey.icon} {journey.title}
          </Text>
        </View>

        {/* What's happening now */}
        <Text style={styles.sectionTitle}>What this stage is about</Text>
        <View style={styles.card}>
          <Text style={[styles.body, { fontSize: sz(14.5), lineHeight: sz(22) }]}>
            {phase.description}
          </Text>
        </View>

        {phase.alert ? (
          <View style={styles.alertCard}>
            <Text style={[styles.alertText, { fontSize: sz(13) }]}>⚠️ {phase.alert}</Text>
          </View>
        ) : null}

        {/* Recommended next steps */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Recommended next steps</Text>
          {drafts.length > 0 && (
            <TouchableOpacity
              onPress={addAll}
              disabled={busy}
              accessibilityRole="button"
              accessibilityLabel="Add every step from this stage to my plan"
            >
              <Text style={styles.addAllText}>Add all</Text>
            </TouchableOpacity>
          )}
        </View>

        {drafts.map((draft, i) => {
          const entity = phase.entities[i];
          const added = addedIndexes.has(i);
          return (
            <View key={`${entity.name}-${i}`} style={styles.stepCard}>
              <View style={styles.stepBody}>
                <Text style={[styles.stepWho, { color: phase.color, fontSize: sz(11) }]}>
                  {entity.name.toUpperCase()}
                  {entity.time ? ` · ${entity.time}` : ''}
                </Text>
                <Text style={[styles.stepAction, { fontSize: sz(14.5), lineHeight: sz(20) }]}>
                  {entity.action}
                </Text>
              </View>
              <TouchableOpacity
                style={[styles.addButton, added && styles.addButtonDone]}
                onPress={() => addOne(i)}
                disabled={busy || added}
                accessibilityRole="button"
                accessibilityLabel={
                  added ? `${entity.action} already added` : `Add "${entity.action}" to my plan`
                }
              >
                <Text style={[styles.addButtonText, added && styles.addButtonTextDone]}>
                  {added ? '✓' : '＋'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}

        {/* Milestone */}
        {phase.milestone ? (
          <View style={styles.milestoneCard}>
            <Text style={styles.milestoneLabel}>🏁 WHAT "DONE" LOOKS LIKE HERE</Text>
            <Text style={[styles.milestoneText, { fontSize: sz(14), lineHeight: sz(20) }]}>
              {phase.milestone}
            </Text>
          </View>
        ) : null}

        {/* Ask the Navigator, in context */}
        <TouchableOpacity
          style={styles.askButton}
          onPress={askAI}
          accessibilityRole="button"
          accessibilityLabel="Ask Waypoint about this stage"
        >
          <Text style={styles.askButtonText}>🧭 Ask Waypoint about this stage</Text>
        </TouchableOpacity>

        <Text style={styles.footnote}>
          Timelines are typical for California; your Regional Center or district may differ.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  hero: {
    borderRadius: radii.lg,
    borderWidth: 1.5,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  heroIcon: { fontSize: 34 },
  heroAge: {
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.7,
    marginTop: 6,
  },
  heroTitle: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginTop: 2,
    textAlign: 'center',
  },
  heroJourney: { color: colors.mid, marginTop: 4 },
  sectionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  body: { color: colors.dark },
  alertCard: {
    backgroundColor: '#FEF3C7',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  alertText: { color: '#92400E', lineHeight: 19 },
  addAllText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  stepCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: 6,
  },
  stepBody: { flex: 1 },
  stepWho: { fontWeight: fonts.weights.bold as '700', letterSpacing: 0.4 },
  stepAction: { color: colors.dark, marginTop: 3 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonDone: { backgroundColor: '#D1FAE5' },
  addButtonText: { fontSize: 17, color: colors.white, fontWeight: '700' },
  addButtonTextDone: { color: '#047857' },
  milestoneCard: {
    backgroundColor: '#ECFDF5',
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  milestoneLabel: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: '#047857',
    letterSpacing: 0.6,
  },
  milestoneText: { color: colors.dark, marginTop: 4 },
  askButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    marginTop: spacing.lg,
  },
  askButtonText: {
    fontSize: fonts.sizes.base,
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  footnote: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    textAlign: 'center',
    marginTop: spacing.md,
    lineHeight: 16,
  },
});
