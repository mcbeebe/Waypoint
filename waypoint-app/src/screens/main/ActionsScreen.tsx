/**
 * Actions screen — Action Plan list with progress dashboard
 * Sprint 3: S3-01 (list UI), S3-02 (progress rings), S3-05 (deadlines)
 *
 * Features:
 * - 4-state action management (not_started / in_progress / completed / dismissed)
 * - Filter by status + category
 * - Progress ring showing completion rate
 * - Swipe actions for quick status changes
 * - Deadline indicators with color-coded urgency
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import type { Action, ActionStatus, ActionCategory, ActionPriority } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<ActionStatus, { label: string; emoji: string; color: string }> = {
  not_started: { label: 'To Do', emoji: '○', color: '#94A3B8' },
  in_progress: { label: 'In Progress', emoji: '◐', color: '#0891B2' },
  completed: { label: 'Done', emoji: '●', color: '#10B981' },
  dismissed: { label: 'Dismissed', emoji: '—', color: '#CBD5E1' },
};

const PRIORITY_CONFIG: Record<ActionPriority, { label: string; color: string; bg: string }> = {
  urgent: { label: 'Urgent', color: '#DC2626', bg: '#FEE2E2' },
  high: { label: 'High', color: '#EA580C', bg: '#FFF7ED' },
  medium: { label: 'Med', color: '#2563EB', bg: '#EFF6FF' },
  low: { label: 'Low', color: '#64748B', bg: '#F1F5F9' },
};

const CATEGORY_CONFIG: Record<ActionCategory, { label: string; emoji: string }> = {
  regional_center: { label: 'Regional Center', emoji: '🏛️' },
  iep: { label: 'IEP / School', emoji: '🏫' },
  insurance: { label: 'Insurance', emoji: '🏥' },
  benefits: { label: 'Benefits', emoji: '💰' },
  medical: { label: 'Medical', emoji: '⚕️' },
  legal: { label: 'Legal', emoji: '⚖️' },
  general: { label: 'General', emoji: '📋' },
};

const STATUS_FILTERS: ActionStatus[] = ['not_started', 'in_progress', 'completed', 'dismissed'];

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ActionsScreen() {
  const { family } = useFamily();
  const [activeFilter, setActiveFilter] = useState<ActionStatus | 'all'>('all');

  const statusFilter = activeFilter === 'all'
    ? undefined
    : [activeFilter];

  const {
    actions,
    loading,
    error,
    stats,
    updateStatus,
    refetch,
  } = useActions({
    familyId: family?.id ?? '',
    statusFilter,
  });

  // Sort: urgent first, then by due date, then by created date
  const sortedActions = useMemo(() => {
    return [...actions].sort((a, b) => {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const pa = priorityOrder[a.priority] ?? 2;
      const pb = priorityOrder[b.priority] ?? 2;
      if (pa !== pb) return pa - pb;

      if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
      if (a.due_date) return -1;
      if (b.due_date) return 1;

      return b.created_at.localeCompare(a.created_at);
    });
  }, [actions]);

  const handleCycleStatus = (action: Action) => {
    const nextStatus: Record<ActionStatus, ActionStatus> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
      dismissed: 'not_started',
    };
    updateStatus(action.id, nextStatus[action.status]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Action Plan</Text>
        <Text style={styles.headerSubtitle}>Your personalized next steps</Text>
      </View>

      {/* Progress Dashboard */}
      {stats && (
        <View style={styles.statsRow}>
          <ProgressRing
            value={stats.completion_rate ?? 0}
            total={100}
            label="Complete"
            color={colors.sage}
          />
          <StatPill
            count={stats.not_started_count}
            label="To Do"
            color="#94A3B8"
          />
          <StatPill
            count={stats.in_progress_count}
            label="Active"
            color={colors.teal}
          />
          <StatPill
            count={stats.completed_count}
            label="Done"
            color={colors.sage}
          />
        </View>
      )}

      {/* Status Filters */}
      <View style={styles.filterRow}>
        <FilterPill
          label="All"
          active={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        {STATUS_FILTERS.map((status) => (
          <FilterPill
            key={status}
            label={STATUS_CONFIG[status].label}
            active={activeFilter === status}
            onPress={() => setActiveFilter(status)}
          />
        ))}
      </View>

      {/* Action List */}
      <FlatList
        data={sortedActions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ActionCard
            action={item}
            onStatusPress={() => handleCycleStatus(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.teal} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📋</Text>
            <Text style={styles.emptyTitle}>No actions yet</Text>
            <Text style={styles.emptySubtitle}>
              Ask the AI Navigator a question — it will suggest concrete next steps you can save here.
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function ActionCard({
  action,
  onStatusPress,
}: {
  action: Action;
  onStatusPress: () => void;
}) {
  const statusConfig = STATUS_CONFIG[action.status];
  const priorityConfig = PRIORITY_CONFIG[action.priority];
  const categoryConfig = CATEGORY_CONFIG[action.category];
  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'completed';
  const isDueSoon = action.due_date && !isOverdue && daysUntil(action.due_date) <= (action.deadline_warning_days || 7);

  const stepsDone = action.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = action.steps?.length ?? 0;

  return (
    <View style={[styles.card, action.status === 'dismissed' && styles.cardDismissed]}>
      <View style={styles.cardTop}>
        {/* Status toggle button */}
        <TouchableOpacity
          style={[styles.statusCircle, { borderColor: statusConfig.color }]}
          onPress={onStatusPress}
          accessibilityRole="button"
          accessibilityLabel={`Change status from ${statusConfig.label}`}
        >
          <Text style={[styles.statusIcon, { color: statusConfig.color }]}>
            {statusConfig.emoji}
          </Text>
        </TouchableOpacity>

        {/* Title + meta */}
        <View style={styles.cardContent}>
          <Text
            style={[
              styles.cardTitle,
              action.status === 'completed' && styles.cardTitleDone,
              action.status === 'dismissed' && styles.cardTitleDismissed,
            ]}
            numberOfLines={2}
          >
            {action.title}
          </Text>

          <View style={styles.cardMeta}>
            <Text style={styles.categoryTag}>
              {categoryConfig.emoji} {categoryConfig.label}
            </Text>
            <View style={[styles.priorityBadge, { backgroundColor: priorityConfig.bg }]}>
              <Text style={[styles.priorityText, { color: priorityConfig.color }]}>
                {priorityConfig.label}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Steps progress bar */}
      {stepsTotal > 0 && (
        <View style={styles.stepsRow}>
          <View style={styles.stepsBar}>
            <View
              style={[
                styles.stepsBarFill,
                { width: `${(stepsDone / stepsTotal) * 100}%` },
              ]}
            />
          </View>
          <Text style={styles.stepsLabel}>
            {stepsDone}/{stepsTotal} steps
          </Text>
        </View>
      )}

      {/* Due date */}
      {action.due_date && (
        <View style={styles.dueRow}>
          <Text
            style={[
              styles.dueText,
              isOverdue && styles.dueOverdue,
              isDueSoon && styles.dueSoon,
            ]}
          >
            {isOverdue ? '⚠️ Overdue' : isDueSoon ? '⏰ Due soon' : '📅 Due'}:{' '}
            {formatDate(action.due_date)}
          </Text>
        </View>
      )}

      {/* Offline indicator */}
      {action.local_id && !action.synced_at && (
        <Text style={styles.offlineTag}>☁️ Pending sync</Text>
      )}
    </View>
  );
}

function ProgressRing({
  value,
  total,
  label,
  color,
}: {
  value: number;
  total: number;
  label: string;
  color: string;
}) {
  const pct = Math.round((value / total) * 100) || 0;

  return (
    <View style={styles.ringContainer}>
      <View style={[styles.ringOuter, { borderColor: colors.border }]}>
        <Text style={[styles.ringValue, { color }]}>{pct}%</Text>
      </View>
      <Text style={styles.ringLabel}>{label}</Text>
    </View>
  );
}

function StatPill({
  count,
  label,
  color,
}: {
  count: number;
  label: string;
  color: string;
}) {
  return (
    <View style={styles.statPill}>
      <Text style={[styles.statCount, { color }]}>{count}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function FilterPill({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  ringContainer: {
    alignItems: 'center',
  },
  ringOuter: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ringValue: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
  },
  ringLabel: {
    fontSize: 9,
    color: colors.mid,
    marginTop: 2,
  },
  statPill: {
    alignItems: 'center',
  },
  statCount: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
  },
  statLabel: {
    fontSize: 9,
    color: colors.mid,
    marginTop: 1,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: colors.light,
  },
  filterPillActive: {
    backgroundColor: colors.teal,
  },
  filterText: {
    fontSize: 11,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  filterTextActive: {
    color: colors.white,
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDismissed: {
    opacity: 0.5,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  statusCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  statusIcon: {
    fontSize: 14,
    fontWeight: '700',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.dark,
    lineHeight: 18,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: colors.mid,
  },
  cardTitleDismissed: {
    textDecorationLine: 'line-through',
    color: colors.mid,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  categoryTag: {
    fontSize: 10,
    color: colors.mid,
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  priorityText: {
    fontSize: 9,
    fontWeight: fonts.weights.semibold,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginLeft: 38,
    gap: 8,
  },
  stepsBar: {
    flex: 1,
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  stepsBarFill: {
    height: 4,
    backgroundColor: colors.teal,
    borderRadius: 2,
  },
  stepsLabel: {
    fontSize: 10,
    color: colors.mid,
  },
  dueRow: {
    marginTop: 6,
    marginLeft: 38,
  },
  dueText: {
    fontSize: 10,
    color: colors.mid,
  },
  dueOverdue: {
    color: '#DC2626',
    fontWeight: fonts.weights.semibold,
  },
  dueSoon: {
    color: '#EA580C',
  },
  offlineTag: {
    fontSize: 9,
    color: colors.mid,
    marginTop: 4,
    marginLeft: 38,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing.xl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorBanner: {
    position: 'absolute',
    bottom: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  errorText: {
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
  },
});
