/**
 * Today & the week at a glance (Home).
 *
 * The plan can hold dozens of steps; this answers the only two questions a
 * parent has on opening the app — what's happening today, and what should
 * I pick up next — then gets out of the way.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type {
  Agenda,
  AgendaAction,
  AgendaAppointment,
  AgendaItem,
  AgendaScope,
  DaySummary,
} from '@/lib/agenda';
import { weekSummaryLine, collapsedSummaryLine } from '@/lib/agenda';
import { useBooleanPreference } from '@/hooks/usePreference';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface TodayCardProps {
  agenda: Agenda;
  childName?: string | null;
  scope: AgendaScope;
  onChangeScope: (scope: AgendaScope) => void;
  onOpenAction: (actionId: string) => void;
  onOpenCalendar: () => void;
  onOpenActions: () => void;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

/** "Sat, Aug 22" — enough to place a day without the year's noise. */
function dayHeading(day: DaySummary): string {
  const [y, m, d] = day.key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

const KIND_ICON: Record<AgendaItem['kind'], string> = {
  appointment: '🗓',
  deadline: '⏰',
  action: '📋',
};

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

export default function TodayCard({
  agenda,
  childName,
  scope,
  onChangeScope,
  onOpenAction,
  onOpenCalendar,
  onOpenActions,
}: TodayCardProps) {
  const { todayAppointments, todayActions, todayDeadlines, overdue, focus, week, isClearToday } =
    agenda;
  const summary = weekSummaryLine(week);

  // Both remembered per device: a parent who wants this out of the way
  // shouldn't have to close it again every morning.
  const [collapsed, setCollapsed] = useBooleanPreference('home_today_collapsed', false);
  const [weekExpanded, setWeekExpanded] = useBooleanPreference('home_week_expanded', false);

  const upcomingDays = week.slice(1);
  const daysWithItems = upcomingDays.filter((d) => d.items.length > 0).length;

  return (
    <View style={styles.card}>
      {/* Today */}
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setCollapsed(!collapsed)}
        accessibilityRole="button"
        accessibilityState={{ expanded: !collapsed }}
        accessibilityLabel={collapsed ? 'Expand today and this week' : 'Collapse today and this week'}
      >
        <View style={styles.headerLeft}>
          <Text style={styles.label}>TODAY</Text>
          {collapsed && <Text style={styles.collapsedSummary}>{collapsedSummaryLine(agenda)}</Text>}
        </View>
        <View style={styles.headerRight}>
          {!collapsed && <Text style={styles.date}>{todayLabel()}</Text>}
          <Ionicons
            name={collapsed ? 'chevron-down' : 'chevron-up'}
            size={18}
            color={colors.mid}
          />
        </View>
      </TouchableOpacity>

      {/* Everything below folds away when the card is collapsed */}
      {!collapsed && (
        <>

      {/* A synced Google calendar buries the journey — let the parent narrow
          this to what Waypoint manages */}
      <View style={styles.scopeRow}>
        {(['all', 'waypoint'] as AgendaScope[]).map((option) => (
          <TouchableOpacity
            key={option}
            style={[styles.scopePill, scope === option && styles.scopePillActive]}
            onPress={() => onChangeScope(option)}
            accessibilityRole="button"
            accessibilityState={{ selected: scope === option }}
            accessibilityLabel={
              option === 'all' ? 'Show everything on my calendar' : 'Show only Waypoint items'
            }
          >
            <Text style={[styles.scopeText, scope === option && styles.scopeTextActive]}>
              {option === 'all' ? 'Everything' : 'Waypoint only'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {overdue.length > 0 && (
        <TouchableOpacity
          style={styles.overdueRow}
          onPress={onOpenActions}
          accessibilityRole="button"
          accessibilityLabel={`${overdue.length} overdue ${overdue.length === 1 ? 'item' : 'items'}`}
        >
          <Text style={styles.overdueText}>
            ⚠️ {overdue.length} overdue — {overdue[0].title}
            {overdue.length > 1 ? ` +${overdue.length - 1} more` : ''}
          </Text>
        </TouchableOpacity>
      )}

      {isClearToday ? (
        <Text style={styles.clearText}>
          Nothing scheduled today{childName ? ` for ${childName}` : ''}. A clear day counts as
          progress too.
        </Text>
      ) : (
        <View style={styles.itemList}>
          {todayAppointments.map((appt: AgendaAppointment) => (
            <TouchableOpacity
              key={appt.id}
              style={styles.itemRow}
              onPress={onOpenCalendar}
              accessibilityRole="button"
              accessibilityLabel={`${appt.title} at ${formatTime(appt.start_time)}`}
            >
              <Text style={styles.itemTime}>{formatTime(appt.start_time)}</Text>
              <Text style={styles.itemText} numberOfLines={1}>
                {appt.title}
              </Text>
            </TouchableOpacity>
          ))}
          {todayDeadlines.map((dl) => (
            <TouchableOpacity
              key={dl.id}
              style={styles.itemRow}
              onPress={onOpenCalendar}
              accessibilityRole="button"
              accessibilityLabel={`Deadline today: ${dl.title}`}
            >
              <Text style={styles.itemTime}>⏰</Text>
              <Text style={styles.itemText} numberOfLines={1}>
                {dl.title}
              </Text>
            </TouchableOpacity>
          ))}
          {todayActions.map((a: AgendaAction) => (
            <TouchableOpacity
              key={a.id}
              style={styles.itemRow}
              onPress={() => onOpenAction(a.id)}
              accessibilityRole="button"
              accessibilityLabel={`Due today: ${a.title}`}
            >
              <Text style={styles.itemTime}>📋</Text>
              <Text style={styles.itemText} numberOfLines={1}>
                {a.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* One thing to pick up */}
      {focus && (
        <TouchableOpacity
          style={styles.focusBox}
          onPress={() => onOpenAction(focus.id)}
          accessibilityRole="button"
          accessibilityLabel={`Next up: ${focus.title}`}
        >
          <Text style={styles.focusLabel}>NEXT UP</Text>
          <Text style={styles.focusTitle} numberOfLines={2}>
            {focus.title}
          </Text>
          <Text style={styles.focusHint}>Tap to open →</Text>
        </TouchableOpacity>
      )}

      {/* The week */}
      <View style={styles.weekHeaderRow}>
        <Text style={styles.label}>THIS WEEK</Text>
        {summary ? <Text style={styles.weekSummary}>{summary}</Text> : null}
      </View>
      <View style={styles.weekRow}>
        {week.map((day) => (
          <TouchableOpacity
            key={day.key}
            style={[styles.dayPill, day.isToday && styles.dayPillToday]}
            onPress={onOpenCalendar}
            accessibilityRole="button"
            accessibilityLabel={
              `${day.label} ${day.dayOfMonth}: ` +
              `${day.appointmentCount} appointment${day.appointmentCount === 1 ? '' : 's'}, ` +
              `${day.dueCount} due`
            }
          >
            <Text style={[styles.dayLabel, day.isToday && styles.dayLabelToday]}>{day.label}</Text>
            <Text style={[styles.dayNum, day.isToday && styles.dayNumToday]}>{day.dayOfMonth}</Text>
            <View style={styles.dotRow}>
              {day.appointmentCount > 0 && <View style={styles.dotAppt} />}
              {day.dueCount > 0 && <View style={styles.dotDue} />}
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {/* The rest of the week, spelled out — the dots say a day is busy but
          not with what, which meant opening Calendar to find out */}
      {weekExpanded && (
        <View style={styles.weekDetail}>
          {upcomingDays.map((day) => (
            <View key={day.key} style={styles.weekDay}>
              <Text style={styles.weekDayHeading}>{dayHeading(day)}</Text>
              {day.items.length === 0 ? (
                <Text style={styles.weekDayClear}>Clear</Text>
              ) : (
                day.items.map((item) => (
                  <TouchableOpacity
                    key={`${item.kind}-${item.id}`}
                    style={styles.weekItemRow}
                    onPress={() =>
                      item.kind === 'action' ? onOpenAction(item.id) : onOpenCalendar()
                    }
                    accessibilityRole="button"
                    accessibilityLabel={
                      `${dayHeading(day)}: ${item.title}` +
                      (item.time ? ` at ${formatTime(item.time)}` : '')
                    }
                  >
                    <Text style={styles.weekItemTime}>
                      {item.time ? formatTime(item.time) : KIND_ICON[item.kind]}
                    </Text>
                    <Text style={styles.weekItemText} numberOfLines={1}>
                      {item.title}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </View>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.weekToggle}
        onPress={() => setWeekExpanded(!weekExpanded)}
        accessibilityRole="button"
        accessibilityState={{ expanded: weekExpanded }}
        accessibilityLabel={
          weekExpanded ? 'Hide the rest of the week' : 'Show every day this week'
        }
      >
        <Text style={styles.weekToggleText}>
          {weekExpanded
            ? 'Hide the rest of the week'
            : daysWithItems > 0
              ? `Show all 7 days (${daysWithItems} more with something on)`
              : 'Show all 7 days'}
        </Text>
        <Ionicons
          name={weekExpanded ? 'chevron-up' : 'chevron-down'}
          size={14}
          color={colors.teal}
        />
      </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 32,
  },
  headerLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  collapsedSummary: {
    flex: 1,
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  weekDetail: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  weekDay: { gap: 1 },
  weekDayHeading: {
    fontSize: 11,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
  },
  weekDayClear: { fontSize: fonts.sizes.xs, color: colors.mid, paddingVertical: 2 },
  weekItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 5,
    minHeight: 30,
  },
  weekItemTime: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
    width: 62,
  },
  weekItemText: { flex: 1, fontSize: fonts.sizes.xs, color: colors.dark },
  weekToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: spacing.sm,
    paddingVertical: 7,
    minHeight: 34,
  },
  weekToggleText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  label: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: colors.teal,
    letterSpacing: 0.7,
  },
  date: { fontSize: fonts.sizes.xs, color: colors.mid },
  scopeRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  scopePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    minHeight: 28,
    justifyContent: 'center',
  },
  scopePillActive: { backgroundColor: colors.teal },
  scopeText: { fontSize: 11, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  scopeTextActive: { color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  overdueRow: {
    backgroundColor: '#FEE2E2',
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    marginTop: spacing.sm,
  },
  overdueText: {
    fontSize: fonts.sizes.xs,
    color: '#991B1B',
    fontWeight: fonts.weights.semibold as '600',
  },
  clearText: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  itemList: { marginTop: spacing.sm, gap: 2 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 6,
    minHeight: 34,
  },
  itemTime: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
    width: 62,
  },
  itemText: { flex: 1, fontSize: fonts.sizes.sm, color: colors.dark },
  focusBox: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    borderRadius: radii.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  focusLabel: {
    fontSize: 10,
    fontWeight: fonts.weights.bold as '700',
    color: colors.teal,
    letterSpacing: 0.7,
  },
  focusTitle: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginTop: 3,
    lineHeight: 20,
  },
  focusHint: { fontSize: fonts.sizes.xs, color: colors.teal, marginTop: 4 },
  weekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    marginBottom: 6,
  },
  weekSummary: { fontSize: fonts.sizes.xs, color: colors.mid },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayPill: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: radii.md,
    minWidth: 38,
  },
  dayPillToday: { backgroundColor: '#E0F7FA' },
  dayLabel: { fontSize: 10, color: colors.mid, fontWeight: fonts.weights.medium as '500' },
  dayLabelToday: { color: colors.teal },
  dayNum: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.semibold as '600',
    marginTop: 1,
  },
  dayNumToday: { color: colors.teal },
  dotRow: { flexDirection: 'row', gap: 2, height: 6, marginTop: 3 },
  dotAppt: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.teal },
  dotDue: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#EA580C' },
});
