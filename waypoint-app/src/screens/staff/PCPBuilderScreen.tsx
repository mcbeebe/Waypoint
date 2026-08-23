/**
 * Person-centered plan builder (PRD W-C: C3) — guided capture of
 * strengths, preferences, goals, and supports; drafts are resumable (the
 * draft lives on the case row); completing stamps pcp_completed_at, which
 * unlocks the code-024 invoice line. Export format lands with the RCEB
 * pilot feedback.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSdpCase } from '@/hooks/useFacilitation';
import { useToast } from '@/components/Toast';
import type { StaffStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'PCPBuilder'>;
type Route = RouteProp<StaffStackParamList, 'PCPBuilder'>;

const SECTIONS = [
  {
    key: 'strengths',
    label: 'Strengths',
    prompt: 'What is this person great at? What do people who love them say about them?',
  },
  {
    key: 'preferences',
    label: 'Preferences',
    prompt: 'What do they love — and what do they want to avoid? Routines, places, people, sensory needs.',
  },
  {
    key: 'goals',
    label: 'Goals',
    prompt: 'What does a good year look like? Concrete outcomes the budget should buy.',
  },
  {
    key: 'supports',
    label: 'Supports',
    prompt: 'What help makes the goals possible? People, services, equipment, schedules.',
  },
] as const;

type SectionKey = (typeof SECTIONS)[number]['key'];

export default function PCPBuilderScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sdpCase, updateCase, loading } = useSdpCase({
    caseId: params.caseId,
    familyId: params.familyId,
  });
  const { showToast } = useToast();

  const [draft, setDraft] = useState<Record<SectionKey, string>>({
    strengths: '', preferences: '', goals: '', supports: '',
  });
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);

  // Resume the draft once the case loads.
  useEffect(() => {
    if (!hydrated && sdpCase) {
      const d = (sdpCase.pcp_draft ?? {}) as Partial<Record<SectionKey, string>>;
      setDraft({
        strengths: d.strengths ?? '',
        preferences: d.preferences ?? '',
        goals: d.goals ?? '',
        supports: d.supports ?? '',
      });
      setHydrated(true);
    }
  }, [sdpCase, hydrated]);

  const filled = SECTIONS.filter((s) => draft[s.key].trim().length > 0).length;
  const complete = filled === SECTIONS.length;

  const saveDraft = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const ok = await updateCase({ pcp_draft: draft });
      showToast(ok ? 'Draft saved' : 'Could not save the draft', ok ? 'success' : 'error');
      return ok;
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async () => {
    setSaving(true);
    try {
      const ok = await updateCase({
        pcp_draft: draft,
        pcp_completed_at: new Date().toISOString(),
      });
      if (ok) {
        showToast('PCP complete — the 024 invoice line is unlocked', 'success');
        navigation.goBack();
      } else {
        showToast('Could not mark complete', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>← Case</Text>
        </Pressable>
        <Text style={styles.title}>Person-centered plan</Text>
        <Text style={styles.subtitle}>
          {sdpCase?.pcp_completed_at
            ? 'Completed — edits still save.'
            : `${filled} of ${SECTIONS.length} sections drafted · resumable any time`}
        </Text>

        {SECTIONS.map((s) => (
          <View key={s.key} style={styles.card}>
            <Text style={styles.sectionLabel}>{s.label}</Text>
            <Text style={styles.prompt}>{s.prompt}</Text>
            <TextInput
              style={styles.input}
              multiline
              value={draft[s.key]}
              onChangeText={(t) => setDraft((d) => ({ ...d, [s.key]: t }))}
              placeholder="Write here…"
              editable={!loading}
            />
          </View>
        ))}

        <Pressable style={[styles.secondary, saving && styles.disabled]} onPress={saveDraft}>
          <Text style={styles.secondaryText}>{saving ? 'Saving…' : 'Save draft'}</Text>
        </Pressable>
        <Pressable
          style={[styles.cta, (!complete || saving) && styles.disabled]}
          onPress={complete ? markComplete : undefined}
        >
          <Text style={styles.ctaText}>
            {complete ? 'Mark PCP complete' : 'Fill all four sections to complete'}
          </Text>
        </Pressable>
        {!sdpCase?.pcp_completed_at && (
          <Text style={styles.meta}>
            Completing unlocks the code-024 person-centered-plan invoice (up to $1,000,
            billed to the Regional Center). Remember to log your PCP time.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.base, fontSize: fonts.sizes.sm, color: colors.mid },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  sectionLabel: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  prompt: { marginTop: spacing.xs, marginBottom: spacing.sm, fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  input: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.light,
    padding: spacing.md,
    color: colors.dark,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  secondary: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: { color: colors.dark, fontWeight: fonts.weights.semibold },
  cta: {
    marginTop: spacing.sm,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  disabled: { opacity: 0.5 },
  meta: {
    marginTop: spacing.md,
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    lineHeight: 18,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
});
