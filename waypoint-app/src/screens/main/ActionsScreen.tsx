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

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFamily, useChildren, useDiagnoses } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';
import CompletionCheckIn from '@/components/CompletionCheckIn';
import SwipeableRow, { type SwipeAction } from '@/components/SwipeableRow';
import ActionFormModal, { type ActionFormValues } from '@/components/ActionFormModal';
import { FOLLOWUPS } from '@/lib/adaptiveEngine';
import { trackActionOutcome } from '@/lib/analytics';
import { useI18n } from '@/i18n';
import { SkeletonCard } from '@/components/ui';
import { useTextScale } from '@/lib/textSize';
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
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [activeFilter, setActiveFilter] = useState<ActionStatus | 'all'>('all');
  const [checkInAction, setCheckInAction] = useState<Action | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const statusFilter = activeFilter === 'all'
    ? undefined
    : [activeFilter];

  const {
    actions,
    loading,
    error,
    stats,
    updateStatus,
    createAction,
    refetch,
  } = useActions({
    familyId: family?.id ?? '',
    statusFilter,
  });

  // Unfiltered copy just for dependency locking — a filtered list may not
  // contain the action another one depends on
  const { actions: allActions, refetch: refetchAll } = useActions({ familyId: family?.id ?? '' });
  const completedIds = useMemo(
    () => new Set(allActions.filter((a) => a.status === 'completed').map((a) => a.id)),
    [allActions]
  );
  const titleById = useMemo(
    () => new Map(allActions.map((a) => [a.id, a.title])),
    [allActions]
  );
  const isLocked = useCallback(
    (a: Action) => !!a.depends_on && !completedIds.has(a.depends_on),
    [completedIds]
  );

  // Context for follow-up action generation (completion check-ins)
  const { children } = useChildren(family?.id);
  const primaryChild = children.find((c) => c.is_primary) || children[0];
  const { diagnoses } = useDiagnoses(primaryChild?.id);

  // Refresh when returning from ActionDetail so status/step changes show
  useFocusEffect(
    useCallback(() => {
      if (family?.id) refetch();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [family?.id])
  );

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

  const { locale } = useI18n();
  const esUI = locale === 'es';
  const viUI = locale === 'vi';

  // Focus view: a full plan is 8+ items and reads as a wall. The default
  // "All" view shows the next 3 doable steps (unlocked, not done) and
  // collapses the rest behind one count — one step at a time is the design,
  // not a limitation. Any explicit filter shows everything it matches.
  const [showAll, setShowAll] = useState(false);
  const focusMode = activeFilter === 'all' && !showAll;
  const visibleActions = useMemo(() => {
    if (!focusMode) return sortedActions;
    return sortedActions
      .filter((a) => (a.status === 'not_started' || a.status === 'in_progress') && !isLocked(a))
      .slice(0, 3);
  }, [focusMode, sortedActions, isLocked]);
  const hiddenCount = sortedActions.length - visibleActions.length;

  const handleCycleStatus = (action: Action) => {
    if (isLocked(action) && action.status !== 'completed') {
      const depTitle = action.depends_on ? titleById.get(action.depends_on) : undefined;
      showToast(
        depTitle ? `Complete "${depTitle}" first — this step builds on it.` : 'This step unlocks after its previous step.',
        'info'
      );
      return;
    }
    const nextStatus: Record<ActionStatus, ActionStatus> = {
      not_started: 'in_progress',
      in_progress: 'completed',
      completed: 'not_started',
      dismissed: 'not_started',
    };
    const next = nextStatus[action.status];
    updateStatus(action.id, next);
    if (next === 'completed' && family?.id) {
      // Anonymous outcome analytics (fire-and-forget)
      trackActionOutcome(family.id, action.category, 'completed', family.regional_center ?? undefined);
    }
    // Completion check-in: ask how it went; blockers generate the next steps
    if (next === 'completed' && action.follow_up_key && FOLLOWUPS[action.follow_up_key]) {
      setCheckInAction(action);
    }
  };

  /** Direct status set (swipe buttons), with the same check-in + analytics */
  const setStatus = useCallback(
    (action: Action, next: ActionStatus) => {
      updateStatus(action.id, next);
      if (next === 'completed' && family?.id) {
        trackActionOutcome(family.id, action.category, 'completed', family.regional_center ?? undefined);
      }
      if (next === 'completed' && action.follow_up_key && FOLLOWUPS[action.follow_up_key]) {
        setCheckInAction(action);
      }
      const said: Record<ActionStatus, string> = {
        not_started: 'Moved back to To Do',
        in_progress: 'Marked in progress',
        completed: 'Nice — marked done',
        dismissed: 'Cancelled',
      };
      showToast(said[next], 'success');
    },
    [updateStatus, family?.id, family?.regional_center, showToast]
  );

  /** What a swipe reveals depends on where the action currently stands */
  const swipeActionsFor = useCallback(
    (action: Action): SwipeAction[] => {
      switch (action.status) {
        case 'not_started':
          return [
            { label: 'Start', icon: '◐', color: colors.teal, onPress: () => setStatus(action, 'in_progress') },
            { label: 'Done', icon: '✓', color: '#10B981', onPress: () => setStatus(action, 'completed') },
            { label: 'Cancel', icon: '✕', color: '#94A3B8', onPress: () => setStatus(action, 'dismissed') },
          ];
        case 'in_progress':
          return [
            { label: 'Done', icon: '✓', color: '#10B981', onPress: () => setStatus(action, 'completed') },
            { label: 'To Do', icon: '○', color: '#94A3B8', onPress: () => setStatus(action, 'not_started') },
            { label: 'Cancel', icon: '✕', color: '#CBD5E1', onPress: () => setStatus(action, 'dismissed') },
          ];
        default:
          return [
            { label: 'Reopen', icon: '↺', color: colors.teal, onPress: () => setStatus(action, 'not_started') },
          ];
      }
    },
    [setStatus]
  );

  const handleCreate = useCallback(
    async (values: ActionFormValues): Promise<boolean> => {
      const created = await createAction({
        title: values.title,
        description: values.description ?? undefined,
        category: values.category,
        priority: values.priority,
        due_date: values.due_date ?? undefined,
        script: values.script ?? undefined,
        steps: values.steps ?? undefined,
        child_id: primaryChild?.id,
        source: 'manual',
      });
      showToast(created ? 'Added to your plan' : "Couldn't add that — please try again.", created ? 'success' : 'error');
      if (created) refetchAll();
      return !!created;
    },
    [createAction, primaryChild?.id, showToast, refetchAll]
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.headerTitle}>Action Plan</Text>
          <Text style={styles.headerSubtitle}>Your personalized next steps</Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowCreate(true)}
          accessibilityRole="button"
          accessibilityLabel="Add your own action"
        >
          <Text style={styles.addButtonText}>＋</Text>
        </TouchableOpacity>
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
        data={visibleActions}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          focusMode && visibleActions.length > 0 ? (
            <Text style={styles.focusHint}>
              {esUI
                ? `Empiece aquí — ${visibleActions.length === 1 ? 'su siguiente paso' : `sus siguientes ${visibleActions.length} pasos`}. Uno a la vez es el plan.`
                : viUI
                  ? `Bắt đầu ở đây — ${visibleActions.length === 1 ? 'bước tiếp theo của quý vị' : `${visibleActions.length} bước tiếp theo`}. Từng bước một chính là kế hoạch.`
                  : `Start here — your next ${visibleActions.length === 1 ? 'step' : `${visibleActions.length} steps`}. One at a time is the plan.`}
            </Text>
          ) : null
        }
        ListFooterComponent={
          activeFilter === 'all' && sortedActions.length > 3 ? (
            <TouchableOpacity
              style={styles.focusToggle}
              onPress={() => setShowAll((v) => !v)}
              accessibilityRole="button"
              accessibilityLabel={focusMode ? `Show all ${sortedActions.length} steps` : 'Focus on the next steps'}
            >
              <Text style={styles.focusToggleText}>
                {focusMode
                  ? esUI ? `Ver todo (${hiddenCount} más) ↓` : viUI ? `Xem tất cả (${hiddenCount} mục nữa) ↓` : `Show everything (${hiddenCount} more) ↓`
                  : esUI ? 'Enfocar mis siguientes 3 ↑' : viUI ? 'Tập trung 3 bước tiếp theo ↑' : 'Focus on my next 3 ↑'}
              </Text>
            </TouchableOpacity>
          ) : null
        }
        renderItem={({ item }) => (
          <SwipeableRow actions={swipeActionsFor(item)} enabled={!isLocked(item)} style={styles.swipeRow}>
            <ActionCard
              action={item}
              locked={isLocked(item)}
              onStatusPress={() => handleCycleStatus(item)}
              onOpenDetail={() => (navigation as any).navigate('ActionDetail', { actionId: item.id })}
            />
          </SwipeableRow>
        )}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={refetch} tintColor={colors.teal} />
        }
        ListEmptyComponent={
          loading ? (
            <View>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </View>
          ) : (
            <EmptyState
              emoji="📋"
              title="No actions yet"
              subtitle="Ask the AI Navigator a question and save the steps it suggests — or tap ＋ above to write your own."
              actionLabel="Ask AI Navigator"
              onAction={() => (navigation as any).navigate('Navigator')}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      {error && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            onPress={() => { refetch(); refetchAll(); }}
            style={styles.errorRetry}
            accessibilityRole="button"
            accessibilityLabel="Try loading your action plan again"
          >
            <Text style={styles.errorRetryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Completion check-in — shown after completing an action with follow_up_key */}
      <CompletionCheckIn
        action={checkInAction}
        familyId={family?.id ?? ''}
        ctx={{
          childName: primaryChild?.first_name,
          parentName: family?.parent_first_name,
          regionalCenterName: family?.regional_center,
          diagnoses: diagnoses.map((d) => d.name),
        }}
        onClose={() => setCheckInAction(null)}
        onActionsAdded={() => {
          refetch();
          refetchAll();
        }}
      />

      {/* Write your own action — no AI chat required */}
      <ActionFormModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={handleCreate}
      />
    </SafeAreaView>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function ActionCard({
  action,
  locked,
  onStatusPress,
  onOpenDetail,
}: {
  action: Action;
  locked?: boolean;
  onStatusPress: () => void;
  onOpenDetail: () => void;
}) {
  const { scale } = useTextScale();
  const statusConfig = STATUS_CONFIG[action.status];
  const priorityConfig = PRIORITY_CONFIG[action.priority];
  const categoryConfig = CATEGORY_CONFIG[action.category];
  const isOverdue = action.due_date && new Date(action.due_date) < new Date() && action.status !== 'completed';
  const isDueSoon = action.due_date && !isOverdue && daysUntil(action.due_date) <= (action.deadline_warning_days || 7);

  const stepsDone = action.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = action.steps?.length ?? 0;

  return (
    <View
      style={[
        styles.card,
        action.status === 'dismissed' && styles.cardDismissed,
        locked && styles.cardLocked,
      ]}
    >
      <View style={styles.cardTop}>
        {/* Status toggle button (padlock while a dependency is incomplete) */}
        <TouchableOpacity
          style={[styles.statusCircle, { borderColor: locked ? colors.border : statusConfig.color }]}
          onPress={onStatusPress}
          accessibilityRole="button"
          accessibilityLabel={
            locked ? 'Locked — complete the previous step first' : `Change status from ${statusConfig.label}`
          }
        >
          {locked ? (
            <Ionicons name="lock-closed" size={13} color={colors.mid} />
          ) : (
            <Text style={[styles.statusIcon, { color: statusConfig.color }]}>
              {statusConfig.emoji}
            </Text>
          )}
        </TouchableOpacity>

        {/* Title + meta — tap to open full detail (scripts, steps, documents) */}
        <TouchableOpacity
          style={styles.cardContent}
          onPress={onOpenDetail}
          accessibilityRole="button"
          accessibilityLabel={`Open details for ${action.title}`}
        >
          <Text
            style={[
              styles.cardTitle,
              action.status === 'completed' && styles.cardTitleDone,
              action.status === 'dismissed' && styles.cardTitleDismissed,
              { fontSize: Math.round(15 * scale), lineHeight: Math.round(20 * scale) },
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
            {action.google_event_id && (
              <Text
                style={styles.calendarBadge}
                accessibilityLabel="On your Google Calendar"
              >
                🗓️
              </Text>
            )}
            <Text style={styles.detailHint}>Details ›</Text>
          </View>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTextCol: { flex: 1 },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 20, color: colors.white, fontWeight: '700', lineHeight: 24 },
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
  focusHint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  focusToggle: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  focusToggleText: { color: colors.teal, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  swipeRow: { marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  cardDismissed: {
    opacity: 0.5,
  },
  cardLocked: {
    opacity: 0.65,
  },
  calendarBadge: {
    fontSize: 11,
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
  detailHint: {
    fontSize: 11,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
    marginLeft: 'auto',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  errorText: {
    flex: 1,
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
  },
  errorRetry: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radii.sm,
    backgroundColor: colors.white,
    minHeight: 32,
    justifyContent: 'center',
  },
  errorRetryText: {
    fontSize: fonts.sizes.xs,
    color: '#991B1B',
    fontWeight: fonts.weights.semibold as '600',
  },
});
