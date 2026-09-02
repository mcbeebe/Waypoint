/**
 * Plan (Roadmap/Home-Rebuild-Plan.md phase 3) — Actions and Calendar merged.
 *
 * Tasks and dates were never two questions: a family does not think "is this
 * a to-do or an appointment", they think "what do I owe, what am I owed, and
 * when". So this screen is one list of everything, with the full month one
 * tap away — the owner's condition for merging the two tabs.
 *
 * All of the deciding lives in `lib/planView.ts`, which is pure and tested;
 * this file renders it and routes the taps.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFamily } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { ActionPlanTracker } from '@/screens/main/ActionsScreen';
import { useAppointments } from '@/hooks/useAppointments';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useRequests } from '@/hooks/useRequests';
import { useDeferrals } from '@/hooks/useDeferrals';
import { useNotifications } from '@/hooks/useNotifications';
import { expandOccurrences } from '@/lib/recurrence';
import type { RecurrenceRule } from '@/lib/recurrence';
import {
  buildMonth,
  buildPlan,
  entriesByDay,
  formatDay,
  monthOfNextItem,
} from '@/lib/planView';
import type { PlanEntry, PlanInput } from '@/lib/planView';
import type { CalendarStackParamList } from '@/types/navigation';
import type { AgendaScope } from '@/lib/agenda';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { useTextScale } from '@/lib/textSize';
import PageHeader from '@/components/PageHeader';
import { brand, fonts, radii, semantic, spacing } from '@/lib/theme';

/** Remembered so a parent who prefers the month is not re-choosing daily. */
const PLAN_VIEW_KEY = 'waypoint.plan.view';
/** The same "everything / Waypoint only" preference Home and Calendar use. */
const SCOPE_KEY = 'waypoint_agenda_scope';

type PlanMode = 'list' | 'month' | 'actions';

function labels(locale: FunnelLocale) {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  return {
    title: L('Waypoint Plan', 'Plan de Waypoint', 'Kế hoạch Waypoint'),
    intro: L(
      'Everything you need to do and every date it hangs on — as a list, or as the full month.',
      'Todo lo que debe hacer y cada fecha de la que depende — como lista o como mes completo.',
      'Mọi việc quý vị cần làm và mọi mốc ngày liên quan — dạng danh sách, hoặc cả tháng.'
    ),
    list: L('List', 'Lista', 'Danh sách'),
    month: L('Month', 'Mes', 'Tháng'),
    actions: L('Action Plan', 'Plan de acción', 'Kế hoạch hành động'),
    viewGroup: L('Plan view', 'Vista del plan', 'Chế độ xem'),
    today: L('Today', 'Hoy', 'Hôm nay'),
    prevMonth: L('Previous month', 'Mes anterior', 'Tháng trước'),
    nextMonth: L('Next month', 'Mes siguiente', 'Tháng sau'),
    appointment: L('appointment', 'cita', 'cuộc hẹn'),
    deadline: L('deadline', 'plazo', 'thời hạn'),
    nothingOnDay: L('Nothing on this day.', 'Nada este día.', 'Không có gì ngày này.'),
    tapADay: L(
      'Tap any day to see what is on it. Every source is shown — Waypoint deadlines sit beside your calendar, never instead of it.',
      'Toque cualquier día para ver qué hay. Se muestran todas las fuentes — los plazos de Waypoint van junto a su calendario, nunca en su lugar.',
      'Chạm vào ngày bất kỳ để xem. Mọi nguồn đều hiển thị — thời hạn của Waypoint nằm cạnh lịch của quý vị, không thay thế nó.'
    ),
    fullCalendar: L(
      'Open the full calendar to add or edit',
      'Abrir el calendario completo para agregar o editar',
      'Mở lịch đầy đủ để thêm hoặc sửa'
    ),
    fullActions: L(
      'Open the full action list',
      'Abrir la lista completa de acciones',
      'Mở danh sách hành động đầy đủ'
    ),
    moved: L(
      'Expenses and the tax report are under Tools → Money & benefits, where they were already listed.',
      'Los gastos y el informe de impuestos están en Herramientas → Dinero y beneficios, donde ya aparecían.',
      // The door's own Vietnamese label is "Tiền & trợ cấp" — a signpost
      // naming a door that is not there is worse than no signpost.
      'Chi phí và báo cáo thuế nằm trong Công cụ → Tiền & trợ cấp, nơi chúng đã được liệt kê.'
    ),
    loading: L('Loading your plan…', 'Cargando su plan…', 'Đang tải kế hoạch…'),
    failedTitle: L(
      "Waypoint couldn't load your plan.",
      'Waypoint no pudo cargar su plan.',
      'Waypoint không tải được kế hoạch của quý vị.'
    ),
    failedBody: L(
      'This is a connection problem, not an empty plan. Pull down to try again.',
      'Es un problema de conexión, no un plan vacío. Deslice hacia abajo para reintentar.',
      'Đây là sự cố kết nối, không phải kế hoạch trống. Kéo xuống để thử lại.'
    ),
    itemsOnDay: L('items', 'elementos', 'mục'),
    outsideWindow: L(
      'Waypoint has not loaded appointments for this month yet — pull down to refresh.',
      'Waypoint aún no ha cargado las citas de este mes — deslice para actualizar.',
      'Waypoint chưa tải các cuộc hẹn của tháng này — kéo xuống để làm mới.'
    ),
  };
}

export default function PlanScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<CalendarStackParamList, 'PlanMain'>>();
  const { family } = useFamily();
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const t = labels(funnelLocale);
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  const [mode, setMode] = useState<PlanMode>('list');
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // A caller that names a segment wins over the remembered one — otherwise
  // the Navigator's "Plan" button would land on Month for a parent who last
  // looked at the calendar, and the action plan they were sent to see would
  // be one tap further away than before. The stored preference is not
  // overwritten: the next unparameterised visit returns to it.
  const requestedView = route.params?.view;
  useEffect(() => {
    if (requestedView) {
      setMode(requestedView);
      return;
    }
    AsyncStorage.getItem(PLAN_VIEW_KEY)
      .then((v) => { if (v === 'month' || v === 'list' || v === 'actions') setMode(v); })
      .catch(() => {});
  }, [requestedView]);
  const chooseMode = (next: PlanMode) => {
    setMode(next);
    // A hand-picked segment replaces the routed one, so tapping "List" after
    // arriving on Action Plan is not undone by this screen re-rendering.
    if (requestedView) (navigation as any).setParams({ view: undefined });
    AsyncStorage.setItem(PLAN_VIEW_KEY, next).catch(() => {});
  };

  const {
    actions, loading: actionsLoading, error: actionsError, refetch: refetchActions,
  } = useActions({ familyId: family?.id ?? '' });
  const {
    deadlines, loading: deadlinesLoading, error: deadlinesError, refetch: refetchDeadlines,
  } = useDeadlines({ familyId: family?.id ?? '' });
  const {
    requests, loading: requestsLoading, error: requestsError, refetch: refetchRequests,
  } = useRequests(family?.id);
  const {
    deferrals, titles: deferralTitles, loading: deferralsLoading, refetch: refetchDeferrals,
  } = useDeferrals(family?.id);

  // The month the grid is showing decides what to fetch. A fixed window let
  // the grid page into a month whose appointments were never loaded and then
  // say "Nothing on this day" about a meeting the app has in its database.
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const window = useMemo(() => {
    const anchor = cursor ?? { year: now.getFullYear(), month: now.getMonth() };
    const start = new Date(anchor.year, anchor.month - 2, 1);
    const end = new Date(anchor.year, anchor.month + 3, 0, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [cursor, now]);
  const {
    appointments, loading: appointmentsLoading, error: appointmentsError,
    refetch: refetchAppointments,
  } = useAppointments({ familyId: family?.id ?? '', dateRange: window });

  const loading =
    actionsLoading || deadlinesLoading || requestsLoading || appointmentsLoading || deferralsLoading;
  const dataFailed = !!(actionsError || deadlinesError || requestsError || appointmentsError);

  // "Everything" vs "Waypoint only" — the same preference Home and the
  // calendar screen keep, so a parent sets it once.
  const [scope, setScope] = useState<AgendaScope>('all');
  useEffect(() => {
    AsyncStorage.getItem(SCOPE_KEY)
      .then((v) => { if (v === 'waypoint' || v === 'all') setScope(v); })
      .catch(() => {});
  }, []);

  /**
   * A recurring appointment is stored as one base row; its occurrences are
   * expanded by whoever displays it. Passing the raw rows through put every
   * weekly therapy session's FIRST occurrence in "Past due" forever and left
   * the real sessions off the grid entirely.
   */
  const expanded = useMemo(() => {
    const out: { id: string; title: string; start_time: string; source?: string | null }[] = [];
    for (const a of appointments) {
      const rec = a as unknown as {
        recurrence?: RecurrenceRule | null;
        recurrence_until?: string | null;
        end_time?: string | null;
        source?: string | null;
      };
      const occurrences = expandOccurrences(
        {
          id: a.id,
          start_time: a.start_time,
          end_time: rec.end_time ?? null,
          recurrence: rec.recurrence ?? null,
          recurrence_until: rec.recurrence_until ?? null,
        },
        window.start,
        window.end
      );
      for (const o of occurrences) {
        out.push({
          id: o.occurrenceId,
          title: a.title,
          start_time: o.start_time,
          source: rec.source ?? null,
        });
      }
    }
    return out;
  }, [appointments, window]);

  const input: PlanInput = useMemo(
    () => ({
      now,
      locale: funnelLocale,
      scope,
      actions: actions.map((a) => ({
        id: a.id, title: a.title, status: a.status, priority: a.priority,
        due_date: a.due_date, category: a.category,
      })),
      appointments: expanded,
      deadlines: deadlines.map((d) => ({
        id: d.id, title: d.title, due_date: d.due_date, status: d.status,
      })),
      requests: requests.map((r) => ({
        id: r.id, title: r.title, request_type: r.request_type,
        requested_on: r.requested_on, status: r.status,
      })),
      // Every deferral, titled or not — planView dedupes them against what
      // Plan already lists and drops the ones whose day has come.
      later: Object.entries(deferrals).map(([id, returnsOn]) => ({
        id,
        title: deferralTitles[id] ?? null,
        returnsOn,
      })),
    }),
    [now, funnelLocale, scope, actions, expanded, deadlines, requests, deferrals, deferralTitles]
  );

  const plan = useMemo(() => buildPlan(input), [input]);
  // Opens on the month holding the next item, so a family whose next date is
  // three weeks out does not land on an empty grid.
  const month = useMemo(
    () => cursor ?? monthOfNextItem(input),
    [cursor, input]
  );
  const grid = useMemo(() => buildMonth(input, month.year, month.month), [input, month]);
  const byDay = useMemo(() => entriesByDay(input), [input]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      refetchActions(),
      refetchDeadlines(),
      refetchAppointments(),
      refetchRequests(),
      refetchDeferrals(),
    ]);
  }, [refetchActions, refetchDeadlines, refetchAppointments, refetchRequests, refetchDeferrals]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNow(new Date());
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  // Returning from ActionDetail or the calendar must not leave Plan showing
  // the state the parent just changed. Also re-derives the day, so a phone
  // left open overnight stops calling yesterday "today".
  useFocusEffect(
    useCallback(() => {
      setNow((prev) => {
        const fresh = new Date();
        return prev.toDateString() === fresh.toDateString() ? prev : fresh;
      });
      void refreshAll();
    }, [refreshAll])
  );

  /**
   * Deadline reminders were re-armed by CalendarScreen's mount, and Plan just
   * took its place as the tab's landing screen — so a parent who lives in
   * Plan would silently stop getting reminders for anything added since their
   * last visit to the calendar.
   */
  const notificationsSupported = Platform.OS !== 'web';
  const { hasPermission, scheduleAllReminders } = useNotifications();
  useEffect(() => {
    if (!notificationsSupported || !hasPermission || deadlines.length === 0) return;
    scheduleAllReminders(deadlines.filter((d) => d.status !== 'completed')).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, deadlines, notificationsSupported]);

  const open = (entry: PlanEntry) => {
    if (!entry.target) return;
    const { screen, params, tab } = entry.target;
    if (tab) {
      (navigation as any).navigate(tab, { screen, params, initial: false });
      return;
    }
    (navigation as any).navigate(screen, params);
  };

  const shiftMonth = (delta: number) => {
    const d = new Date(month.year, month.month + delta, 1);
    setCursor({ year: d.getFullYear(), month: d.getMonth() });
    setSelectedDay(null);
  };

  const row = (entry: PlanEntry) => {
    const meta = [entry.dayLabel, entry.time].filter(Boolean).join(' · ');
    const body = (
      <>
        <View style={styles.rowText}>
          <Text style={[styles.rowTitle, { fontSize: sz(14), lineHeight: sz(19) }]}>
            {entry.title}
          </Text>
          {!!meta && (
            <Text style={[styles.rowMeta, { fontSize: sz(12), lineHeight: sz(16) }]}>{meta}</Text>
          )}
        </View>
        <Text style={[styles.rowSource, { fontSize: sz(11.5), lineHeight: sz(16) }]}>
          {entry.source}
        </Text>
      </>
    );
    if (!entry.target) {
      return (
        <View key={entry.id} style={styles.row} accessible accessibilityRole="text">
          {body}
        </View>
      );
    }
    return (
      <Pressable
        key={entry.id}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}
        onPress={() => open(entry)}
        accessibilityRole="button"
        accessibilityLabel={`${entry.title}. ${meta}. ${entry.source}`}
      >
        {body}
      </Pressable>
    );
  };

  const modeLabel = (m: PlanMode) => (m === 'list' ? t.list : m === 'month' ? t.month : t.actions);

  const selectedEntries = selectedDay ? byDay[selectedDay] ?? [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <PageHeader title={t.title} subtitle={t.intro} />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.segment} accessibilityRole="tablist" accessibilityLabel={t.viewGroup}>
          {(['actions', 'list', 'month'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.segmentButton, mode === m && styles.segmentButtonOn]}
              onPress={() => chooseMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={modeLabel(m)}
            >
              <Text
                style={[
                  styles.segmentText,
                  { fontSize: sz(13) },
                  mode === m && styles.segmentTextOn,
                ]}
                numberOfLines={1}
              >
                {modeLabel(m)}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'list' ? (
          <>
            {/* An empty list because a fetch is in flight — or failed — is
                not evidence that the family owes nothing. This is the same
                defect the Home card was fixed for one phase earlier. */}
            {plan.isEmpty && (loading || dataFailed) && (
              <View style={styles.card}>
                <Text style={[styles.emptyTitle, { fontSize: sz(15), lineHeight: sz(21) }]}>
                  {loading ? t.loading : t.failedTitle}
                </Text>
                {!loading && (
                  <Text style={[styles.empty, { fontSize: sz(13.5), lineHeight: sz(20) }]}>
                    {t.failedBody}
                  </Text>
                )}
              </View>
            )}
            {plan.isEmpty && !loading && !dataFailed && (
              <View style={styles.card}>
                <Text style={[styles.empty, { fontSize: sz(13.5), lineHeight: sz(20) }]}>
                  {plan.emptyLine}
                </Text>
              </View>
            )}
            {plan.sections.map((section) => (
              <View key={section.key} style={styles.card}>
                <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>
                  {section.label.toUpperCase()}
                </Text>
                {section.entries.map(row)}
              </View>
            ))}
          </>
        ) : mode === 'month' ? (
          <>
            <View style={styles.card}>
              <View style={styles.monthHead}>
                <Pressable
                  onPress={() => shiftMonth(-1)}
                  style={styles.monthNav}
                  accessibilityRole="button"
                  accessibilityLabel={t.prevMonth}
                >
                  <Text style={[styles.monthNavText, { fontSize: sz(20) }]}>‹</Text>
                </Pressable>
                <Text style={[styles.monthLabel, { fontSize: sz(15) }]}>{grid.label}</Text>
                <Pressable
                  onPress={() => shiftMonth(1)}
                  style={styles.monthNav}
                  accessibilityRole="button"
                  accessibilityLabel={t.nextMonth}
                >
                  <Text style={[styles.monthNavText, { fontSize: sz(20) }]}>›</Text>
                </Pressable>
              </View>

              <View style={styles.grid}>
                {grid.weekdayLabels.map((w, i) => (
                  <Text key={`w${i}`} style={[styles.dow, { fontSize: sz(10.5) }]}>
                    {w}
                  </Text>
                ))}
                {grid.cells.map((cell, i) => {
                  if (cell.day === null) return <View key={`b${i}`} style={styles.dayCell} />;
                  const selected = selectedDay === cell.dateKey;
                  return (
                    <Pressable
                      key={cell.dateKey}
                      style={[
                        styles.dayCell,
                        cell.isToday && styles.dayToday,
                        selected && styles.daySelected,
                      ]}
                      onPress={() => setSelectedDay(selected ? null : cell.dateKey)}
                      accessibilityRole="button"
                      accessibilityLabel={`${formatDay(cell.dateKey!, now, funnelLocale)}${
                        cell.isToday ? `, ${t.today}` : ''
                      }${cell.count ? `, ${cell.count} ${t.itemsOnDay}` : ''}`}
                      accessibilityState={{ selected }}
                    >
                      <Text
                        style={[
                          styles.dayNumber,
                          { fontSize: sz(13) },
                          cell.isToday && styles.dayNumberToday,
                        ]}
                      >
                        {cell.day}
                      </Text>
                      <View style={styles.dots}>
                        {cell.markers.slice(0, 3).map((m, n) => (
                          <View
                            key={n}
                            style={[
                              styles.dot,
                              (m === 'deadline' || m === 'clock') && styles.dotDeadline,
                            ]}
                          />
                        ))}
                      </View>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.legend}>
                <View style={styles.legendItem}>
                  <View style={styles.dot} />
                  <Text style={[styles.legendText, { fontSize: sz(11.5) }]}>{t.appointment}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.dot, styles.dotDeadline]} />
                  <Text style={[styles.legendText, { fontSize: sz(11.5) }]}>{t.deadline}</Text>
                </View>
                <Pressable
                  onPress={() => {
                    setCursor({ year: now.getFullYear(), month: now.getMonth() });
                    setSelectedDay(null);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={t.today}
                  style={styles.legendToday}
                >
                  <Text style={[styles.legendLink, { fontSize: sz(12) }]}>{t.today}</Text>
                </Pressable>
              </View>
            </View>

            {selectedDay ? (
              <View style={styles.card}>
                <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>
                  {formatDay(selectedDay, now, funnelLocale).toUpperCase()}
                </Text>
                {selectedEntries.length ? (
                  selectedEntries.map(row)
                ) : (
                  <Text style={[styles.empty, { fontSize: sz(13.5), lineHeight: sz(20) }]}>
                    {loading || dataFailed ? t.outsideWindow : t.nothingOnDay}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.note, { fontSize: sz(12), lineHeight: sz(17) }]}>
                {t.tapADay}
              </Text>
            )}
          </>
        ) : (
          /* Action Plan segment (owner request, Aug 31 → Sep 1 2026): the very
             same tracker the Tracker tab shows — stats, To Do / In Progress /
             Done filters, the next-3 focus view, swipe and add — rendered
             inline here so "Action Plan" never means two different lists.
             `ActionPlanTracker` is `ActionsScreen`'s own body; it owns its data
             and its "open detail" hops to the Tracker stack where the detail
             screen lives. */
          <ActionPlanTracker />
        )}

        {/* The full calendar keeps everything Plan does not do: adding,
            editing, recurrence, reminders, Google sync. */}
        <Pressable
          style={({ pressed }) => [styles.fullCalendar, pressed && styles.dim]}
          onPress={() => (navigation as any).navigate('CalendarMain')}
          accessibilityRole="button"
          accessibilityLabel={t.fullCalendar}
        >
          <Text style={[styles.fullCalendarText, { fontSize: sz(13.5), lineHeight: sz(19) }]}>
            {t.fullCalendar} ›
          </Text>
        </Pressable>

        {/* The full Tracker tab is one tap behind List and Month. In Action
            Plan mode it's already inline above, so the link would just loop. */}
        {mode !== 'actions' && (
          <Pressable
            style={({ pressed }) => [styles.fullCalendar, pressed && styles.dim]}
            onPress={() =>
              (navigation as any).navigate('Tracker', { screen: 'TrackerList', initial: false })
            }
            accessibilityRole="button"
            accessibilityLabel={t.fullActions}
          >
            <Text style={[styles.fullCalendarText, { fontSize: sz(13.5), lineHeight: sz(19) }]}>
              {t.fullActions} ›
            </Text>
          </Pressable>
        )}

        <Text style={[styles.note, { fontSize: sz(12), lineHeight: sz(17) }]}>{t.moved}</Text>
        <View style={styles.tail} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: brand.paper },
  scroll: { padding: spacing.lg, gap: spacing.md },
  segment: {
    flexDirection: 'row',
    backgroundColor: brand.headerTop,
    borderRadius: radii.md,
    padding: 3,
    gap: 3,
  },
  segmentButton: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
  },
  segmentButtonOn: { backgroundColor: brand.panel },
  segmentText: { color: brand.inkFaint, fontWeight: fonts.weights.semibold },
  segmentTextOn: { color: brand.ink, fontWeight: fonts.weights.bold },
  card: {
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: brand.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  sectionLabel: { color: brand.inkFaint, fontWeight: fonts.weights.bold, letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: brand.ink, fontWeight: fonts.weights.semibold },
  rowMeta: { color: brand.inkFaint },
  // brand.inkFaint clears AA on the warm surfaces (5.1–5.8:1, pinned in
  // theme.test.ts); the old #94A3B8 was 2.6:1 — the line the "every row shows
  // where it came from" rule depends on was the least readable text on the screen.
  rowSource: { color: brand.inkFaint, maxWidth: '42%', textAlign: 'right' },
  empty: { color: brand.inkFaint },
  emptyTitle: { color: brand.ink, fontWeight: fonts.weights.bold },
  note: { color: brand.inkFaint, paddingHorizontal: spacing.xs },
  dim: { opacity: 0.6 },

  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthNavText: { color: brand.pine, fontWeight: fonts.weights.bold },
  monthLabel: { color: brand.ink, fontWeight: fonts.weights.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: brand.inkFaint,
    fontWeight: fonts.weights.bold,
    paddingBottom: spacing.xs,
  },
  dayCell: {
    width: `${100 / 7}%`,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    borderRadius: radii.sm,
  },
  dayToday: { backgroundColor: brand.pineTint },
  daySelected: { borderWidth: 1, borderColor: brand.pine },
  dayNumber: { color: brand.inkSoft },
  dayNumberToday: { color: brand.pine, fontWeight: fonts.weights.bold },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: brand.pine },
  dotDeadline: { backgroundColor: semantic.warning },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: brand.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendText: { color: brand.inkFaint },
  legendToday: { marginLeft: 'auto', minHeight: 44, justifyContent: 'center' },
  legendLink: { color: brand.pine, fontWeight: fonts.weights.bold },

  fullCalendar: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  fullCalendarText: { color: brand.pine, fontWeight: fonts.weights.bold },
  tail: { height: spacing.lg },
});
