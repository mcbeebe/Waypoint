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
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFamily } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
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
import type { AgendaScope } from '@/lib/agenda';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, semantic, spacing } from '@/lib/theme';

/** Remembered so a parent who prefers the month is not re-choosing daily. */
const PLAN_VIEW_KEY = 'waypoint.plan.view';
/** The same "everything / Waypoint only" preference Home and Calendar use. */
const SCOPE_KEY = 'waypoint_agenda_scope';

type PlanMode = 'list' | 'month' | 'actions';

/** Short month labels per locale — never via Date's own locale (Hermes-safe). */
const MONTHS: Record<FunnelLocale, string[]> = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  vi: ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12'],
};

function labels(locale: FunnelLocale) {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  return {
    title: L('Your plan', 'Su plan', 'Kế hoạch của quý vị'),
    intro: L(
      'Everything you need to do and every date it hangs on — as a list, or as the full month.',
      'Todo lo que debe hacer y cada fecha de la que depende — como lista o como mes completo.',
      'Mọi việc quý vị cần làm và mọi mốc ngày liên quan — dạng danh sách, hoặc cả tháng.'
    ),
    list: L('List', 'Lista', 'Danh sách'),
    month: L('Month', 'Mes', 'Tháng'),
    actions: L('Action Plan', 'Plan de acción', 'Kế hoạch hành động'),
    viewGroup: L('Plan view', 'Vista del plan', 'Chế độ xem'),
    due: L('Due', 'Vence', 'Hạn'),
    added: L('Added', 'Agregado', 'Đã thêm'),
    statusNotStarted: L('To do', 'Por hacer', 'Cần làm'),
    statusInProgress: L('In progress', 'En curso', 'Đang làm'),
    statusCompleted: L('Done', 'Hecho', 'Xong'),
    statusLocked: L('Locked', 'Bloqueado', 'Đang khóa'),
    actionsEmpty: L(
      'No steps yet — as Waypoint suggests actions, they’ll appear here.',
      'Aún no hay pasos — a medida que Waypoint sugiera acciones, aparecerán aquí.',
      'Chưa có bước nào — khi Waypoint đề xuất hành động, chúng sẽ hiện ở đây.'
    ),
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

  useEffect(() => {
    AsyncStorage.getItem(PLAN_VIEW_KEY)
      .then((v) => { if (v === 'month' || v === 'list' || v === 'actions') setMode(v); })
      .catch(() => {});
  }, []);
  const chooseMode = (next: PlanMode) => {
    setMode(next);
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

  /**
   * Action Plan segment ordering, kept coherent with ActionsScreen so the same
   * "Action Plan" name never means two different lists: DISMISSED steps are
   * excluded (a cancelled step must never read as "To do"); then in-progress →
   * to-do → done, and within a status by priority (urgent first), then due date.
   */
  const PRIORITY_ORDER: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const rank = (s: string) => (s === 'completed' ? 2 : s === 'in_progress' ? 0 : 1);
  const planActions = useMemo(
    () =>
      actions
        .filter((a) => a.status !== 'dismissed')
        .sort((a, b) => {
          const r = rank(a.status) - rank(b.status);
          if (r !== 0) return r;
          const p = (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
          if (p !== 0) return p;
          if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date);
          if (a.due_date) return -1;
          if (b.due_date) return 1;
          return 0;
        }),
    [actions] // eslint-disable-line react-hooks/exhaustive-deps
  );

  /** A step whose prerequisite isn't done yet — shown as locked, not doable,
   *  matching ActionsScreen (which blocks the status toggle on the same rule). */
  const completedIds = useMemo(
    () => new Set(actions.filter((a) => a.status === 'completed').map((a) => a.id)),
    [actions]
  );
  const isLocked = (a: (typeof actions)[number]) => !!a.depends_on && !completedIds.has(a.depends_on);

  const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const fmtDue = (iso: string) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
    if (!m) return '';
    const mon = MONTHS[funnelLocale][Number(m[2]) - 1] ?? m[2];
    return funnelLocale === 'vi' ? `${Number(m[3])} ${mon}` : `${mon} ${Number(m[3])}`;
  };

  const actionRow = (a: (typeof actions)[number]) => {
    const isDone = a.status === 'completed';
    const locked = !isDone && isLocked(a);
    const overdue = !!a.due_date && !isDone && !locked && a.due_date < todayISO;
    const statusLabel = isDone
      ? t.statusCompleted
      : locked
        ? t.statusLocked
        : a.status === 'in_progress'
          ? t.statusInProgress
          : t.statusNotStarted;
    const dotColor = isDone ? colors.sage : locked ? colors.border : a.status === 'in_progress' ? colors.teal : colors.mid;
    const dueMeta = a.due_date ? `${t.due} ${fmtDue(a.due_date)}` : '';
    // When it joined the plan (owner, Aug 31) — created_at is an ISO timestamp,
    // fmtDue reads its date prefix.
    const addedMeta = a.created_at ? `${t.added} ${fmtDue(a.created_at)}` : '';
    const meta = [dueMeta, addedMeta].filter(Boolean).join('  ·  ');
    return (
      <Pressable
        key={a.id}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}
        onPress={() =>
          (navigation as any).navigate('Tracker', {
            screen: 'ActionDetail',
            params: { actionId: a.id },
            initial: false,
          })
        }
        accessibilityRole="button"
        accessibilityLabel={`${a.title}. ${statusLabel}.${meta ? ` ${meta}` : ''}`}
      >
        <View style={[styles.actionDot, { backgroundColor: dotColor }]} />
        <View style={styles.rowText}>
          <Text
            style={[
              styles.rowTitle,
              { fontSize: sz(14), lineHeight: sz(19) },
              isDone && styles.actionDone,
              locked && styles.actionLocked,
            ]}
          >
            {locked ? '🔒 ' : ''}{a.title}
          </Text>
          {!!meta && (
            <Text style={[styles.rowMeta, { fontSize: sz(12), lineHeight: sz(16) }]}>
              {dueMeta ? <Text style={overdue ? styles.overdue : undefined}>{dueMeta}</Text> : null}
              {dueMeta && addedMeta ? '  ·  ' : null}
              {addedMeta || null}
            </Text>
          )}
        </View>
        <Text style={[styles.rowSource, { fontSize: sz(11.5), lineHeight: sz(16) }]}>{statusLabel}</Text>
      </Pressable>
    );
  };

  const selectedEntries = selectedDay ? byDay[selectedDay] ?? [] : [];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.h1, { fontSize: sz(22), lineHeight: sz(28) }]}>{t.title}</Text>
        <Text style={[styles.intro, { fontSize: sz(13), lineHeight: sz(19) }]}>{t.intro}</Text>

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
          <>
            {/* Action Plan segment (owner request, Aug 31 2026): the steps
                themselves, in the Plan screen alongside List and Month. The
                full-featured list (filters, swipe) stays one tap behind. */}
            {actionsLoading && planActions.length === 0 ? (
              <View style={styles.card}>
                <Text style={[styles.empty, { fontSize: sz(13.5), lineHeight: sz(20) }]}>{t.loading}</Text>
              </View>
            ) : planActions.length === 0 ? (
              <View style={styles.card}>
                <Text style={[styles.empty, { fontSize: sz(13.5), lineHeight: sz(20) }]}>{t.actionsEmpty}</Text>
              </View>
            ) : (
              <View style={styles.card}>{planActions.map(actionRow)}</View>
            )}
          </>
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

        {/* Both halves of the merge keep their full screen: Plan is the one
            list, and everything it cannot do is one tap behind it. */}
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

        <Text style={[styles.note, { fontSize: sz(12), lineHeight: sz(17) }]}>{t.moved}</Text>
        <View style={styles.tail} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  scroll: { padding: spacing.lg, gap: spacing.md },
  h1: { fontWeight: fonts.weights.extrabold, color: colors.navy },
  intro: { color: colors.mid },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#EEF2F6',
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
  segmentButtonOn: { backgroundColor: colors.white },
  segmentText: { color: colors.mid, fontWeight: fonts.weights.semibold },
  segmentTextOn: { color: colors.navy, fontWeight: fonts.weights.bold },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.sm,
  },
  sectionLabel: { color: colors.mid, fontWeight: fonts.weights.bold, letterSpacing: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.navy, fontWeight: fonts.weights.semibold },
  rowMeta: { color: colors.mid },
  // colors.mid passes AA on white (~4.7:1); the old #94A3B8 was 2.6:1 — the
  // line the "every row shows where it came from" rule depends on was the
  // least readable text on the screen.
  rowSource: { color: colors.mid, maxWidth: '42%', textAlign: 'right' },
  actionDot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  actionDone: { color: colors.mid, textDecorationLine: 'line-through' },
  actionLocked: { color: colors.mid },
  overdue: { color: colors.coral, fontWeight: fonts.weights.semibold },
  empty: { color: colors.mid },
  emptyTitle: { color: colors.navy, fontWeight: fonts.weights.bold },
  note: { color: colors.mid, paddingHorizontal: spacing.xs },
  dim: { opacity: 0.6 },

  monthHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthNav: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  monthNavText: { color: colors.teal, fontWeight: fonts.weights.bold },
  monthLabel: { color: colors.navy, fontWeight: fonts.weights.bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dow: {
    width: `${100 / 7}%`,
    textAlign: 'center',
    color: colors.mid,
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
  dayToday: { backgroundColor: '#ECFEFF' },
  daySelected: { borderWidth: 1, borderColor: colors.teal },
  dayNumber: { color: colors.dark },
  dayNumberToday: { color: colors.teal, fontWeight: fonts.weights.bold },
  dots: { flexDirection: 'row', gap: 2, height: 6, marginTop: 2 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.teal },
  dotDeadline: { backgroundColor: semantic.warning },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendText: { color: colors.mid },
  legendToday: { marginLeft: 'auto', minHeight: 44, justifyContent: 'center' },
  legendLink: { color: colors.teal, fontWeight: fonts.weights.bold },

  fullCalendar: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  fullCalendarText: { color: colors.teal, fontWeight: fonts.weights.bold },
  tail: { height: spacing.lg },
});
