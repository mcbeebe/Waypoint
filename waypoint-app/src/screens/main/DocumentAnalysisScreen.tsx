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
import type { IEPAnalysisResult, IEPGoal, GoalStrength, WeaknessSeverity } from '@/types/database';
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function DocumentAnalysisScreen({
  analysis,
  comparisonAnalysis,
  meetingPrepContext,
  onBack,
}: {
  analysis: IEPAnalysisResult;
  comparisonAnalysis?: IEPAnalysisResult;
  meetingPrepContext?: MeetingPrepContext;
  onBack?: () => void;
}) {
  const { showToast } = useToast();
  const { generateMeetingPrep, compareIEPs, isAnalyzing } = useDocumentAnalysis();

  const [viewMode, setViewMode] = useState<ViewMode>('analysis');
  const [expandedGoalIndex, setExpandedGoalIndex] = useState<number | null>(null);
  const [meetingPrepText, setMeetingPrepText] = useState<string | null>(null);
  const [comparison, setComparison] = useState<IEPComparisonResult | null>(null);

  const handleCompare = useCallback(() => {
    if (!comparisonAnalysis) {
      Alert.alert('Select Two IEPs', 'Upload and analyze a second IEP to compare.');
      return;
    }
    const result = compareIEPs(comparisonAnalysis, analysis);
    setComparison(result);
    setViewMode('comparison');
  }, [analysis, comparisonAnalysis, compareIEPs]);

  const handleGeneratePrep = useCallback(async () => {
    if (!meetingPrepContext) {
      Alert.alert('Missing Context', 'Family profile information is needed for meeting prep.');
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

      {/* Summary Bar */}
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
            <Text style={styles.overallAssessment}>{analysis.summary.overallAssessment}</Text>
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
