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
 *
 * The tracker body is a single component, `ActionPlanBody`, exported two ways:
 * `ActionsScreen` (the Tracker tab root, its own scroll + header) and
 * `ActionPlanTracker` (embedded in the Plan tab's "Action Plan" segment). One
 * component so the two can never drift — the owner's condition for showing the
 * "same" plan in both places (Sep 1 2026).
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
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
import { brand, fonts, spacing, radii } from '@/lib/theme';
import { isNewlyAdded, formatAddedOn, newBadgeLabel } from '@/lib/actionFreshness';
import StatusControl from '@/components/StatusControl';
import PriorityControl from '@/components/PriorityControl';
import ActionFilterSheet from '@/components/ActionFilterSheet';
import {
  PRIORITY_META,
  priorityLabel,
  statusLabel,
  type ActionLocale,
} from '@/lib/actionMeta';
import {
  SORT_KEYS,
  NO_FILTERS,
  activeFilterCount,
  daysFromToday,
  filterActions,
  sortActions,
  sortLabel,
  sortUiLabel,
  type ActionFilters,
  type ActionSortKey,
} from '@/lib/actionSort';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

// ─── Constants ──────────────────────────────────────────────────────────────

// Status and priority labels/colours now come from `@/lib/actionMeta`, the one
// table both screens and the edit sheet read. They used to live here as well,
// and had already drifted: this file said `Med` where the detail screen said
// `Medium`, and `To Do`/`Done` where the detail screen said
// `Not Started`/`Completed` — the same action, two vocabularies.

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

/**
 * How many just-added steps the focus view will surface on top of its next 3.
 * Without a cap the "focus" view stops being one — see visibleActions below.
 */
const MAX_FRESH_IN_FOCUS = 2;

/**
 * The meta row's controls are deliberately small — a 44pt pill next to a 44pt
 * chevron would read as a button bar rather than as a line of metadata — so
 * they reach MIN_TOUCH_TARGET through hitSlop instead of through height.
 * (26pt pill + 9 top + 9 bottom = 44; 32pt chevron + 6 + 6 = 44.)
 */
const PRIORITY_HIT_SLOP = { top: 9, bottom: 9, left: 6, right: 6 } as const;
const DETAIL_HIT_SLOP = { top: 6, bottom: 6, left: 8, right: 8 } as const;

// ─── Tracker body (Tracker tab root + Plan tab's Action Plan segment) ────────

/** The Tracker tab root: the full tracker with its own scroll + header. */
export default function ActionsScreen() {
  return <ActionPlanBody />;
}

/**
 * The very same tracker, embedded in the Plan tab's "Action Plan" segment — no
 * SafeAreaView, no scroll of its own (the Plan screen provides both), and its
 * "open detail" tap routed through the Tracker stack, where ActionDetail lives.
 */
export function ActionPlanTracker() {
  return <ActionPlanBody embedded />;
}

function ActionPlanBody({ embedded = false }: { embedded?: boolean }) {
  const { family } = useFamily();
  const navigation = useNavigation();
  const { showToast } = useToast();
  const [activeFilter, setActiveFilter] = useState<ActionStatus | 'all'>('all');
  const [checkInAction, setCheckInAction] = useState<Action | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [sortKey, setSortKey] = useState<ActionSortKey>('smart');
  const [filters, setFilters] = useState<ActionFilters>(NO_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  // MEMOIZED, and it has to stay that way. A fresh `[activeFilter]` literal on
  // every render lands in `useActions`'s fetch dependencies, whose effect calls
  // `setActions`, which re-renders this component, which builds another fresh
  // array. Measured against the real hook: 2 queries unfiltered, **54,554 in
  // one second** with a status filter selected. See the comment on `statusKey`
  // in useActions.ts — the hook now defends itself too, but a stable value here
  // is the honest thing to hand it.
  const statusFilter = useMemo(
    () => (activeFilter === 'all' ? undefined : [activeFilter]),
    [activeFilter]
  );

  const {
    actions,
    loading,
    error,
    stats,
    updateStatus,
    updateAction,
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

  const { locale } = useI18n();
  const esUI = locale === 'es';
  const viUI = locale === 'vi';
  const uiLocale: ActionLocale = esUI ? 'es' : viUI ? 'vi' : 'en';

  // One clock for the whole render, so every row's "new" and "added" line
  // agree with each other, and so the deadline filters ask "overdue as of
  // when?" exactly once (and so a test can pin the moment).
  // `actions` is the intended trigger even though the body does not read it:
  // the clock should re-read when the list refetches, not on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = useMemo(() => Date.now(), [actions]);

  const filterCount = activeFilterCount(filters);

  // Narrow first, then order. Both return the SAME action objects in a new
  // array — the focus view below matches by object identity, so a stage that
  // cloned would silently break the just-saved carve-out.
  const sortedActions = useMemo(
    () => sortActions(filterActions(actions, filters, now), sortKey),
    [actions, filters, now, sortKey]
  );

  // Focus view: a full plan is 8+ items and reads as a wall. The default
  // "All" view shows the next 3 doable steps (unlocked, not done) and
  // collapses the rest behind one count — one step at a time is the design,
  // not a limitation. Any explicit filter shows everything it matches.
  const [showAll, setShowAll] = useState(false);
  // A parent who has just asked for "everything overdue, oldest first" has
  // asked a question the next-3 view cannot answer — three of the matches, in
  // an order they did not choose, reads as the sort being broken. So an
  // explicit sort or filter turns the focus view off; clearing them brings it
  // back.
  const narrowing = sortKey !== 'smart' || filterCount > 0;
  const focusMode = activeFilter === 'all' && !showAll && !narrowing;

  /**
   * What the focus view WOULD show — computed whether or not it is showing.
   *
   * The toggle used to ask two different questions: `hiddenCount > 0` while
   * collapsed, `sortedActions.length > 3` while expanded. Those are not each
   * other's inverse, so a plan of 3 (2 open, 1 done) offered "Show everything
   * (1 more)", and once tapped the toggle evaluated `3 > 3` and vanished —
   * a one-way door out of the focus view, for the rest of the session.
   * One list, one predicate.
   */
  const focusActions = useMemo(() => {
    const open = sortedActions.filter(
      (a) => a.status === 'not_started' || a.status === 'in_progress'
    );
    const next3 = open.filter((a) => !isLocked(a)).slice(0, 3);
    // Anything saved in the last day is surfaced even when the focus view
    // would have collapsed it: a parent who just saved three steps out of an
    // answer has to SEE them, and "your new items are behind 'Show
    // everything'" is the failure this change is about.
    //
    // CAPPED, and locked steps excluded (adversary findings, Sep 2 2026). An
    // uncapped carve-out made the focus view unbounded for exactly the user it
    // exists for: onboarding inserts SEVEN generated actions in one batch, so
    // a brand-new account spent its first day looking at the whole wall the
    // next-3 view is meant to prevent — with a "Show everything (0 more)"
    // button that did nothing. And a locked step is one the parent cannot act
    // on yet, which the focus view has never shown.
    const fresh = open
      .filter((a) => isNewlyAdded(a.created_at, now) && !isLocked(a) && !next3.includes(a))
      .slice(0, MAX_FRESH_IN_FOCUS);
    if (fresh.length === 0) return next3;
    const keep = new Set([...next3, ...fresh]);
    return sortedActions.filter((a) => keep.has(a));
  }, [sortedActions, isLocked, now]);

  const visibleActions = focusMode ? focusActions : sortedActions;
  /** How many the focus view is holding back — 0 when it is not collapsing. */
  const hiddenCount = sortedActions.length - visibleActions.length;
  /** Is there anything for the toggle to toggle? The one predicate it uses. */
  const collapsible = sortedActions.length > focusActions.length;

  /** Open an action's full detail. Standalone the Tracker stack owns
   *  ActionDetail; embedded in Plan (the Calendar stack) it doesn't, so the
   *  tap has to hop to the Tracker tab — the same route Plan's own rows use. */
  const openDetail = useCallback(
    (actionId: string) => {
      if (embedded) {
        (navigation as any).navigate('Tracker', {
          screen: 'ActionDetail',
          params: { actionId },
          initial: false,
        });
      } else {
        (navigation as any).navigate('ActionDetail', { actionId });
      }
    },
    [embedded, navigation]
  );

  /**
   * "You can't start this one yet." Returns true when the step is gated behind
   * an unfinished dependency, having already told the parent why.
   *
   * Extracted so EVERY write path consults it. The card's control checked the
   * lock and the swipe buttons did not, so a step the tracker drew with a
   * padlock could still be swiped to Done — and once the control is a
   * one-tap segmented bar rather than a fiddly 28pt circle, that gap is far
   * easier to fall into.
   */
  const blockedByDependency = useCallback(
    (action: Action, next: ActionStatus): boolean => {
      if (next === 'not_started' || next === 'dismissed') return false;
      if (!isLocked(action)) return false;
      const depTitle = action.depends_on ? titleById.get(action.depends_on) : undefined;
      showToast(
        depTitle
          ? `Complete "${depTitle}" first — this step builds on it.`
          : 'This step unlocks after its previous step.',
        'info'
      );
      return true;
    },
    [isLocked, titleById, showToast]
  );

  /** Direct status set (card control + swipe buttons), with check-in + analytics */
  const setStatus = useCallback(
    (action: Action, next: ActionStatus) => {
      if (next === action.status) return;
      if (blockedByDependency(action, next)) return;
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
    [updateStatus, family?.id, family?.regional_center, showToast, blockedByDependency]
  );

  /**
   * Change a step's priority straight from the list — no Edit sheet.
   * `updateAction` writes optimistically and rolls back on failure, so the
   * chip re-selects instantly and reverts if the write does not land.
   */
  const setPriority = useCallback(
    (action: Action, next: ActionPriority) => {
      if (next === action.priority) return;
      updateAction(action.id, { priority: next });
      showToast(`Priority set to ${priorityLabel(next, uiLocale)}`, 'success');
    },
    [updateAction, showToast, uiLocale]
  );

  /** What a swipe reveals depends on where the action currently stands */
  const swipeActionsFor = useCallback(
    (action: Action): SwipeAction[] => {
      // Spoken labels name the step. The visible ones are bare verbs, so a
      // list of eight rows offered eight identically-labelled "Done" buttons
      // — and now that the status filters are labelled too, "Done" alone is
      // ambiguous in the accessibility tree as well as unhelpful in it.
      const say = (verb: string) => `${verb}: ${action.title}`;
      switch (action.status) {
        case 'not_started':
          return [
            { label: 'Start', icon: '◐', color: brand.pine, accessibilityLabel: say('Start'), onPress: () => setStatus(action, 'in_progress') },
            { label: 'Done', icon: '✓', color: '#10B981', accessibilityLabel: say('Mark done'), onPress: () => setStatus(action, 'completed') },
            { label: 'Cancel', icon: '✕', color: '#94A3B8', accessibilityLabel: say('Take off my plan'), onPress: () => setStatus(action, 'dismissed') },
          ];
        case 'in_progress':
          return [
            { label: 'Done', icon: '✓', color: '#10B981', accessibilityLabel: say('Mark done'), onPress: () => setStatus(action, 'completed') },
            { label: 'To Do', icon: '○', color: '#94A3B8', accessibilityLabel: say('Move back to To Do'), onPress: () => setStatus(action, 'not_started') },
            { label: 'Cancel', icon: '✕', color: '#CBD5E1', accessibilityLabel: say('Take off my plan'), onPress: () => setStatus(action, 'dismissed') },
          ];
        default:
          return [
            { label: 'Reopen', icon: '↺', color: brand.pine, accessibilityLabel: say('Reopen'), onPress: () => setStatus(action, 'not_started') },
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

  // ── Pinned chrome: header, progress dashboard, status filters ──
  const header = embedded ? (
    <View style={styles.headerEmbedded}>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => setShowCreate(true)}
        accessibilityRole="button"
        accessibilityLabel="Add your own action"
      >
        <Text style={styles.addButtonText}>＋</Text>
      </TouchableOpacity>
    </View>
  ) : (
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
  );

  const dashboard = stats ? (
    <View style={styles.statsRow}>
      <ProgressRing value={stats.completion_rate ?? 0} total={100} label="Complete" color={brand.sage} />
      <StatPill count={stats.not_started_count} label="To Do" color="#94A3B8" />
      <StatPill count={stats.in_progress_count} label="Active" color={brand.pine} />
      <StatPill count={stats.completed_count} label="Done" color={brand.sage} />
    </View>
  ) : null;

  const chrome = (
    <View style={styles.chromeBand}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.statusScroller}
      >
        <FilterPill
          label={allLabel(uiLocale)}
          active={activeFilter === 'all'}
          onPress={() => setActiveFilter('all')}
        />
        {STATUS_FILTERS.map((status) => (
          <FilterPill
            key={status}
            label={statusLabel(status, uiLocale)}
            active={activeFilter === status}
            onPress={() => setActiveFilter(status)}
          />
        ))}
      </ScrollView>

      {/* Sort, then the filters that don't fit inline. The row scrolls
          horizontally because five sort names in Spanish do not fit a narrow
          phone, and a wrapped row would push the first card off the screen. */}
      <View style={styles.sortRow}>
        <Text style={styles.sortCaption}>{sortUiLabel('sort', uiLocale)}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sortScroller}
          contentContainerStyle={styles.sortPills}
        >
          {SORT_KEYS.map((key) => (
            <FilterPill
              key={key}
              label={sortLabel(key, uiLocale)}
              active={sortKey === key}
              onPress={() => setSortKey(key)}
              accessibilityLabel={`${sortUiLabel('sort', uiLocale)}: ${sortLabel(key, uiLocale)}`}
            />
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.filterButton, filterCount > 0 && styles.filterButtonActive]}
          onPress={() => setShowFilters(true)}
          accessibilityRole="button"
          accessibilityLabel={
            filterCount > 0
              ? `${sortUiLabel('filters', uiLocale)} — ${filterCount}`
              : sortUiLabel('filters', uiLocale)
          }
        >
          <Ionicons
            name="options-outline"
            size={15}
            color={filterCount > 0 ? '#FFFFFF' : brand.inkSoft}
          />
          {/* The word, not just the glyph. An icon-only control here is a
              mystery button — and this one is the only way to reach the
              priority, deadline and date-added filters at all. */}
          <Text
            style={[styles.filterButtonText, filterCount > 0 && styles.filterButtonTextActive]}
          >
            {filterCount > 0
              ? `${sortUiLabel('filters', uiLocale)} ${filterCount}`
              : sortUiLabel('filters', uiLocale)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── The list, as inline elements so it composes in either scroll parent ──
  const list = (
    <>
      {focusMode && visibleActions.length > 0 ? (
        <Text style={styles.focusHint}>
          {esUI
            ? `Empiece aquí — ${visibleActions.length === 1 ? 'su siguiente paso' : `sus siguientes ${visibleActions.length} pasos`}. Uno a la vez es el plan.`
            : viUI
              ? `Bắt đầu ở đây — ${visibleActions.length === 1 ? 'bước tiếp theo của quý vị' : `${visibleActions.length} bước tiếp theo`}. Từng bước một chính là kế hoạch.`
              : `Start here — your next ${visibleActions.length === 1 ? 'step' : `${visibleActions.length} steps`}. One at a time is the plan.`}
        </Text>
      ) : null}

      {visibleActions.length === 0 ? (
        loading ? (
          <View>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </View>
        ) : collapsible ? (
          // Every open step is done, dismissed or still locked — so the focus
          // view has nothing to show, but the plan is not empty. Sending a
          // parent who has just finished everything to "ask the Navigator and
          // save some steps" is the worst copy on the screen, and it sat
          // directly above a "Show everything (5 more)" button.
          <EmptyState
            emoji="✅"
            title="Nothing open right now"
            subtitle="Every step in view is done or waiting on another one."
            actionLabel="See my whole plan"
            onAction={() => setShowAll(true)}
          />
        ) : filterCount > 0 ? (
          // A filter that matched nothing is not an empty plan. Sending a
          // parent who has 27 steps to "Ask the Navigator and save some" —
          // because they asked to see only what is overdue — reads as the app
          // having lost their work.
          <EmptyState
            emoji="🔍"
            title="No steps match these filters"
            subtitle="Try widening the deadline or priority you picked."
            actionLabel="Clear filters"
            onAction={() => setFilters(NO_FILTERS)}
          />
        ) : (
          <EmptyState
            emoji="📋"
            title="No actions yet"
            subtitle="Ask the Waypoint Navigator a question and save the steps it suggests — or tap ＋ above to write your own."
            actionLabel="Ask Waypoint Navigator"
            onAction={() => (navigation as any).navigate('Navigator')}
          />
        )
      ) : (
        visibleActions.map((item) => (
          <SwipeableRow
            key={item.id}
            actions={swipeActionsFor(item)}
            enabled={!isLocked(item)}
            style={styles.swipeRow}
          >
            <ActionCard
              action={item}
              locked={isLocked(item)}
              now={now}
              locale={uiLocale}
              onSetStatus={(next) => setStatus(item, next)}
              onSetPriority={(next) => setPriority(item, next)}
              onOpenDetail={() => openDetail(item.id)}
            />
          </SwipeableRow>
        ))
      )}

      {/* Keyed on what is actually hidden, not on the list length: with the
          fresh-item carve-out above, a list longer than 3 can still be fully
          visible, and the toggle then read "Show everything (0 more)".
          Hidden entirely while a sort or filter is narrowing the list — the
          parent asked for a specific view, and "Focus on my next 3" would
          throw it away. */}
      {activeFilter === 'all' && !narrowing && collapsible ? (
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
      ) : null}
    </>
  );

  const errorContent = (
    <>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        onPress={() => { refetch(); refetchAll(); }}
        style={styles.errorRetry}
        accessibilityRole="button"
        accessibilityLabel="Try loading your action plan again"
      >
        <Text style={styles.errorRetryText}>Retry</Text>
      </TouchableOpacity>
    </>
  );

  const modals = (
    <>
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

      {/* Narrow the plan by priority, deadline, or when a step was added */}
      <ActionFilterSheet
        visible={showFilters}
        filters={filters}
        onChange={setFilters}
        onClose={() => setShowFilters(false)}
        locale={uiLocale}
        // What the list will ACTUALLY render on close. `sortedActions.length`
        // ignored the focus view, so with no filters set the button read
        // "Show 8 steps" and closing it rendered 3.
        matchCount={visibleActions.length}
      />
    </>
  );

  // Embedded: the Plan screen owns the scroll and the pull-to-refresh, so this
  // renders flat. It breaks out of Plan's page padding so the chrome bands go
  // edge-to-edge exactly as they do on the Tracker tab.
  if (embedded) {
    return (
      <View style={styles.embeddedBreakout}>
        {header}
        {dashboard}
        {chrome}
        <View style={styles.listContent}>{list}</View>
        {error ? <View style={styles.errorBannerInline}>{errorContent}</View> : null}
        {modals}
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {header}
      {dashboard}
      {chrome}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} tintColor={brand.pine} />}
        showsVerticalScrollIndicator={false}
      >
        {list}
      </ScrollView>

      {error && <View style={styles.errorBanner}>{errorContent}</View>}

      {modals}
    </SafeAreaView>
  );
}

// ─── Components ─────────────────────────────────────────────────────────────

function ActionCard({
  action,
  locked,
  now,
  locale = 'en',
  onSetStatus,
  onSetPriority,
  onOpenDetail,
}: {
  action: Action;
  locked?: boolean;
  /** One clock for the whole list, so rows can't disagree about "today". */
  now?: number;
  locale?: ActionLocale;
  onSetStatus: (next: ActionStatus) => void;
  onSetPriority: (next: ActionPriority) => void;
  onOpenDetail: () => void;
}) {
  const { scale } = useTextScale();
  const stamp = now ?? Date.now();
  const isNew = isNewlyAdded(action.created_at, stamp);
  const addedLabel = formatAddedOn(action.created_at, stamp, locale);
  const priorityMeta = PRIORITY_META[action.priority];
  const categoryConfig = CATEGORY_CONFIG[action.category];
  // Through the SAME local-day helper the deadline filters use. This line was
  // `new Date(action.due_date) < new Date()`, which parses a Postgres `date`
  // as UTC midnight — 17:00 the previous evening in California. Harmless while
  // it was the only opinion on the screen; not once an Overdue FILTER shipped
  // beside it, because then a card badged "⚠️ Overdue" disappeared when the
  // parent tapped Filters → Overdue and the plan said "No steps match".
  const dueInDays = daysFromToday(action.due_date, stamp);
  const isOverdue = dueInDays !== null && dueInDays < 0 && action.status !== 'completed';
  const isDueSoon =
    dueInDays !== null && !isOverdue && dueInDays <= (action.deadline_warning_days || 7);

  const stepsDone = action.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = action.steps?.length ?? 0;

  // The priority chips are collapsed by default. A permanent four-chip row on
  // every card doubles the chrome of a list whose whole point is "one step at
  // a time" — and the focus view shows up to five cards at once.
  const [editingPriority, setEditingPriority] = useState(false);

  return (
    <View
      style={[
        styles.card,
        action.status === 'dismissed' && styles.cardDismissed,
        locked && styles.cardLocked,
      ]}
    >
      {/* Status, first and full width. It was a 28pt circle down the left
          gutter that CYCLED To Do → In Progress → Done, so reaching Done took
          two taps and nothing said what a tap would do. A dismissed step keeps
          the plain row — reopening it is a swipe, not a mis-tap away. */}
      {/* A dismissed step keeps no segmented control — reopening is a swipe, so
          it cannot be a mis-tap — but it must still SAY it is dismissed. The
          only cues left were opacity and a strikethrough: both invisible to a
          screen reader, and the strikethrough is shared with "done". */}
      {action.status === 'dismissed' && (
        <Text style={styles.dismissedTag}>
          {statusLabel('dismissed', locale)}
          {action.dismissed_reason ? ` — ${action.dismissed_reason}` : ''}
        </Text>
      )}

      {action.status !== 'dismissed' && (
        <View style={styles.statusBar}>
          <StatusControl
            status={action.status}
            locked={locked}
            locale={locale}
            onChange={onSetStatus}
            accessibilityPrefix={action.title}
          />
        </View>
      )}

      <View style={styles.cardTop}>
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

          {/* Just added — so a step saved out of an answer is findable in a
              list that sorts by priority, not by when it arrived. */}
          {isNew && action.status !== 'completed' && action.status !== 'dismissed' && (
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>{newBadgeLabel(locale)}</Text>
            </View>
          )}

        </TouchableOpacity>
      </View>

      {/* The meta row sits OUTSIDE the open-detail press target on purpose.
          It used to live inside it, and a tappable priority badge nested in a
          touchable that navigates is the shape that opens the detail screen
          instead of changing the priority — on react-native-web the outer
          handler fires either way. */}
      <View style={styles.cardMeta}>
        <Text style={styles.categoryTag}>
          {categoryConfig.emoji} {categoryConfig.label}
        </Text>
        <TouchableOpacity
          style={[
            styles.priorityBadge,
            { backgroundColor: priorityMeta.bg, borderColor: priorityMeta.color },
            editingPriority && styles.priorityBadgeOpen,
          ]}
          onPress={() => setEditingPriority((v) => !v)}
          hitSlop={PRIORITY_HIT_SLOP}
          accessibilityRole="button"
          accessibilityState={{ expanded: editingPriority }}
          aria-expanded={editingPriority}
          accessibilityLabel={`${action.title}: priority ${priorityLabel(
            action.priority,
            locale
          )}. Tap to change.`}
        >
          <Text style={[styles.priorityText, { color: priorityMeta.color }]}>
            {priorityLabel(action.priority, locale, true)} {editingPriority ? '▴' : '▾'}
          </Text>
        </TouchableOpacity>
        {action.google_event_id && (
          <Text style={styles.calendarBadge} accessibilityLabel="On your Google Calendar">
            🗓️
          </Text>
        )}
        <TouchableOpacity
          style={styles.detailHintHit}
          hitSlop={DETAIL_HIT_SLOP}
          onPress={onOpenDetail}
          accessibilityRole="button"
          accessibilityLabel={`${action.title}: scripts, steps and documents`}
        >
          <Text style={styles.detailHint}>Details ›</Text>
        </TouchableOpacity>
      </View>

      {/* Priority chips, expanded in place. NOT a popover: every row is
          wrapped in SwipeableRow, which is overflow:'hidden' with no portal
          to escape through, so anything floating out of a card is clipped. */}
      {editingPriority && (
        <View style={styles.priorityEditor}>
          <PriorityControl
            priority={action.priority}
            locale={locale}
            onChange={(next) => {
              setEditingPriority(false);
              onSetPriority(next);
            }}
            accessibilityPrefix={action.title}
          />
        </View>
      )}

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

      {/* When it landed in the plan. Restored here after the Plan tab's own
          action row (which carried it) was replaced by this shared tracker. */}
      {addedLabel ? <Text style={styles.addedText}>{addedLabel}</Text> : null}

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
      <View style={[styles.ringOuter, { borderColor: brand.border }]}>
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

/**
 * One pill in the status or sort row.
 *
 * It carried no role, no label and no selected state — so a screen reader
 * heard five unlabelled taps and could not tell which view was showing.
 */
function FilterPill({
  label,
  active,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      aria-pressed={active}
      accessibilityLabel={accessibilityLabel ?? label}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/** "All" for the status row, in the parent's language. */
function allLabel(locale: ActionLocale): string {
  if (locale === 'es') return 'Todo';
  if (locale === 'vi') return 'Tất cả';
  return 'All';
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  // Embedded in the Plan screen: cancel Plan's page padding so the chrome
  // bands run edge-to-edge like the Tracker tab. Plan's `scroll` padding is
  // spacing.lg; this pulls back by the same amount.
  embeddedBreakout: {
    marginHorizontal: -spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: brand.panel,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
  },
  // Embedded, the Plan header + segment already name the screen; all this
  // needs to carry is the "add your own step" affordance.
  headerEmbedded: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  headerTextCol: { flex: 1 },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: brand.pine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: 20, color: '#FFFFFF', fontWeight: '700', lineHeight: 24 },
  headerTitle: {
    fontSize: fonts.sizes.xl,
    fontWeight: fonts.weights.bold,
    color: brand.ink,
  },
  headerSubtitle: {
    fontSize: fonts.sizes.xs,
    color: brand.inkFaint,
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: brand.panel,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
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
    color: brand.inkFaint,
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
    color: brand.inkFaint,
    marginTop: 1,
  },
  // Status pills and the sort row share one band, so the plan has one strip of
  // chrome rather than two competing ones.
  chromeBand: {
    backgroundColor: brand.panel,
    borderBottomWidth: 1,
    borderBottomColor: brand.border,
    paddingBottom: spacing.xs,
  },
  statusScroller: {
    flexGrow: 0,
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 6,
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    gap: 6,
  },
  sortCaption: {
    fontSize: 11,
    color: brand.inkFaint,
    fontWeight: fonts.weights.semibold,
  },
  // flex:1 on the SCROLLER, not its content: without it the row lays out at
  // the pills' natural width and the Filters button lands on top of the last
  // one instead of the pills scrolling under it.
  sortScroller: {
    flex: 1,
    // A gutter before the pinned Filters button. Without it the scroller's
    // clip edge sits flush against the button and a half-visible "Oldest"
    // reads as a rendering bug rather than as "scroll for more".
    marginRight: spacing.sm,
  },
  sortPills: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
    paddingRight: spacing.xs,
  },
  filterButton: {
    flexShrink: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    minWidth: MIN_TOUCH_TARGET,
    minHeight: 34,
    paddingHorizontal: 10,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.paper,
  },
  filterButtonActive: {
    backgroundColor: brand.pine,
    borderColor: brand.pine,
  },
  filterButtonText: {
    fontSize: 11,
    color: brand.inkSoft,
    fontWeight: fonts.weights.bold,
  },
  filterButtonTextActive: {
    color: '#FFFFFF',
  },
  // 34pt visible; the surrounding band adds 4pt of padding either side, so the
  // row is 42. Bumped to 44 on the pill itself rather than left to a comment
  // that rounded the band up.
  filterPill: {
    paddingHorizontal: 11,
    minHeight: MIN_TOUCH_TARGET - 8,
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: brand.paper,
  },
  filterPillActive: {
    backgroundColor: brand.pine,
  },
  filterText: {
    fontSize: 12,
    color: brand.inkSoft,
    fontWeight: fonts.weights.medium,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  focusHint: {
    fontSize: fonts.sizes.sm,
    color: brand.inkFaint,
    marginBottom: spacing.md,
    lineHeight: 19,
  },
  focusToggle: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.panel,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  focusToggleText: { color: brand.pine, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.md },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing['2xl'],
  },
  swipeRow: { marginBottom: spacing.sm },
  card: {
    backgroundColor: brand.panel,
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
  },
  // The status control, first in the card and the full width of it.
  statusBar: {
    marginBottom: spacing.sm,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    color: brand.ink,
    lineHeight: 18,
  },
  cardTitleDone: {
    textDecorationLine: 'line-through',
    color: brand.inkFaint,
  },
  cardTitleDismissed: {
    textDecorationLine: 'line-through',
    color: brand.inkFaint,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  categoryTag: {
    fontSize: 10,
    color: brand.inkFaint,
  },
  detailHintHit: {
    marginLeft: 'auto',
    minHeight: 32,
    justifyContent: 'center',
    paddingLeft: spacing.sm,
  },
  detailHint: {
    fontSize: 12,
    color: brand.pine,
    fontWeight: fonts.weights.semibold as '600',
  },
  // The PILL is 26pt so the meta row does not read as a button bar; the TARGET
  // is 44 via hitSlop on the touchable. An earlier version of this comment
  // claimed the padding got there on its own. It did not — the hit area was
  // 26pt, on the only in-place priority control the card has.
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 26,
  },
  priorityBadgeOpen: {
    borderWidth: 1.5,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: fonts.weights.bold,
  },
  priorityEditor: {
    marginTop: spacing.sm,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: 8,
  },
  stepsBar: {
    flex: 1,
    height: 4,
    backgroundColor: brand.border,
    borderRadius: 2,
  },
  stepsBarFill: {
    height: 4,
    backgroundColor: brand.pine,
    borderRadius: 2,
  },
  stepsLabel: {
    fontSize: 10,
    color: brand.inkFaint,
  },
  dueRow: {
    marginTop: 6,
  },
  dueText: {
    fontSize: 10,
    color: brand.inkFaint,
  },
  dueOverdue: {
    color: '#DC2626',
    fontWeight: fonts.weights.semibold,
  },
  dueSoon: {
    color: '#EA580C',
  },
  newBadge: {
    alignSelf: 'flex-start',
    backgroundColor: brand.pineTint,
    borderRadius: radii.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginTop: 4,
  },
  newBadgeText: {
    fontSize: 10,
    lineHeight: 14,
    color: brand.pine,
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.3,
  },
  dismissedTag: {
    fontSize: 11,
    fontWeight: fonts.weights.semibold,
    color: brand.inkFaint,
    marginBottom: 6,
  },
  addedText: {
    fontSize: 11,
    color: brand.inkFaint,
    marginTop: 6,
  },
  offlineTag: {
    fontSize: 9,
    color: brand.inkFaint,
    marginTop: 4,
    fontStyle: 'italic',
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
  // Embedded there is no absolute anchor to hang a banner on — it rides in the
  // flow, just above the plan's footer links.
  errorBannerInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
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
    backgroundColor: brand.panel,
    minHeight: 32,
    justifyContent: 'center',
  },
  errorRetryText: {
    fontSize: fonts.sizes.xs,
    color: '#991B1B',
    fontWeight: fonts.weights.semibold as '600',
  },
});
