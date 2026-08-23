/**
 * Time capture — log time in under 60 seconds (PRD W-C: C6).
 *
 * Activity pills + quick minutes + save. 099 entries run the hard-stop
 * check BEFORE writing (C4); failures are honest — an error message, never
 * a fake offline success.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSdpCase } from '@/hooks/useFacilitation';
import { transitionHoursStatus } from '@/lib/transitionHours';
import { useToast } from '@/components/Toast';
import type { ServiceActivityType } from '@/types/database';
import type { StaffStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'TimeCapture'>;
type Route = RouteProp<StaffStackParamList, 'TimeCapture'>;

const ACTIVITIES: Array<{ key: ServiceActivityType; label: string }> = [
  { key: 'facilitation', label: 'Facilitation' },
  { key: 'transition_099', label: 'Transition (099)' },
  { key: 'pcp', label: 'PCP work' },
  { key: 'orientation', label: 'Orientation' },
  { key: 'intake_call', label: 'Intake call' },
  { key: 'admin', label: 'Admin' },
];

const QUICK_MINUTES = [15, 30, 45, 60, 90, 120];

export default function TimeCaptureScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { events, extensions, logTime } = useSdpCase({
    caseId: params.caseId,
    familyId: params.familyId,
  });
  const { showToast } = useToast();

  const [activity, setActivity] = useState<ServiceActivityType>('facilitation');
  const [minutes, setMinutes] = useState(30);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [blocked, setBlocked] = useState<string | null>(null);

  const hours = transitionHoursStatus(events, extensions);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    setBlocked(null);
    try {
      const result = await logTime({
        activityType: activity,
        minutes,
        occurredOn: new Date().toISOString().slice(0, 10),
        notes: notes.trim() || undefined,
      });
      if (result.ok) {
        showToast('Time logged', 'success');
        navigation.goBack();
      } else {
        setBlocked(result.blockedReason ?? 'Could not log time');
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
        <Text style={styles.title}>Log time</Text>

        <Text style={styles.section}>Activity</Text>
        <View style={styles.pillWrap}>
          {ACTIVITIES.map((a) => (
            <Pressable
              key={a.key}
              style={[styles.pill, activity === a.key && styles.pillActive]}
              onPress={() => setActivity(a.key)}
            >
              <Text style={[styles.pillText, activity === a.key && styles.pillTextActive]}>
                {a.label}
              </Text>
            </Pressable>
          ))}
        </View>
        {activity === 'transition_099' && (
          <Text style={styles.capNote}>
            099 at {hours.usedHours}h / {hours.capHours}h
            {hours.forecastCapDate ? ` — cap ~${hours.forecastCapDate} at this pace` : ''}
          </Text>
        )}

        <Text style={styles.section}>Minutes</Text>
        <View style={styles.pillWrap}>
          {QUICK_MINUTES.map((m) => (
            <Pressable
              key={m}
              style={[styles.pill, minutes === m && styles.pillActive]}
              onPress={() => setMinutes(m)}
            >
              <Text style={[styles.pillText, minutes === m && styles.pillTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.section}>Notes (optional)</Text>
        <TextInput
          style={styles.notes}
          placeholder="What happened?"
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        {blocked && (
          <View style={styles.blockedBox}>
            <Text style={styles.blockedText}>{blocked}</Text>
          </View>
        )}

        <Pressable style={[styles.cta, saving && styles.ctaDisabled]} onPress={save}>
          <Text style={styles.ctaText}>{saving ? 'Saving…' : `Log ${minutes} min`}</Text>
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
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  pillWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  pill: {
    minHeight: 44,
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
  capNote: { marginTop: spacing.sm, fontSize: fonts.sizes.sm, color: semantic.warning },
  notes: {
    minHeight: 88,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    padding: spacing.md,
    color: colors.dark,
    textAlignVertical: 'top',
  },
  blockedBox: {
    marginTop: spacing.base,
    backgroundColor: semantic.dangerBg,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  blockedText: { color: semantic.danger, fontSize: fonts.sizes.md, lineHeight: 20 },
  cta: {
    marginTop: spacing.lg,
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.6 },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
});
