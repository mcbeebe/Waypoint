/**
 * Action Detail screen — shows full action with script, steps, KB links
 * Sprint 3: S3-03
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  Action,
  ActionStatus,
  ActionStep,
  ActionCategory,
  ActionPriority,
} from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface ActionDetailScreenProps {
  action: Action;
  onUpdateStatus: (status: ActionStatus, reason?: string) => void;
  onToggleStep: (stepIndex: number) => void;
  onUpdate: (data: Partial<Action>) => void;
  onBack: () => void;
}

const STATUS_OPTIONS: Array<{ status: ActionStatus; label: string; emoji: string; color: string }> = [
  { status: 'not_started', label: 'Not Started', emoji: '○', color: '#94A3B8' },
  { status: 'in_progress', label: 'In Progress', emoji: '◐', color: '#0891B2' },
  { status: 'completed', label: 'Completed', emoji: '●', color: '#10B981' },
  { status: 'dismissed', label: 'Dismissed', emoji: '—', color: '#CBD5E1' },
];

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  regional_center: '🏛️ Regional Center',
  iep: '🏫 IEP / School',
  insurance: '🏥 Insurance',
  benefits: '💰 Benefits',
  medical: '⚕️ Medical',
  legal: '⚖️ Legal',
  general: '📋 General',
};

const PRIORITY_LABELS: Record<ActionPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#DC2626' },
  high: { label: 'High', color: '#EA580C' },
  medium: { label: 'Medium', color: '#2563EB' },
  low: { label: 'Low', color: '#64748B' },
};

export default function ActionDetailScreen({
  action,
  onUpdateStatus,
  onToggleStep,
  onUpdate,
  onBack,
}: ActionDetailScreenProps) {
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissInput, setShowDismissInput] = useState(false);

  const stepsDone = action.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = action.steps?.length ?? 0;

  const handleStatusChange = (status: ActionStatus) => {
    if (status === 'dismissed') {
      setShowDismissInput(true);
      return;
    }
    onUpdateStatus(status);
  };

  const handleDismiss = () => {
    onUpdateStatus('dismissed', dismissReason || undefined);
    setShowDismissInput(false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title + Meta */}
        <Text style={styles.title}>{action.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.categoryLabel}>
            {CATEGORY_LABELS[action.category]}
          </Text>
          <Text style={[styles.priorityLabel, { color: PRIORITY_LABELS[action.priority].color }]}>
            {PRIORITY_LABELS[action.priority].label} Priority
          </Text>
        </View>

        {action.description && (
          <Text style={styles.description}>{action.description}</Text>
        )}

        {/* Status Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.status}
                style={[
                  styles.statusPill,
                  action.status === opt.status && { backgroundColor: opt.color },
                ]}
                onPress={() => handleStatusChange(opt.status)}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    action.status === opt.status && styles.statusPillTextActive,
                  ]}
                >
                  {opt.emoji} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDismissInput && (
            <View style={styles.dismissBox}>
              <TextInput
                style={styles.dismissInput}
                placeholder="Reason for dismissing (optional)"
                placeholderTextColor={colors.mid}
                value={dismissReason}
                onChangeText={setDismissReason}
              />
              <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Script */}
        {action.script && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Suggested Script</Text>
            <View style={styles.scriptBox}>
              <Text style={styles.scriptText}>{action.script}</Text>
            </View>
            <Text style={styles.scriptHint}>
              You can read this when calling your Regional Center or school district.
            </Text>
          </View>
        )}

        {/* Steps Checklist */}
        {action.steps && action.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ✅ Steps ({stepsDone}/{stepsTotal})
            </Text>
            {action.steps.map((step, index) => (
              <TouchableOpacity
                key={index}
                style={styles.stepRow}
                onPress={() => onToggleStep(index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: step.done }}
              >
                <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
                  {step.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.stepText, step.done && styles.stepTextDone]}>
                  {step.step}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* KB Article Links */}
        {action.kb_article_ids && action.kb_article_ids.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Related Knowledge Base</Text>
            {action.kb_article_ids.map((articleId) => (
              <View key={articleId} style={styles.kbLink}>
                <Text style={styles.kbLinkText}>
                  {articleId} — Tap to view article
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Timeline Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Timeline</Text>
          <View style={styles.timelineGrid}>
            {action.due_date && (
              <TimelineItem label="Due Date" value={formatDate(action.due_date)} />
            )}
            {action.follow_up_date && (
              <TimelineItem label="Follow-up" value={formatDate(action.follow_up_date)} />
            )}
            <TimelineItem label="Created" value={formatDate(action.created_at)} />
            {action.completed_at && (
              <TimelineItem label="Completed" value={formatDate(action.completed_at)} />
            )}
          </View>
          {action.follow_up_note && (
            <Text style={styles.followUpNote}>Note: {action.follow_up_note}</Text>
          )}
        </View>

        {/* Source */}
        <View style={styles.sourceRow}>
          <Text style={styles.sourceText}>
            Source: {action.source === 'ai_navigator' ? '🧭 AI Navigator' : action.source === 'system' ? '⚙️ System' : '✏️ Manual'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timelineItem}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold,
    color: colors.navy,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  priorityLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold,
  },
  description: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.light,
  },
  statusPillText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  statusPillTextActive: {
    color: colors.white,
  },
  dismissBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  dismissInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fonts.sizes.xs,
  },
  dismissButton: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  scriptBox: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  scriptText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  scriptHint: {
    fontSize: 10,
    color: colors.mid,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 18,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: colors.mid,
  },
  kbLink: {
    backgroundColor: '#EFF6FF',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  kbLinkText: {
    fontSize: fonts.sizes.xs,
    color: '#2563EB',
  },
  timelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  timelineItem: {
    width: '45%',
  },
  timelineLabel: {
    fontSize: 10,
    color: colors.mid,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  followUpNote: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  sourceRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceText: {
    fontSize: 10,
    color: colors.mid,
  },
});
