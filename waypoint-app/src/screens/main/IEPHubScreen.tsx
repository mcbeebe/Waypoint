/**
 * IEP Hub (roadmap 2.3 + 2.4) — the child's IEP timeline clocks and goal
 * tracker. Dates feed the deadlines system (Home alerts + Calendar); goals
 * can be imported from an AI IEP analysis or entered manually, with parent
 * progress logs building the record for the next IEP meeting.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useIEPGoals } from '@/hooks/useIEPGoals';
import { syncIEPDeadlines } from '@/lib/iepDeadlines';
import { useToast } from '@/components/Toast';
import { Card, SectionTitle, Chip, SkeletonCard } from '@/components/ui';
import EmptyState from '@/components/EmptyState';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, radii, semantic } from '@/lib/theme';

const GOAL_DOMAINS = ['Communication', 'Social', 'Academic', 'Motor', 'Behavior', 'Adaptive', 'Other'];

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function DateField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.dateLabel}>{label}</Text>
      <TextInput
        style={styles.dateInput}
        value={value}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={colors.mid}
        autoCapitalize="none"
        accessibilityLabel={label}
      />
      {hint ? <Text style={styles.dateHint}>{hint}</Text> : null}
    </View>
  );
}

export default function IEPHubScreen() {
  const { family } = useFamily();
  const { children, updateChild } = useChildren(family?.id);
  const primaryChild = children.find(c => c.is_primary) || children[0];
  const { showToast } = useToast();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  const {
    goals,
    logsByGoal,
    loading,
    createGoal,
    updateGoalStatus,
    addLog,
    latestProgress,
  } = useIEPGoals(family?.id ?? '', primaryChild?.id);

  // ── Timeline dates ──
  const [annual, setAnnual] = useState('');
  const [triennial, setTriennial] = useState('');
  const [planRequested, setPlanRequested] = useState('');
  const [consentSigned, setConsentSigned] = useState('');
  const [savingDates, setSavingDates] = useState(false);

  useEffect(() => {
    if (primaryChild) {
      setAnnual(primaryChild.iep_last_annual_review ?? '');
      setTriennial(primaryChild.iep_last_triennial ?? '');
      setPlanRequested(primaryChild.iep_assessment_plan_requested ?? '');
      setConsentSigned(primaryChild.iep_assessment_consent_signed ?? '');
    }
  }, [primaryChild]);

  const saveDates = async () => {
    if (!family || !primaryChild) return;
    const fields = { annual, triennial, planRequested, consentSigned };
    for (const [name, v] of Object.entries(fields)) {
      if (v && !DATE_RE.test(v)) {
        showToast(`"${v}" isn't a valid date — use YYYY-MM-DD.`, 'error');
        return;
      }
    }
    setSavingDates(true);
    try {
      await updateChild(primaryChild.id, {
        iep_last_annual_review: annual || null,
        iep_last_triennial: triennial || null,
        iep_assessment_plan_requested: planRequested || null,
        iep_assessment_consent_signed: consentSigned || null,
      });
      const count = await syncIEPDeadlines(family.id, primaryChild.id, primaryChild.first_name, {
        lastAnnualReview: annual || null,
        lastTriennial: triennial || null,
        assessmentPlanRequested: planRequested || null,
        assessmentConsentSigned: consentSigned || null,
      });
      showToast(
        count > 0
          ? `Saved — ${count} deadline${count !== 1 ? 's' : ''} added to your calendar.`
          : 'IEP dates saved.',
        'success'
      );
    } finally {
      setSavingDates(false);
    }
  };

  // ── New goal form ──
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalDomain, setGoalDomain] = useState('Communication');
  const [goalText, setGoalText] = useState('');
  const [goalBaseline, setGoalBaseline] = useState('');
  const [goalTarget, setGoalTarget] = useState('');

  const submitGoal = async () => {
    if (!goalText.trim()) {
      showToast('Describe the goal first.', 'error');
      return;
    }
    const created = await createGoal({
      domain: goalDomain,
      goal_text: goalText.trim(),
      baseline: goalBaseline.trim() || undefined,
      target: goalTarget.trim() || undefined,
      child_id: primaryChild?.id,
    });
    if (created) {
      setGoalText('');
      setGoalBaseline('');
      setGoalTarget('');
      setShowGoalForm(false);
      showToast('Goal added.', 'success');
    }
  };

  // ── Progress log form (per goal) ──
  const [loggingGoalId, setLoggingGoalId] = useState<string | null>(null);
  const [logNote, setLogNote] = useState('');
  const [logPct, setLogPct] = useState('');

  const submitLog = async (goalId: string) => {
    if (!logNote.trim()) {
      showToast('Add a short note about what you observed.', 'error');
      return;
    }
    const pct = logPct.trim() ? Math.max(0, Math.min(100, parseInt(logPct, 10) || 0)) : undefined;
    const ok = await addLog(goalId, logNote.trim(), pct);
    if (ok) {
      setLogNote('');
      setLogPct('');
      setLoggingGoalId(null);
      showToast('Progress logged. 📈', 'success');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Timeline clocks */}
        <SectionTitle>📅 IEP Timeline</SectionTitle>
        <Card>
          <Text style={[styles.timelineIntro, { fontSize: sz(13), lineHeight: sz(19) }]}>
            Enter the dates you have — Waypoint computes the legal clocks and adds them to your
            calendar with reminders.
          </Text>
          <DateField label="Last annual IEP review" value={annual} onChange={setAnnual} hint="Next review is due 1 year later" />
          <DateField label="Last triennial evaluation" value={triennial} onChange={setTriennial} hint="Re-evaluation is due every 3 years" />
          <DateField label="Assessment request sent (if waiting)" value={planRequested} onChange={setPlanRequested} hint="School owes an assessment plan in 15 days (school breaks pause the clock)" />
          <DateField label="Assessment consent signed (if waiting)" value={consentSigned} onChange={setConsentSigned} hint="Evaluation + IEP meeting due within 60 days (school breaks pause the clock)" />
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={saveDates}
            disabled={savingDates}
            accessibilityRole="button"
            accessibilityLabel="Save IEP dates and update deadlines"
          >
            <Text style={styles.primaryButtonText}>{savingDates ? 'Saving…' : 'Save & Update Deadlines'}</Text>
          </TouchableOpacity>
        </Card>

        {/* Goals */}
        <SectionTitle>🎯 IEP Goals ({goals.filter(g => g.status === 'active').length} active)</SectionTitle>

        {loading ? (
          <SkeletonCard />
        ) : goals.length === 0 && !showGoalForm ? (
          <EmptyState
            emoji="🎯"
            title="No goals tracked yet"
            subtitle="Add goals by hand, or upload an IEP in Documents and let the AI review extract them for you."
            actionLabel="Add a goal"
            onAction={() => setShowGoalForm(true)}
          />
        ) : (
          goals.map(goal => {
            const logs = logsByGoal[goal.id] ?? [];
            const progress = latestProgress(goal.id);
            return (
              <Card key={goal.id}>
                <View style={styles.goalHead}>
                  <Chip label={goal.domain} tone="info" textSize={sz(11)} />
                  <Chip
                    label={goal.status === 'active' ? 'Active' : goal.status === 'met' ? 'Met 🎉' : 'Discontinued'}
                    tone={goal.status === 'met' ? 'success' : goal.status === 'active' ? 'neutral' : 'warning'}
                    textSize={sz(11)}
                  />
                </View>
                <Text style={[styles.goalText, { fontSize: sz(14.5), lineHeight: sz(21) }]}>{goal.goal_text}</Text>
                {goal.baseline ? (
                  <Text style={[styles.goalMeta, { fontSize: sz(12.5) }]}>Baseline: {goal.baseline}</Text>
                ) : null}
                {goal.target ? (
                  <Text style={[styles.goalMeta, { fontSize: sz(12.5) }]}>Target: {goal.target}</Text>
                ) : null}

                {/* Progress */}
                {progress != null && (
                  <View style={styles.progressRow}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` }]} />
                    </View>
                    <Text style={[styles.progressPct, { fontSize: sz(12) }]}>{progress}%</Text>
                  </View>
                )}
                {logs.length > 0 && (
                  <Text style={[styles.logSummary, { fontSize: sz(12) }]}>
                    {logs.length} observation{logs.length !== 1 ? 's' : ''} · last:{' '}
                    {new Date(logs[logs.length - 1].logged_at).toLocaleDateString()} — “
                    {logs[logs.length - 1].note.slice(0, 60)}
                    {logs[logs.length - 1].note.length > 60 ? '…' : ''}”
                  </Text>
                )}

                {/* Log form */}
                {loggingGoalId === goal.id ? (
                  <View style={styles.logForm}>
                    <TextInput
                      style={styles.logInput}
                      value={logNote}
                      onChangeText={setLogNote}
                      placeholder="What did you observe? (e.g., 'Used 3-word phrases at dinner')"
                      placeholderTextColor={colors.mid}
                      multiline
                      accessibilityLabel="Progress note"
                    />
                    <TextInput
                      style={[styles.logInput, styles.pctInput]}
                      value={logPct}
                      onChangeText={setLogPct}
                      placeholder="% toward target (optional)"
                      placeholderTextColor={colors.mid}
                      keyboardType="number-pad"
                      maxLength={3}
                      accessibilityLabel="Percent toward target"
                    />
                    <View style={styles.rowButtons}>
                      <TouchableOpacity style={styles.primaryButtonSmall} onPress={() => submitLog(goal.id)}>
                        <Text style={styles.primaryButtonText}>Save log</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.ghostButton} onPress={() => setLoggingGoalId(null)}>
                        <Text style={styles.ghostButtonText}>Cancel</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.rowButtons}>
                    <TouchableOpacity
                      style={styles.ghostButton}
                      onPress={() => setLoggingGoalId(goal.id)}
                      accessibilityRole="button"
                      accessibilityLabel="Log progress"
                    >
                      <Text style={styles.ghostButtonText}>＋ Log progress</Text>
                    </TouchableOpacity>
                    {goal.status === 'active' && (
                      <TouchableOpacity
                        style={styles.ghostButton}
                        onPress={() => updateGoalStatus(goal.id, 'met')}
                        accessibilityRole="button"
                        accessibilityLabel="Mark goal met"
                      >
                        <Text style={styles.ghostButtonText}>✓ Mark met</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </Card>
            );
          })
        )}

        {/* Add-goal form */}
        {showGoalForm ? (
          <Card>
            <Text style={styles.formTitle}>New goal</Text>
            <View style={styles.domainRow}>
              {GOAL_DOMAINS.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[styles.domainChip, goalDomain === d && styles.domainChipActive]}
                  onPress={() => setGoalDomain(d)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: goalDomain === d }}
                >
                  <Text style={[styles.domainChipText, goalDomain === d && styles.domainChipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.logInput}
              value={goalText}
              onChangeText={setGoalText}
              placeholder="Goal as written in the IEP"
              placeholderTextColor={colors.mid}
              multiline
              accessibilityLabel="Goal text"
            />
            <TextInput
              style={styles.logInput}
              value={goalBaseline}
              onChangeText={setGoalBaseline}
              placeholder="Baseline (where they started)"
              placeholderTextColor={colors.mid}
              accessibilityLabel="Baseline"
            />
            <TextInput
              style={styles.logInput}
              value={goalTarget}
              onChangeText={setGoalTarget}
              placeholder="Target (what success looks like)"
              placeholderTextColor={colors.mid}
              accessibilityLabel="Target"
            />
            <View style={styles.rowButtons}>
              <TouchableOpacity style={styles.primaryButtonSmall} onPress={submitGoal}>
                <Text style={styles.primaryButtonText}>Add goal</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostButton} onPress={() => setShowGoalForm(false)}>
                <Text style={styles.ghostButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ) : goals.length > 0 ? (
          <TouchableOpacity
            style={styles.addGoalButton}
            onPress={() => setShowGoalForm(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a goal"
          >
            <Text style={styles.addGoalText}>＋ Add a goal</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  timelineIntro: { color: colors.mid, marginBottom: spacing.sm },
  dateField: { marginBottom: spacing.md },
  dateLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
    marginBottom: 4,
  },
  dateInput: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.sizes.md,
    color: colors.dark,
  },
  dateHint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  primaryButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryButtonSmall: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    minHeight: 40,
    justifyContent: 'center',
  },
  primaryButtonText: { color: colors.white, fontWeight: fonts.weights.bold as '700' },
  goalHead: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  goalText: { color: colors.dark, marginBottom: 4 },
  goalMeta: { color: colors.mid, marginBottom: 2 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: { height: 8, borderRadius: 4, backgroundColor: semantic.success },
  progressPct: { color: semantic.success, fontWeight: fonts.weights.bold as '700', minWidth: 34 },
  logSummary: { color: colors.mid, marginTop: spacing.sm, fontStyle: 'italic' },
  logForm: { marginTop: spacing.sm },
  logInput: {
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    marginBottom: spacing.sm,
  },
  pctInput: { maxWidth: 220 },
  rowButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  ghostButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.base,
    minHeight: 40,
    justifyContent: 'center',
  },
  ghostButtonText: { color: colors.teal, fontWeight: fonts.weights.semibold as '600' },
  formTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  domainRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  domainChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  domainChipActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  domainChipText: { fontSize: fonts.sizes.sm, color: colors.dark },
  domainChipTextActive: { color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  addGoalButton: {
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  addGoalText: { color: colors.teal, fontWeight: fonts.weights.bold as '700' },
});
