/**
 * Outcomes baseline (PRD W-C: C7) — captured at the START of service, not
 * during onboarding: services in place, unmet needs, coordination hours,
 * caregiver strain. Re-measure is scheduled automatically at 6 and 12
 * months; the W3 evidence readout compares against these rows.
 */
import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSdpCase } from '@/hooks/useFacilitation';
import { useToast } from '@/components/Toast';
import type { BaselineKind } from '@/types/database';
import type { StaffStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'Baseline'>;
type Route = RouteProp<StaffStackParamList, 'Baseline'>;

const KINDS: Array<{ key: BaselineKind; label: string }> = [
  { key: 'baseline', label: 'Baseline' },
  { key: '6mo', label: '6-month' },
  { key: '12mo', label: '12-month' },
];

export default function BaselineScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { baselines, saveBaseline } = useSdpCase({
    caseId: params.caseId,
    familyId: params.familyId,
  });
  const { showToast } = useToast();

  const [kind, setKind] = useState<BaselineKind>('baseline');
  const [services, setServices] = useState('');
  const [needs, setNeeds] = useState('');
  const [coordHours, setCoordHours] = useState('');
  const [strain, setStrain] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Prefill when a measure of this kind already exists.
  useEffect(() => {
    const existing = baselines.find((b) => b.kind === kind);
    setServices(existing?.services_in_place ?? '');
    setNeeds(existing?.unmet_needs ?? '');
    setCoordHours(
      existing?.coordination_hours_per_week != null
        ? String(existing.coordination_hours_per_week)
        : ''
    );
    setStrain(existing?.caregiver_strain ?? null);
  }, [kind, baselines]);

  const save = async () => {
    const hours = coordHours.trim() === '' ? null : Number(coordHours);
    if (hours !== null && (!Number.isFinite(hours) || hours < 0)) {
      showToast('Coordination hours must be a number', 'error');
      return;
    }
    setSaving(true);
    try {
      const ok = await saveBaseline({
        kind,
        servicesInPlace: services.trim(),
        unmetNeeds: needs.trim(),
        coordinationHoursPerWeek: hours,
        caregiverStrain: strain,
      });
      if (ok) {
        showToast(
          kind === '12mo' ? 'Measure saved' : 'Measure saved — re-measure scheduled',
          'success'
        );
        navigation.goBack();
      } else {
        showToast('Could not save the measure', 'error');
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
        <Text style={styles.title}>Outcomes measure</Text>
        <Text style={styles.subtitle}>
          Captured at the start of service — this is what the 6/12-month
          evidence readout compares against.
        </Text>

        <View style={styles.pillWrap}>
          {KINDS.map((k) => (
            <Pressable
              key={k.key}
              style={[styles.pill, kind === k.key && styles.pillActive]}
              onPress={() => setKind(k.key)}
            >
              <Text style={[styles.pillText, kind === k.key && styles.pillTextActive]}>
                {k.label}
                {baselines.some((b) => b.kind === k.key) ? ' ✓' : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Services in place today</Text>
        <TextInput
          style={styles.input}
          multiline
          value={services}
          onChangeText={setServices}
          placeholder="What the family already receives — provider, hours, funding source"
        />

        <Text style={styles.section}>Unmet needs</Text>
        <TextInput
          style={styles.input}
          multiline
          value={needs}
          onChangeText={setNeeds}
          placeholder="What they need but don't have — this doubles as SDP budget evidence"
        />

        <Text style={styles.section}>Care-coordination hours per week</Text>
        <TextInput
          style={[styles.input, styles.inputShort]}
          keyboardType="numeric"
          value={coordHours}
          onChangeText={setCoordHours}
          placeholder="e.g. 6"
        />

        <Text style={styles.section}>Caregiver strain (1 = fine, 5 = at the limit)</Text>
        <View style={styles.pillWrap}>
          {[1, 2, 3, 4, 5].map((n) => (
            <Pressable
              key={n}
              style={[styles.pill, strain === n && styles.pillActive]}
              onPress={() => setStrain(n)}
            >
              <Text style={[styles.pillText, strain === n && styles.pillTextActive]}>{n}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={[styles.cta, saving && styles.disabled]} onPress={save}>
          <Text style={styles.ctaText}>{saving ? 'Saving…' : 'Save measure'}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  pill: {
    minHeight: 44,
    minWidth: 44,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  pillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  pillText: { color: colors.dark, fontWeight: fonts.weights.semibold },
  pillTextActive: { color: colors.white },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  input: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    color: colors.dark,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  inputShort: { minHeight: 44, textAlignVertical: 'center' },
  cta: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  disabled: { opacity: 0.5 },
});
