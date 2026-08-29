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
import { View, Text, Pressable, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFamily, useChildren } from '@/hooks/useFamily';
import { useActions } from '@/hooks/useActions';
import { useAppointments } from '@/hooks/useAppointments';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useRequests } from '@/hooks/useRequests';
import { useDeferrals } from '@/hooks/useDeferrals';
import {
  buildMonth,
  buildPlan,
  entriesByDay,
  formatDay,
  monthOfNextItem,
} from '@/lib/planView';
import type { PlanEntry, PlanInput } from '@/lib/planView';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, semantic, spacing } from '@/lib/theme';

/** Remembered so a parent who prefers the month is not re-choosing daily. */
const PLAN_VIEW_KEY = 'waypoint.plan.view';

type PlanMode = 'list' | 'month';

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
    viewGroup: L('Plan view', 'Vista del plan', 'Chế độ xem'),
    today: L('Today', 'Hoy', 'Hôm nay'),
    prevMonth: L('Previous month', 'Mes anterior', 'Tháng trước'),
    nextMonth: L('Next month', 'Mes sau', 'Tháng sau'),
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
      'Chi phí và báo cáo thuế nằm trong Công cụ → Tiền & quyền lợi, nơi chúng đã được liệt kê.'
    ),
  };
}

export default function PlanScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { children } = useChildren(family?.id);
  const { locale } = useI18n();
  const funnelLocale = toFunnelLocale(locale);
  const t = labels(funnelLocale);
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  const [mode, setMode] = useState<PlanMode>('list');
  const [now, setNow] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ year: number; month: number } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PLAN_VIEW_KEY)
      .then((v) => { if (v === 'month' || v === 'list') setMode(v); })
      .catch(() => {});
  }, []);
  const chooseMode = (next: PlanMode) => {
    setMode(next);
    AsyncStorage.setItem(PLAN_VIEW_KEY, next).catch(() => {});
  };

  const { actions, refetch: refetchActions } = useActions({ familyId: family?.id ?? '' });
  const { deadlines, refetch: refetchDeadlines } = useDeadlines({ familyId: family?.id ?? '' });
  const { requests } = useRequests(family?.id);
  const { deferrals, titles: deferralTitles } = useDeferrals(family?.id);
  // A wide window: Plan shows the whole month, not the next seven days.
  const range = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 3, 0, 23, 59, 59);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [now]);
  const { appointments, refetch: refetchAppointments } = useAppointments({
    familyId: family?.id ?? '',
    dateRange: range,
  });

  const input: PlanInput = useMemo(
    () => ({
      now,
      locale: funnelLocale,
      actions: actions.map((a) => ({
        id: a.id, title: a.title, status: a.status, priority: a.priority,
        due_date: a.due_date, category: a.category,
      })),
      appointments: appointments.map((a) => ({
        id: a.id, title: a.title, start_time: a.start_time,
        appointment_type: a.appointment_type, location: a.location,
        source: (a as { source?: string | null }).source ?? null,
      })),
      deadlines: deadlines.map((d) => ({
        id: d.id, title: d.title, due_date: d.due_date, status: d.status,
      })),
      requests: requests.map((r) => ({
        id: r.id, title: r.title, request_type: r.request_type,
        requested_on: r.requested_on, status: r.status,
      })),
      later: Object.entries(deferrals)
        .filter(([id]) => deferralTitles[id])
        .map(([id, returnsOn]) => ({ id, title: deferralTitles[id], returnsOn })),
    }),
    [now, funnelLocale, actions, appointments, deadlines, requests, deferrals, deferralTitles]
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

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setNow(new Date());
    await Promise.all([refetchActions(), refetchDeadlines(), refetchAppointments()]);
    setRefreshing(false);
  }, [refetchActions, refetchDeadlines, refetchAppointments]);

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
          {(['list', 'month'] as const).map((m) => (
            <Pressable
              key={m}
              style={[styles.segmentButton, mode === m && styles.segmentButtonOn]}
              onPress={() => chooseMode(m)}
              accessibilityRole="tab"
              accessibilityState={{ selected: mode === m }}
              accessibilityLabel={m === 'list' ? t.list : t.month}
            >
              <Text
                style={[
                  styles.segmentText,
                  { fontSize: sz(13.5) },
                  mode === m && styles.segmentTextOn,
                ]}
              >
                {m === 'list' ? t.list : t.month}
              </Text>
            </Pressable>
          ))}
        </View>

        {mode === 'list' ? (
          <>
            {plan.isEmpty && (
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
        ) : (
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
                        cell.count ? `, ${cell.count}` : ''
                      }`}
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
                    {t.nothingOnDay}
                  </Text>
                )}
              </View>
            ) : (
              <Text style={[styles.note, { fontSize: sz(12), lineHeight: sz(17) }]}>
                {t.tapADay}
              </Text>
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
        {children.length > 1 && <View style={styles.tail} />}
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
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.xs,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: { color: colors.navy, fontWeight: fonts.weights.semibold },
  rowMeta: { color: colors.mid },
  rowSource: { color: '#94A3B8', maxWidth: '38%', textAlign: 'right' },
  empty: { color: colors.mid },
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
