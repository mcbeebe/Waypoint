/**
 * Case detail — one screen per family: stage, clocks, money, next action
 * (PRD W-C: C2). The 099 tracker shows a burn-rate forecast ("hits the cap
 * ~Oct 3"), not just a percentage; blocked actions are visible and greyed
 * with the reason, never hidden.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSdpCase } from '@/hooks/useFacilitation';
import { SDP_PIPELINE, pipelineIndex, nextActionFor } from '@/lib/sdpStages';
import { transitionHoursStatus } from '@/lib/transitionHours';
import { formatCents } from '@/lib/spendingPlan';
import { useToast } from '@/components/Toast';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';
import type { StaffStackParamList } from '@/types/navigation';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'CaseDetail'>;
type Route = RouteProp<StaffStackParamList, 'CaseDetail'>;

export default function CaseDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const {
    sdpCase, family, events, extensions, planLines, baselines,
    loading, error, createCase, updateCase, requestExtension, refetch,
  } = useSdpCase({ caseId: params.caseId, familyId: params.familyId });
  const { showToast } = useToast();
  const [budgetInput, setBudgetInput] = useState('');
  const [priceInput, setPriceInput] = useState('');

  const familyName =
    [family?.parent_first_name, family?.parent_last_name].filter(Boolean).join(' ') || 'Family';

  if (!loading && !sdpCase) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{familyName}</Text>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>No facilitation case yet</Text>
            <Text style={styles.body}>
              Starting a case opens the SDP pipeline for this family: orientation,
              person-centered plan, budget, spending plan, active service.
            </Text>
            <Pressable
              style={styles.cta}
              onPress={async () => {
                const c = await createCase(params.familyId);
                if (c) {
                  showToast('Case started', 'success');
                  await refetch();
                } else {
                  showToast(error || 'Could not start the case', 'error');
                }
              }}
            >
              <Text style={styles.ctaText}>Start case</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  const stageIdx = sdpCase ? pipelineIndex(sdpCase.stage) : -1;
  const hours = transitionHoursStatus(events, extensions);
  const planTotal = planLines.reduce((s, l) => s + l.annual_amount_cents, 0);
  const hasBaseline = baselines.some((b) => b.kind === 'baseline');

  const parseDollars = (s: string): number | null => {
    const n = Number(s.replace(/[$,\s]/g, ''));
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
  };

  const advanceStage = async () => {
    if (!sdpCase || stageIdx < 0 || stageIdx >= SDP_PIPELINE.length - 1) return;
    const next = SDP_PIPELINE[stageIdx + 1].stage;
    const ok = await updateCase({ stage: next });
    showToast(ok ? `Moved to ${SDP_PIPELINE[stageIdx + 1].label}` : 'Could not update stage', ok ? 'success' : 'error');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>← Caseload</Text>
        </Pressable>
        <Text style={styles.title}>{familyName}</Text>
        {family?.regional_center ? (
          <Text style={styles.subtitle}>{family.regional_center}</Text>
        ) : null}

        {/* Pipeline header (C2) */}
        <View style={styles.pipeline}>
          {SDP_PIPELINE.map((s, i) => (
            <View key={s.stage} style={styles.pipeStep}>
              <View
                style={[
                  styles.pipeDot,
                  i < stageIdx && styles.pipeDotDone,
                  i === stageIdx && styles.pipeDotCurrent,
                ]}
              />
              <Text
                style={[styles.pipeLabel, i === stageIdx && styles.pipeLabelCurrent]}
                numberOfLines={2}
              >
                {s.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Next action */}
        {sdpCase && (
          <View style={[styles.card, styles.nextCard]}>
            <Text style={styles.nextEyebrow}>NEXT ACTION</Text>
            <Text style={styles.nextText}>{nextActionFor(sdpCase)}</Text>
            {stageIdx >= 0 && stageIdx < SDP_PIPELINE.length - 1 && (
              <Pressable style={styles.stageButton} onPress={advanceStage}>
                <Text style={styles.stageButtonText}>
                  Mark done → {SDP_PIPELINE[stageIdx + 1].label}
                </Text>
              </Pressable>
            )}
          </View>
        )}

        {/* 099 tracker (C4) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>099 transition hours</Text>
          <View style={styles.hoursRow}>
            <Text style={styles.hoursBig}>
              {hours.usedHours}h <Text style={styles.hoursCap}>/ {hours.capHours}h</Text>
            </Text>
            {hours.atCap ? (
              <View style={[styles.chip, styles.chipDanger]}>
                <Text style={styles.chipDangerText}>At cap</Text>
              </View>
            ) : hours.atWarning ? (
              <View style={[styles.chip, styles.chipWarn]}>
                <Text style={styles.chipWarnText}>{hours.pctUsed}% used</Text>
              </View>
            ) : null}
          </View>
          <View style={styles.barTrack}>
            <View
              style={[
                styles.barFill,
                { width: `${Math.min(100, hours.pctUsed)}%` },
                hours.atWarning && styles.barWarn,
              ]}
            />
          </View>
          <Text style={styles.meta}>
            {hours.atCap
              ? 'Cap reached — hour 41 needs an approved Regional Center extension.'
              : hours.forecastCapDate
                ? `At the recent pace, hits the cap ~${hours.forecastCapDate}`
                : 'No recent 099 activity — no forecast.'}
          </Text>
          {(hours.atWarning || hours.atCap) && !hours.hasPendingExtension && (
            <Pressable
              style={styles.secondary}
              onPress={async () => {
                const ok = await requestExtension(10);
                showToast(
                  ok ? 'Extension request recorded — send it to the RC' : 'Could not record the request',
                  ok ? 'success' : 'error'
                );
              }}
            >
              <Text style={styles.secondaryText}>Record an extension request (+10h)</Text>
            </Pressable>
          )}
          {hours.hasPendingExtension && (
            <Text style={styles.pendingNote}>Extension request pending RC approval.</Text>
          )}
        </View>

        {/* Money (C2/C5/C6) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Money</Text>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Certified budget</Text>
            {sdpCase?.certified_budget_cents ? (
              <Text style={styles.moneyValue}>{formatCents(sdpCase.certified_budget_cents)}</Text>
            ) : (
              <View style={styles.inlineEdit}>
                <TextInput
                  style={styles.input}
                  placeholder="$ annual"
                  keyboardType="numeric"
                  value={budgetInput}
                  onChangeText={setBudgetInput}
                />
                <Pressable
                  style={styles.miniButton}
                  onPress={async () => {
                    const cents = parseDollars(budgetInput);
                    if (!cents) return showToast('Enter a dollar amount', 'error');
                    const ok = await updateCase({
                      certified_budget_cents: cents,
                      budget_certified_on: new Date().toISOString().slice(0, 10),
                    });
                    showToast(ok ? 'Budget recorded' : 'Could not save', ok ? 'success' : 'error');
                  }}
                >
                  <Text style={styles.miniButtonText}>Set</Text>
                </Pressable>
              </View>
            )}
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Agreed facilitation price</Text>
            {sdpCase?.agreed_annual_price_cents ? (
              <Text style={styles.moneyValue}>
                {formatCents(sdpCase.agreed_annual_price_cents)}/yr
              </Text>
            ) : (
              <View style={styles.inlineEdit}>
                <TextInput
                  style={styles.input}
                  placeholder="$ / year"
                  keyboardType="numeric"
                  value={priceInput}
                  onChangeText={setPriceInput}
                />
                <Pressable
                  style={styles.miniButton}
                  onPress={async () => {
                    const cents = parseDollars(priceInput);
                    if (!cents) return showToast('Enter a dollar amount', 'error');
                    const ok = await updateCase({ agreed_annual_price_cents: cents });
                    showToast(ok ? 'Price recorded' : 'Could not save', ok ? 'success' : 'error');
                  }}
                >
                  <Text style={styles.miniButtonText}>Set</Text>
                </Pressable>
              </View>
            )}
          </View>
          <View style={styles.moneyRow}>
            <Text style={styles.moneyLabel}>Spending plan total</Text>
            <Text style={styles.moneyValue}>
              {formatCents(planTotal)}
              {sdpCase?.certified_budget_cents
                ? ` of ${formatCents(sdpCase.certified_budget_cents)}`
                : ''}
            </Text>
          </View>
        </View>

        {/* Work surfaces */}
        {sdpCase && (
          <View style={styles.actions}>
            <Pressable
              style={styles.cta}
              onPress={() =>
                navigation.navigate('TimeCapture', { caseId: sdpCase.id, familyId: params.familyId })
              }
            >
              <Text style={styles.ctaText}>Log time</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() =>
                navigation.navigate('PCPBuilder', { caseId: sdpCase.id, familyId: params.familyId })
              }
            >
              <Text style={styles.secondaryText}>
                Person-centered plan{sdpCase.pcp_completed_at ? ' ✓' : ''}
              </Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() =>
                navigation.navigate('SpendingPlan', { caseId: sdpCase.id, familyId: params.familyId })
              }
            >
              <Text style={styles.secondaryText}>Spending plan ({planLines.length} lines)</Text>
            </Pressable>
            <Pressable
              style={styles.secondary}
              onPress={() =>
                navigation.navigate('Baseline', { caseId: sdpCase.id, familyId: params.familyId })
              }
            >
              <Text style={styles.secondaryText}>
                {hasBaseline ? 'Baseline captured ✓' : 'Capture baseline'}
              </Text>
            </Pressable>
          </View>
        )}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: 2, fontSize: fonts.sizes.sm, color: colors.mid },
  pipeline: {
    flexDirection: 'row',
    marginTop: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  pipeStep: { flex: 1, alignItems: 'center', gap: 4 },
  pipeDot: {
    width: 14,
    height: 14,
    borderRadius: radii.full,
    backgroundColor: colors.border,
  },
  pipeDotDone: { backgroundColor: semantic.success },
  pipeDotCurrent: { backgroundColor: colors.teal },
  pipeLabel: { fontSize: 10, color: colors.mid, textAlign: 'center' },
  pipeLabelCurrent: { color: colors.navy, fontWeight: fonts.weights.bold },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  nextCard: { borderColor: colors.teal, borderWidth: 2 },
  nextEyebrow: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: colors.teal,
  },
  nextText: {
    marginTop: spacing.xs,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  stageButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageButtonText: { color: colors.teal, fontWeight: fonts.weights.bold },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  body: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.dark, lineHeight: 20 },
  hoursRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hoursBig: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  hoursCap: { fontSize: fonts.sizes.md, color: colors.mid, fontWeight: fonts.weights.medium },
  chip: { borderRadius: radii.full, paddingHorizontal: spacing.md, paddingVertical: 4 },
  chipWarn: { backgroundColor: semantic.warningBg },
  chipWarnText: { color: semantic.warning, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  chipDanger: { backgroundColor: semantic.dangerBg },
  chipDangerText: { color: semantic.danger, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.sm },
  barTrack: {
    marginTop: spacing.sm,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    overflow: 'hidden',
  },
  barFill: { height: 8, backgroundColor: colors.teal },
  barWarn: { backgroundColor: semantic.warning },
  meta: { marginTop: spacing.sm, fontSize: fonts.sizes.sm, color: colors.mid },
  pendingNote: { marginTop: spacing.sm, fontSize: fonts.sizes.sm, color: semantic.warning },
  moneyRow: {
    marginTop: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  moneyLabel: { fontSize: fonts.sizes.md, color: colors.dark },
  moneyValue: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold, color: colors.navy },
  inlineEdit: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center' },
  input: {
    minWidth: 110,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    color: colors.dark,
  },
  miniButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  miniButtonText: { color: colors.white, fontWeight: fonts.weights.bold },
  actions: { gap: spacing.sm },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  secondary: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  secondaryText: { color: colors.dark, fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.base },
  errorText: { marginTop: spacing.md, color: colors.error, fontSize: fonts.sizes.sm },
});
