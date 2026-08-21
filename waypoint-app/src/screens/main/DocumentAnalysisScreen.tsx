/**
 * Document Analysis screen — IEP goal analysis, comparison, and meeting prep
 * Phase 4: Sprints S36–S38
 *
 * Features:
 * - Goal cards with strength indicators (green/yellow/red)
 * - Expandable weakness details with improvement suggestions
 * - Copy improved goal text
 * - Side-by-side IEP comparison (S37)
 * - Meeting prep generator (S38)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useDocumentAnalysis, type MeetingPrepContext, type IEPComparisonResult } from '@/hooks/useDocumentAnalysis';
import { useToast } from '@/components/Toast';
import { showAlert } from '@/lib/dialogs';
import type { IEPAnalysisResult, IEPGoal, IEPParentSummary, GoalStrength, WeaknessSeverity } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const STRENGTH_CONFIG: Record<GoalStrength, { label: string; color: string; bg: string }> = {
  strong: { label: 'Strong', color: '#059669', bg: '#D1FAE5' },
  adequate: { label: 'Adequate', color: '#D97706', bg: '#FEF3C7' },
  weak: { label: 'Weak', color: '#DC2626', bg: '#FEE2E2' },
};

const SEVERITY_CONFIG: Record<WeaknessSeverity, { label: string; color: string }> = {
  critical: { label: 'Critical', color: '#DC2626' },
  major: { label: 'Major', color: '#EA580C' },
  minor: { label: 'Minor', color: '#D97706' },
};

type ViewMode = 'analysis' | 'comparison' | 'prep';

/** Plain-English summary cards — what the parent reads first */
function PlainSummary({
  summary,
  onAddNextSteps,
  addingSteps,
}: {
  summary: IEPParentSummary;
  onAddNextSteps?: () => void;
  addingSteps?: boolean;
}) {
  return (
    <View style={psStyles.container}>
      <Text style={psStyles.whatIsThis}>📄 {summary.whatIsThis}</Text>

      <View style={psStyles.headlineCard}>
        <Text style={psStyles.headlineLabel}>THE BOTTOM LINE</Text>
        <Text style={psStyles.headlineText}>{summary.headline}</Text>
      </View>

      {summary.goodNews.length > 0 && (
        <View style={[psStyles.card, psStyles.cardGood]}>
          <Text style={[psStyles.cardTitle, psStyles.titleGood]}>🟢 The good news</Text>
          {summary.goodNews.map((item, i) => (
            <View key={`g-${i}`} style={psStyles.bulletRow}>
              <Text style={[psStyles.bulletDot, psStyles.titleGood]}>•</Text>
              <Text style={psStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {summary.concerns.length > 0 && (
        <View style={[psStyles.card, psStyles.cardConcern]}>
          <Text style={[psStyles.cardTitle, psStyles.titleConcern]}>🟠 Worth paying attention to</Text>
          {summary.concerns.map((item, i) => (
            <View key={`c-${i}`} style={psStyles.bulletRow}>
              <Text style={[psStyles.bulletDot, psStyles.titleConcern]}>•</Text>
              <Text style={psStyles.bulletText}>{item}</Text>
            </View>
          ))}
        </View>
      )}

      {summary.nextSteps.length > 0 && (
        <View style={[psStyles.card, psStyles.cardNext]}>
          <Text style={[psStyles.cardTitle, psStyles.titleNext]}>➡️ What you can do next</Text>
          {summary.nextSteps.map((item, i) => (
            <View key={`n-${i}`} style={psStyles.bulletRow}>
              <Text style={[psStyles.stepNum, psStyles.titleNext]}>{i + 1}.</Text>
              <Text style={psStyles.bulletText}>{item}</Text>
            </View>
          ))}
          {/* Advice you have to retype is advice you won't act on */}
          {onAddNextSteps && (
            <TouchableOpacity
              style={psStyles.addStepsButton}
              onPress={onAddNextSteps}
              disabled={addingSteps}
              accessibilityRole="button"
              accessibilityLabel="Add these next steps to my action plan"
            >
              <Text style={psStyles.addStepsText}>
                {addingSteps
                  ? 'Adding…'
                  : `＋ Add ${summary.nextSteps.length} step${summary.nextSteps.length === 1 ? '' : 's'} to my Action Plan`}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
}

const psStyles = StyleSheet.create({
  addStepsButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  addStepsText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  container: {
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  whatIsThis: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  headlineCard: {
    backgroundColor: colors.navy,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  headlineLabel: {
    fontSize: 10,
    color: '#7DD3C8',
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  headlineText: {
    fontSize: fonts.sizes.base,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
    lineHeight: 22,
  },
  card: {
    borderRadius: radii.md,
    padding: spacing.md,
    borderLeftWidth: 4,
  },
  cardGood: {
    backgroundColor: '#ECFDF5',
    borderLeftColor: '#059669',
  },
  cardConcern: {
    backgroundColor: '#FFFBEB',
    borderLeftColor: '#D97706',
  },
  cardNext: {
    backgroundColor: '#E6F7F5',
    borderLeftColor: colors.teal,
  },
  cardTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    marginBottom: 6,
  },
  titleGood: { color: '#047857' },
  titleConcern: { color: '#B45309' },
  titleNext: { color: '#0F766E' },
  bulletRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 5,
  },
  bulletDot: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    lineHeight: 21,
  },
  stepNum: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold as '700',
    lineHeight: 21,
    minWidth: 16,
  },
  bulletText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: '#1F2937',
    lineHeight: 21,
  },
});

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function DocumentAnalysisScreen({
  analysis,
  comparisonAnalysis,
  meetingPrepContext,
  onBack,
  onSaveGoals,
  onCreateActions,
}: {
  analysis: IEPAnalysisResult;
  comparisonAnalysis?: IEPAnalysisResult;
  meetingPrepContext?: MeetingPrepContext;
  onBack?: () => void;
  /** Save the analyzed goals into the IEP goal tracker */
  onSaveGoals?: (goals: IEPAnalysisResult['goals']) => void;
  /** Turn recommendations into Action Plan items; resolves with how many landed */
  onCreateActions?: (
    drafts: Array<{ title: string; description?: string; priority?: string }>
  ) => Promise<number>;
}) {
  const { showToast } = useToast();
  const { generateMeetingPrep, compareIEPs, isAnalyzing } = useDocumentAnalysis();

  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [expandedGoalIndex, setExpandedGoalIndex] = useState<number | null>(null);
  const [showExpert, setShowExpert] = useState(false);
  const [meetingPrepText, setMeetingPrepText] = useState<string | null>(null);
  const [comparison, setComparison] = useState<IEPComparisonResult | null>(null);
  const [addingSteps, setAddingSteps] = useState(false);
  const [stepsAdded, setStepsAdded] = useState(false);

  /**
   * Turn the analysis into work. Each next step becomes a plan item, and
   * every goal with a critical finding becomes a "get this rewritten"
   * item carrying the suggested wording and the citation behind it.
   */
  const handleAddNextSteps = useCallback(async () => {
    if (!onCreateActions || addingSteps) return;
    setAddingSteps(true);
    try {
      const drafts: Array<{ title: string; description?: string; priority?: string }> = [];

      for (const step of analysis.parentSummary?.nextSteps ?? []) {
        drafts.push({
          title: step,
          description: `From your IEP analysis.\n\n${analysis.parentSummary?.headline ?? ''}`.trim(),
          priority: 'high',
        });
      }

      for (const goal of analysis.goals) {
        const critical = goal.weaknesses?.filter((w) => w.severity === 'critical') ?? [];
        if (critical.length === 0 || !goal.improvedGoal) continue;
        drafts.push({
          title: `Ask the team to rewrite the ${goal.domain} goal`,
          description: [
            `The current goal has ${critical.length} critical issue${critical.length === 1 ? '' : 's'}:`,
            ...critical.map((w) => `• ${w.issue} — ${w.explanation}`),
            '',
            'Suggested wording to bring to the meeting:',
            goal.improvedGoal,
            goal.legalCitation ? `\nSupporting regulation: ${goal.legalCitation}` : '',
          ]
            .filter(Boolean)
            .join('\n'),
          priority: 'high',
        });
      }

      if (drafts.length === 0) return;
      const added = await onCreateActions(drafts);
      if (added > 0) setStepsAdded(true);
    } finally {
      setAddingSteps(false);
    }
  }, [onCreateActions, addingSteps, analysis]);

  const handleCompare = useCallback(() => {
    if (!comparisonAnalysis) {
      showAlert('Select Two IEPs', 'Upload and analyze a second IEP to compare.');
      return;
    }
    const result = compareIEPs(comparisonAnalysis, analysis);
    setComparison(result);
    setViewMode('comparison');
  }, [analysis, comparisonAnalysis, compareIEPs]);

  const handleGeneratePrep = useCallback(async () => {
    if (!meetingPrepContext) {
      showAlert('Missing Context', 'Family profile information is needed for meeting prep.');
      return;
    }
    const prep = await generateMeetingPrep(analysis, meetingPrepContext);
    if (prep) {
      setMeetingPrepText(prep);
      setViewMode('prep');
    }
  }, [analysis, meetingPrepContext, generateMeetingPrep]);

  const handleCopyGoal = useCallback(async (text: string) => {
    await Clipboard.setStringAsync(text);
    showToast('Copied to clipboard', 'success');
  }, [showToast]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        {onBack && (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        )}
        <Text style={styles.headerTitle}>IEP Analysis</Text>
      </View>

      {/* Legal disclaimer (required by roadmap 2.2 / PRD F7) */}
      <View style={styles.disclaimerBar}>
        <Text style={styles.disclaimerText}>
          AI suggestions are informational, not legal advice. Consult an advocate or attorney for
          decisions about your child's IEP.
        </Text>
      </View>

      {onSaveGoals && analysis.goals.length > 0 && (
        <TouchableOpacity
          style={styles.saveGoalsButton}
          onPress={() => onSaveGoals(analysis.goals)}
          accessibilityRole="button"
          accessibilityLabel="Save these goals to your tracker"
        >
          <Text style={styles.saveGoalsText}>
            🎯 Track these {analysis.goals.length} goals in your IEP Hub
          </Text>
        </TouchableOpacity>
      )}

      {/* Summary Bar — goal counts only make sense when goals were found */}
      {analysis.summary.totalGoals > 0 && (
      <View style={styles.summaryBar}>
        <View style={[styles.summaryDot, { backgroundColor: '#D1FAE5' }]}>
          <Text style={styles.summaryCount}>{analysis.summary.strongCount}</Text>
          <Text style={styles.summaryDotLabel}>Strong</Text>
        </View>
        <View style={[styles.summaryDot, { backgroundColor: '#FEF3C7' }]}>
          <Text style={styles.summaryCount}>{analysis.summary.adequateCount}</Text>
          <Text style={styles.summaryDotLabel}>Adequate</Text>
        </View>
        <View style={[styles.summaryDot, { backgroundColor: '#FEE2E2' }]}>
          <Text style={styles.summaryCount}>{analysis.summary.weakCount}</Text>
          <Text style={styles.summaryDotLabel}>Weak</Text>
        </View>
        <View style={[styles.summaryDot, { backgroundColor: colors.light }]}>
          <Text style={styles.summaryCount}>{analysis.summary.totalGoals}</Text>
          <Text style={styles.summaryDotLabel}>Total</Text>
        </View>
      </View>
      )}

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'analysis' && styles.togglePillActive]}
          onPress={() => setViewMode('analysis')}
        >
          <Text style={[styles.toggleText, viewMode === 'analysis' && styles.toggleTextActive]}>Goals</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'comparison' && styles.togglePillActive]}
          onPress={handleCompare}
        >
          <Text style={[styles.toggleText, viewMode === 'comparison' && styles.toggleTextActive]}>Compare</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'prep' && styles.togglePillActive]}
          onPress={handleGeneratePrep}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <ActivityIndicator size="small" color={colors.teal} />
          ) : (
            <Text style={[styles.toggleText, viewMode === 'prep' && styles.toggleTextActive]}>Meeting Prep</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {viewMode === 'analysis' && (
          <>
            {analysis.parentSummary ? (
              <>
                <PlainSummary
                  summary={analysis.parentSummary}
                  onAddNextSteps={onCreateActions && !stepsAdded ? handleAddNextSteps : undefined}
                  addingSteps={addingSteps}
                />
                {/* Expert layer behind a toggle — the dense full assessment */}
                <TouchableOpacity
                  style={styles.expertToggle}
                  onPress={() => setShowExpert(!showExpert)}
                  accessibilityRole="button"
                  accessibilityLabel={showExpert ? 'Hide detailed analysis' : 'Show detailed analysis'}
                >
                  <Text style={styles.expertToggleText}>
                    {showExpert ? 'Hide detailed analysis ▲' : 'Show detailed analysis ▼'}
                  </Text>
                </TouchableOpacity>
                {showExpert && (
                  <Text style={styles.overallAssessment}>{analysis.summary.overallAssessment}</Text>
                )}
              </>
            ) : (
              // Analyses run before the plain-English upgrade
              <Text style={styles.overallAssessment}>{analysis.summary.overallAssessment}</Text>
            )}
            {analysis.goals.map((goal, i) => (
              <GoalCard
                key={i}
                goal={goal}
                index={i}
                isExpanded={expandedGoalIndex === i}
                onToggle={() => setExpandedGoalIndex(expandedGoalIndex === i ? null : i)}
                onCopy={handleCopyGoal}
              />
            ))}
          </>
        )}

        {viewMode === 'comparison' && comparison && (
          <ComparisonView comparison={comparison} />
        )}

        {viewMode === 'prep' && meetingPrepText && (
          <View style={styles.prepContainer}>
            <View style={styles.prepHeader}>
              <Text style={styles.prepTitle}>IEP Meeting Prep</Text>
              <TouchableOpacity onPress={() => handleCopyGoal(meetingPrepText)}>
                <Text style={styles.copyButton}>Copy All</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.prepText}>{meetingPrepText}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Goal Card ──────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  index,
  isExpanded,
  onToggle,
  onCopy,
}: {
  goal: IEPGoal;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (text: string) => void;
}) {
  const strengthConfig = STRENGTH_CONFIG[goal.strength];

  return (
    <View style={styles.goalCard}>
      <TouchableOpacity style={styles.goalHeader} onPress={onToggle}>
        <View style={styles.goalHeaderLeft}>
          <View style={[styles.strengthBadge, { backgroundColor: strengthConfig.bg }]}>
            <Text style={[styles.strengthText, { color: strengthConfig.color }]}>
              {strengthConfig.label}
            </Text>
          </View>
          <Text style={styles.goalDomain}>{goal.domain}</Text>
        </View>
        <Text style={styles.expandArrow}>{isExpanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <Text style={styles.goalText}>{goal.goalText}</Text>

      {/* Goal Components */}
      <View style={styles.componentRow}>
        <ComponentChip label="Baseline" value={goal.baseline} />
        <ComponentChip label="Target" value={goal.target} />
        <ComponentChip label="Measure" value={goal.measurement} />
        <ComponentChip label="Timeline" value={goal.timeline} />
      </View>

      {isExpanded && (
        <View style={styles.expandedSection}>
          {/* Weaknesses */}
          {goal.weaknesses.length > 0 && (
            <View style={styles.weaknessSection}>
              <Text style={styles.sectionLabel}>Issues Found</Text>
              {goal.weaknesses.map((w, i) => {
                const sevConfig = SEVERITY_CONFIG[w.severity];
                return (
                  <View key={i} style={styles.weaknessRow}>
                    <View style={[styles.severityBadge, { backgroundColor: sevConfig.color + '20' }]}>
                      <Text style={[styles.severityText, { color: sevConfig.color }]}>{sevConfig.label}</Text>
                    </View>
                    <View style={styles.weaknessInfo}>
                      <Text style={styles.weaknessIssue}>{w.issue}</Text>
                      <Text style={styles.weaknessExplanation}>{w.explanation}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Improved Goal */}
          {goal.improvedGoal && (
            <View style={styles.improvedSection}>
              <View style={styles.improvedHeader}>
                <Text style={styles.sectionLabel}>Suggested Improvement</Text>
                <TouchableOpacity onPress={() => onCopy(goal.improvedGoal)}>
                  <Text style={styles.copyButton}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.improvedText}>{goal.improvedGoal}</Text>
              {goal.legalCitation && (
                <Text style={styles.citation}>{goal.legalCitation}</Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function ComponentChip({ label, value }: { label: string; value: string | null }) {
  return (
    <View style={[styles.componentChip, !value && styles.componentChipMissing]}>
      <Text style={[styles.componentLabel, !value && styles.componentLabelMissing]}>
        {label}: {value ? 'Yes' : 'Missing'}
      </Text>
    </View>
  );
}

// ─── Comparison View (S37) ──────────────────────────────────────────────────

function ComparisonView({ comparison }: { comparison: IEPComparisonResult }) {
  return (
    <View>
      <Text style={styles.comparisonSummary}>{comparison.progressSummary}</Text>

      {comparison.newGoals.length > 0 && (
        <View style={styles.comparisonSection}>
          <Text style={[styles.comparisonLabel, { color: '#059669' }]}>New Goals Added</Text>
          {comparison.newGoals.map((g, i) => (
            <View key={i} style={[styles.comparisonCard, { borderLeftColor: '#059669' }]}>
              <Text style={styles.comparisonDomain}>{g.domain}</Text>
              <Text style={styles.comparisonGoalText}>{g.goalText}</Text>
            </View>
          ))}
        </View>
      )}

      {comparison.removedGoals.length > 0 && (
        <View style={styles.comparisonSection}>
          <Text style={[styles.comparisonLabel, { color: '#DC2626' }]}>Goals Removed</Text>
          {comparison.removedGoals.map((g, i) => (
            <View key={i} style={[styles.comparisonCard, { borderLeftColor: '#DC2626' }]}>
              <Text style={styles.comparisonDomain}>{g.domain}</Text>
              <Text style={styles.comparisonGoalText}>{g.goalText}</Text>
            </View>
          ))}
        </View>
      )}

      {comparison.changedGoals.length > 0 && (
        <View style={styles.comparisonSection}>
          <Text style={[styles.comparisonLabel, { color: '#2563EB' }]}>Goals Changed</Text>
          {comparison.changedGoals.map((g, i) => (
            <View key={i} style={[styles.comparisonCard, { borderLeftColor: g.improved ? '#059669' : '#D97706' }]}>
              <Text style={styles.comparisonDomain}>
                {g.domain} {g.improved ? '(Improved)' : '(Changed)'}
              </Text>
              <Text style={[styles.comparisonGoalText, { textDecorationLine: 'line-through', color: colors.mid }]}>
                {g.oldGoal}
              </Text>
              <Text style={styles.comparisonGoalText}>{g.newGoal}</Text>
            </View>
          ))}
        </View>
      )}

      {comparison.unchangedCount > 0 && (
        <Text style={styles.unchangedNote}>{comparison.unchangedCount} goal(s) unchanged</Text>
      )}
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  disclaimerBar: {
    backgroundColor: '#FFFBEB',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  disclaimerText: { fontSize: fonts.sizes.xs, color: '#92400E', lineHeight: 16 },
  saveGoalsButton: {
    backgroundColor: colors.teal,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  saveGoalsText: { color: colors.white, fontWeight: fonts.weights.bold as '700', fontSize: fonts.sizes.md },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  backButton: { paddingRight: spacing.sm },
  backText: { fontSize: fonts.sizes.sm, color: colors.teal },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  summaryBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border, justifyContent: 'space-around',
  },
  summaryDot: {
    width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center',
  },
  summaryCount: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  summaryDotLabel: { fontSize: 9, color: colors.mid, marginTop: 1 },
  toggleRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6,
  },
  togglePill: { flex: 1, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center' },
  togglePillActive: { backgroundColor: colors.teal },
  toggleText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  toggleTextActive: { color: colors.white },
  scrollContent: { padding: spacing.md, paddingBottom: spacing.xl },
  expertToggle: {
    alignSelf: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  expertToggleText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  overallAssessment: {
    fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 20,
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.md,
  },
  // Goal Card
  goalCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  goalHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  strengthBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radii.sm },
  strengthText: { fontSize: 10, fontWeight: fonts.weights.medium as '500' },
  goalDomain: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  expandArrow: { fontSize: 10, color: colors.mid },
  goalText: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 18, marginBottom: spacing.sm },
  componentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  componentChip: { backgroundColor: '#D1FAE5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  componentChipMissing: { backgroundColor: '#FEE2E2' },
  componentLabel: { fontSize: 9, color: '#059669' },
  componentLabelMissing: { color: '#DC2626' },
  expandedSection: { marginTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.md },
  weaknessSection: { marginBottom: spacing.md },
  sectionLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  weaknessRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  severityBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm, alignSelf: 'flex-start' },
  severityText: { fontSize: 9, fontWeight: fonts.weights.medium as '500' },
  weaknessInfo: { flex: 1 },
  weaknessIssue: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.medium as '500', color: colors.dark },
  weaknessExplanation: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2, lineHeight: 16 },
  improvedSection: { backgroundColor: '#F0FDF4', borderRadius: radii.md, padding: spacing.md },
  improvedHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  improvedText: { fontSize: fonts.sizes.xs, color: '#065F46', lineHeight: 18 },
  citation: { fontSize: 10, color: '#059669', fontStyle: 'italic', marginTop: spacing.sm },
  copyButton: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: fonts.weights.medium as '500' },
  // Comparison
  comparisonSummary: { fontSize: fonts.sizes.sm, color: colors.dark, marginBottom: spacing.md, lineHeight: 20 },
  comparisonSection: { marginBottom: spacing.lg },
  comparisonLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', marginBottom: spacing.sm },
  comparisonCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 6,
    borderLeftWidth: 3,
  },
  comparisonDomain: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: 4 },
  comparisonGoalText: { fontSize: fonts.sizes.xs, color: colors.dark, lineHeight: 16 },
  unchangedNote: { fontSize: fonts.sizes.xs, color: colors.mid, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.md },
  // Meeting Prep
  prepContainer: { backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md },
  prepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  prepTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  prepText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 22 },
});
