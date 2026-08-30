/**
 * Calendar & Deadlines screen — combined appointments + deadlines view
 * Sprint 4: S4-01 through S4-04
 *
 * Features:
 * - Day-by-day appointment list with time slots
 * - Deadline cards with urgency color coding
 * - Quick-add appointment/deadline modals
 * - Week navigation with date indicator
 * - Type-based icons and color coding
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from 'react-native';
import DateInput from '@/components/DateInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '@/lib/supabase';
import { expandOccurrences, findOverlaps, type RecurrenceRule } from '@/lib/recurrence';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { showConfirm } from '@/lib/dialogs';
import { useFamily } from '@/hooks/useFamily';
import { useAppointments, isRecurrenceSupported } from '@/hooks/useAppointments';
import { useDeadlines } from '@/hooks/useDeadlines';
import { useCalendarSync } from '@/hooks/useCalendarSync';
import { useNotifications } from '@/hooks/useNotifications';
import { useToast } from '@/components/Toast';
import EmptyState from '@/components/EmptyState';
import type {
  Appointment,
  AppointmentType,
  Deadline,
  DeadlineType,
  DeadlineStatus,
} from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const APPOINTMENT_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  therapy: { label: 'Therapy', emoji: '🧠', color: '#7C3AED' },
  iep_meeting: { label: 'IEP Meeting', emoji: '🏫', color: '#2563EB' },
  ipp_meeting: { label: 'IPP Meeting', emoji: '🏛️', color: '#0891B2' },
  medical: { label: 'Medical', emoji: '⚕️', color: '#DC2626' },
  evaluation: { label: 'Evaluation', emoji: '📋', color: '#EA580C' },
  other: { label: 'Other', emoji: '📌', color: '#64748B' },
};

const DEADLINE_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
  iep_annual_review: { label: 'IEP Annual Review', emoji: '🏫' },
  insurance_appeal: { label: 'Insurance Appeal', emoji: '🏥' },
  ssi_redetermination: { label: 'SSI Redetermination', emoji: '💰' },
  ipp_review: { label: 'IPP Review', emoji: '🏛️' },
  authorization_expiry: { label: 'Authorization Expiry', emoji: '📄' },
  other: { label: 'Other Deadline', emoji: '⏰' },
};

type ViewMode = 'upcoming' | 'deadlines';
/** Shared with Home so the choice means the same thing in both places */
type Scope = 'all' | 'waypoint';
const SCOPE_KEY = 'waypoint_agenda_scope';

/** An appointment as displayed: a real row or one expanded occurrence of a series */
type DisplayAppointment = Appointment & { occurrenceId: string; isVirtual: boolean };

const RECURRENCE_OPTIONS: Array<{ value: RecurrenceRule | null; label: string }> = [
  { value: null, label: 'Once' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 wks' },
  { value: 'monthly', label: 'Monthly' },
];

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const navigation = useNavigation();

  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
  const [scope, setScope] = useState<Scope>('all');

  // Same preference the Home summary uses
  useEffect(() => {
    AsyncStorage.getItem(SCOPE_KEY)
      .then((v) => { if (v === 'waypoint' || v === 'all') setScope(v); })
      .catch(() => {});
  }, []);
  const changeScope = useCallback((next: Scope) => {
    setScope(next);
    AsyncStorage.setItem(SCOPE_KEY, next).catch(() => {});
  }, []);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAddModal, setShowAddModal] = useState(false);

  // Date range: current week
  const weekRange = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay()); // Sunday
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { start: start.toISOString(), end: end.toISOString() };
  }, [selectedDate]);

  const {
    appointments,
    loading: loadingAppts,
    error: apptError,
    createAppointment,
    updateStatus: updateApptStatus,
    refetch: refetchAppts,
  } = useAppointments({ familyId, dateRange: weekRange });

  const {
    deadlines,
    loading: loadingDeadlines,
    createDeadline,
    markComplete,
    refetch: refetchDeadlines,
  } = useDeadlines({ familyId });

  const { isSyncing, syncNow, isGoogleConnected, needsReconnect } = useCalendarSync({ familyId });
  const { showToast } = useToast();

  // Deadline push reminders (wave 3 retention) — native only; local
  // notifications aren't reliable on web
  const notificationsSupported = Platform.OS !== 'web';
  const { hasPermission, requestPermission, scheduleAllReminders } = useNotifications();

  useEffect(() => {
    if (!notificationsSupported || !hasPermission || deadlines.length === 0) return;
    scheduleAllReminders(deadlines.filter((d) => d.status !== 'completed')).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasPermission, deadlines]);

  const handleEnableReminders = useCallback(async () => {
    const granted = await requestPermission();
    if (granted) {
      await scheduleAllReminders(deadlines.filter((d) => d.status !== 'completed')).catch(() => {});
    }
  }, [requestPermission, scheduleAllReminders, deadlines]);

  const loading = loadingAppts || loadingDeadlines;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchAppts(), refetchDeadlines()]);
  }, [refetchAppts, refetchDeadlines]);

  /**
   * Sync always says what happened. Before this, a dead Google grant (they
   * expire while the OAuth app is unverified) made the button a silent
   * no-op — indistinguishable from the feature being broken.
   */
  const handleSync = useCallback(async () => {
    const result = await syncNow();
    if (result.ok) {
      const moved = result.pulled + result.pushed;
      showToast(
        moved === 0
          ? 'Calendar synced — everything was already up to date'
          : `Calendar synced — ${result.pulled} in, ${result.pushed} out`,
        'success'
      );
      await handleRefresh();
    } else {
      showToast(result.error ?? 'Calendar sync failed', 'error');
    }
  }, [syncNow, showToast, handleRefresh]);

  /**
   * Overlap warning: before adding an appointment, check the candidate's
   * day (fetched fresh — the current week's list may not cover it, and
   * recurring series expand into any day). Returns true to proceed.
   */
  const confirmNoOverlap = useCallback(async (startISO: string): Promise<boolean> => {
    try {
      const dayStart = new Date(startISO);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(startISO);
      dayEnd.setHours(23, 59, 59, 999);
      const base = supabase.from('appointments').select('*').eq('family_id', familyId);
      const { data } = isRecurrenceSupported()
        ? await base.or(
            `and(start_time.gte.${dayStart.toISOString()},start_time.lte.${dayEnd.toISOString()}),recurrence.not.is.null`
          )
        : await base.gte('start_time', dayStart.toISOString()).lte('start_time', dayEnd.toISOString());
      const dayEvents = ((data ?? []) as Appointment[])
        .filter((a) => a.status !== 'cancelled')
        .flatMap((a) =>
          expandOccurrences(a, dayStart.toISOString(), dayEnd.toISOString()).map((occ) => ({
            title: a.title,
            start_time: occ.start_time,
            end_time: occ.end_time,
          }))
        );
      const hits = findOverlaps({ start_time: startISO }, dayEvents);
      if (hits.length === 0) return true;
      const first = hits[0];
      const t = new Date(first.start_time).toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
      });
      return showConfirm(
        'Schedule conflict',
        `This overlaps "${first.title}" at ${t}. Add it anyway?`,
        'Add anyway'
      );
    } catch {
      // Can't check — don't block the save
      return true;
    }
  }, [familyId]);

  // Navigate weeks
  const shiftWeek = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction * 7);
    setSelectedDate(d);
  };

  // Expand recurring series into this week's occurrences, then group by day
  const appointmentsByDay = useMemo(() => {
    const groups: Record<string, DisplayAppointment[]> = {};
    const visible =
      scope === 'waypoint' ? appointments.filter((a) => a.source !== 'google') : appointments;
    for (const appt of visible) {
      for (const occ of expandOccurrences(appt, weekRange.start, weekRange.end)) {
        const display: DisplayAppointment = {
          ...appt,
          start_time: occ.start_time,
          end_time: occ.end_time,
          occurrenceId: occ.occurrenceId,
          isVirtual: occ.isVirtual,
        };
        const day = occ.start_time.split('T')[0];
        if (!groups[day]) groups[day] = [];
        groups[day].push(display);
      }
    }
    for (const day of Object.keys(groups)) {
      groups[day].sort((a, b) => a.start_time.localeCompare(b.start_time));
    }
    return groups;
  }, [appointments, weekRange.start, weekRange.end, scope]);

  // Week days for header
  const weekDays = useMemo(() => {
    const start = new Date(selectedDate);
    start.setDate(start.getDate() - start.getDay());
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [selectedDate]);

  // Upcoming deadlines sorted by urgency
  const sortedDeadlines = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...deadlines]
      .filter((d) => d.status !== 'completed')
      .sort((a, b) => {
        // Overdue first, then by date
        const aOverdue = a.due_date < today ? -1 : 0;
        const bOverdue = b.due_date < today ? -1 : 0;
        if (aOverdue !== bOverdue) return aOverdue - bOverdue;
        return a.due_date.localeCompare(b.due_date);
      });
  }, [deadlines]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Calendar</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.syncButton, !isGoogleConnected && styles.syncButtonDisabled]}
            onPress={handleSync}
            disabled={isSyncing}
            accessibilityRole="button"
            accessibilityLabel="Sync with Google Calendar"
          >
            {isSyncing ? (
              <ActivityIndicator size="small" color={colors.teal} />
            ) : (
              <Text style={styles.syncButtonText}>Sync</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'upcoming' && styles.togglePillActive]}
          onPress={() => setViewMode('upcoming')}
        >
          <Text style={[styles.toggleText, viewMode === 'upcoming' && styles.toggleTextActive]}>
            Appointments
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'deadlines' && styles.togglePillActive]}
          onPress={() => setViewMode('deadlines')}
        >
          <Text style={[styles.toggleText, viewMode === 'deadlines' && styles.toggleTextActive]}>
            Deadlines ({sortedDeadlines.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Connection banner: a dead Google grant is the usual reason sync
          stops working, and it needs a human to re-grant access */}
      {needsReconnect && (
        <TouchableOpacity
          style={styles.reconnectBanner}
          onPress={() => (navigation as any).navigate('Home', { screen: 'Profile' })}
          accessibilityRole="button"
          accessibilityLabel="Reconnect your Google account in Profile"
        >
          <Text style={styles.reconnectEmoji}>🔌</Text>
          <View style={styles.reconnectBody}>
            <Text style={styles.reconnectTitle}>Google Calendar isn't connected</Text>
            <Text style={styles.reconnectText}>
              Connections expire periodically. Tap to reconnect in Profile → Google Account.
            </Text>
          </View>
        </TouchableOpacity>
      )}

      {/* A failed load must never masquerade as an empty week */}
      {apptError && (
        <View style={styles.loadErrorBanner}>
          <Text style={styles.loadErrorTitle}>Couldn't load your appointments</Text>
          <Text style={styles.loadErrorText}>{apptError}</Text>
        </View>
      )}

      {viewMode === 'upcoming' && (
        <View style={styles.scopeRow}>
          {(['all', 'waypoint'] as Scope[]).map((option) => (
            <TouchableOpacity
              key={option}
              style={[styles.scopePill, scope === option && styles.scopePillActive]}
              onPress={() => changeScope(option)}
              accessibilityRole="button"
              accessibilityState={{ selected: scope === option }}
              accessibilityLabel={
                option === 'all'
                  ? 'Show every event, including synced Google Calendar events'
                  : 'Show only appointments created in Waypoint'
              }
            >
              <Text style={[styles.scopeText, scope === option && styles.scopeTextActive]}>
                {option === 'all' ? 'Everything' : 'Waypoint only'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {viewMode === 'upcoming' ? (
        <>
          {/* Week Navigation */}
          <View style={styles.weekNav}>
            <TouchableOpacity onPress={() => shiftWeek(-1)}>
              <Text style={styles.weekNavArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.weekLabel}>
              {formatWeekLabel(weekDays[0], weekDays[6])}
            </Text>
            <TouchableOpacity onPress={() => shiftWeek(1)}>
              <Text style={styles.weekNavArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day Headers */}
          <View style={styles.dayHeaderRow}>
            {weekDays.map((d) => {
              const isToday = d.toDateString() === new Date().toDateString();
              const dateKey = d.toISOString().split('T')[0];
              const hasEvents = (appointmentsByDay[dateKey]?.length ?? 0) > 0;
              return (
                <TouchableOpacity
                  key={dateKey}
                  style={[styles.dayHeader, isToday && styles.dayHeaderToday]}
                  onPress={() => setSelectedDate(d)}
                >
                  <Text style={[styles.dayName, isToday && styles.dayNameToday]}>
                    {d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2)}
                  </Text>
                  <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>
                    {d.getDate()}
                  </Text>
                  {hasEvents && <View style={styles.dayDot} />}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Appointment List */}
          <FlatList
            data={Object.entries(appointmentsByDay).sort(([a], [b]) => a.localeCompare(b))}
            keyExtractor={([day]) => day}
            renderItem={({ item: [day, appts] }) => (
              <DayGroup
                date={day}
                appointments={appts}
                onStatusChange={updateApptStatus}
              />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.teal} />
            }
            ListEmptyComponent={
              <EmptyState
                emoji="📅"
                title="No appointments this week"
                subtitle="Tap + to add a therapy session, IEP meeting, or other appointment."
              />
            }
            showsVerticalScrollIndicator={false}
          />
        </>
      ) : (
        /* Deadlines View */
        <FlatList
          data={sortedDeadlines}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeadlineCard deadline={item} onComplete={() => markComplete(item.id)} />
          )}
          ListHeaderComponent={
            notificationsSupported && !hasPermission && sortedDeadlines.length > 0 ? (
              <TouchableOpacity
                style={styles.reminderBanner}
                onPress={handleEnableReminders}
                accessibilityRole="button"
                accessibilityLabel="Enable deadline reminder notifications"
              >
                <Text style={styles.reminderBannerEmoji}>🔔</Text>
                <View style={styles.reminderBannerBody}>
                  <Text style={styles.reminderBannerTitle}>Never miss a deadline</Text>
                  <Text style={styles.reminderBannerText}>
                    Tap to get reminders before IEP, insurance, and benefit deadlines.
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null
          }
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={handleRefresh} tintColor={colors.teal} />
          }
          ListEmptyComponent={
            <EmptyState
              emoji="✅"
              title="No upcoming deadlines"
              subtitle="You're all caught up! Deadlines from IEP reviews, insurance appeals, and SSI redeterminations will appear here."
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add Modal */}
      <AddModal
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddAppointment={async (data) => {
          const proceed = await confirmNoOverlap(data.start_time);
          if (!proceed) return false;
          await createAppointment(data);
          setShowAddModal(false);
          return true;
        }}
        onAddDeadline={async (data) => {
          await createDeadline(data);
          setShowAddModal(false);
          return true;
        }}
      />
    </SafeAreaView>
  );
}

// ─── Day Group Component ────────────────────────────────────────────────────

function DayGroup({
  date,
  appointments,
  onStatusChange,
}: {
  date: string;
  appointments: DisplayAppointment[];
  onStatusChange: (id: string, status: Appointment['status']) => void;
}) {
  const d = new Date(date + 'T00:00:00');
  const isToday = d.toDateString() === new Date().toDateString();

  return (
    <View style={styles.dayGroup}>
      <View style={styles.dayGroupHeader}>
        <Text style={[styles.dayGroupDate, isToday && styles.dayGroupDateToday]}>
          {isToday ? 'Today' : d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
        </Text>
        <Text style={styles.dayGroupCount}>{appointments.length} event{appointments.length !== 1 ? 's' : ''}</Text>
      </View>
      {appointments.map((appt) => (
        <AppointmentCard key={appt.occurrenceId} appointment={appt} onStatusChange={onStatusChange} />
      ))}
    </View>
  );
}

// ─── Appointment Card ───────────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: DisplayAppointment;
  onStatusChange: (id: string, status: Appointment['status']) => void;
}) {
  const config = APPOINTMENT_TYPE_CONFIG[appointment.appointment_type ?? 'other'] ?? APPOINTMENT_TYPE_CONFIG.other;
  const startTime = formatTime(appointment.start_time);
  const endTime = appointment.end_time ? formatTime(appointment.end_time) : null;
  const isCancelled = appointment.status === 'cancelled';
  const recurrenceLabel =
    appointment.recurrence === 'weekly' ? 'Weekly'
    : appointment.recurrence === 'biweekly' ? 'Every 2 weeks'
    : appointment.recurrence === 'monthly' ? 'Monthly'
    : null;

  return (
    <TouchableOpacity
      style={[styles.apptCard, isCancelled && styles.apptCardCancelled]}
      activeOpacity={0.7}
    >
      <View style={[styles.apptStripe, { backgroundColor: config.color }]} />
      <View style={styles.apptTimeCol}>
        <Text style={styles.apptTime}>{startTime}</Text>
        {endTime && <Text style={styles.apptTimeEnd}>{endTime}</Text>}
      </View>
      <View style={styles.apptContent}>
        <Text style={[styles.apptTitle, isCancelled && styles.apptTitleCancelled]}>
          {config.emoji} {appointment.title}
        </Text>
        {appointment.location && (
          <Text style={styles.apptLocation} numberOfLines={1}>📍 {appointment.location}</Text>
        )}
        <Text style={styles.apptType}>
          {config.label}{recurrenceLabel ? ` · 🔁 ${recurrenceLabel}` : ''}
        </Text>
      </View>
      {/* Virtual occurrences share the series row — status lives on the base */}
      {!appointment.isVirtual && (
        <TouchableOpacity
          style={styles.statusBadge}
          onPress={() => {
            const next = appointment.status === 'scheduled' ? 'completed' : 'scheduled';
            onStatusChange(appointment.id, next as Appointment['status']);
          }}
          accessibilityRole="button"
          accessibilityLabel={appointment.status === 'completed' ? 'Mark as not done' : 'Mark as done'}
        >
          <Text style={styles.statusBadgeText}>
            {appointment.status === 'completed' ? '✓' : '○'}
          </Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Deadline Card ──────────────────────────────────────────────────────────

function DeadlineCard({
  deadline,
  onComplete,
}: {
  deadline: Deadline;
  onComplete: () => void;
}) {
  const config = DEADLINE_TYPE_CONFIG[deadline.deadline_type] ?? DEADLINE_TYPE_CONFIG.other;
  const today = new Date().toISOString().split('T')[0];
  const daysLeft = daysUntil(deadline.due_date);
  const isOverdue = deadline.due_date < today;
  const isUrgent = daysLeft <= 7 && !isOverdue;
  const isSoon = daysLeft <= 30 && daysLeft > 7;

  return (
    <View style={[
      styles.deadlineCard,
      isOverdue && styles.deadlineOverdue,
      isUrgent && styles.deadlineUrgent,
    ]}>
      <View style={styles.deadlineLeft}>
        <Text style={styles.deadlineEmoji}>{config.emoji}</Text>
        <View style={styles.deadlineContent}>
          <Text style={styles.deadlineTitle}>{deadline.title}</Text>
          <Text style={styles.deadlineType}>{config.label}</Text>
          <Text style={[
            styles.deadlineDue,
            isOverdue && styles.deadlineDueOverdue,
            isUrgent && styles.deadlineDueUrgent,
          ]}>
            {isOverdue
              ? `⚠️ Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? 's' : ''}`
              : isUrgent
              ? `⏰ ${daysLeft} day${daysLeft !== 1 ? 's' : ''} left`
              : `📅 Due ${formatDateShort(deadline.due_date)}`
            }
          </Text>
          {deadline.notes && (
            <Text style={styles.deadlineNotes} numberOfLines={2}>{deadline.notes}</Text>
          )}
        </View>
      </View>
      <TouchableOpacity style={styles.completeButton} onPress={onComplete}>
        <Text style={styles.completeButtonText}>✓</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Add Modal ──────────────────────────────────────────────────────────────

interface AddModalProps {
  visible: boolean;
  onClose: () => void;
  /** Resolve true when saved (modal resets); false = kept open (e.g. overlap declined) */
  onAddAppointment: (data: { title: string; start_time: string; appointment_type?: AppointmentType; location?: string; recurrence?: RecurrenceRule; recurrence_until?: string }) => Promise<boolean>;
  onAddDeadline: (data: { title: string; deadline_type: DeadlineType; due_date: string; notes?: string }) => Promise<boolean>;
}

function AddModal({ visible, onClose, onAddAppointment, onAddDeadline }: AddModalProps) {
  const [mode, setMode] = useState<'appointment' | 'deadline'>('appointment');
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);
  const [recurrenceUntil, setRecurrenceUntil] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setDateStr('');
    setLocation('');
    setNotes('');
    setRecurrence(null);
    setRecurrenceUntil('');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !dateStr.trim()) return;
    setSaving(true);

    try {
      let saved: boolean;
      if (mode === 'appointment') {
        saved = await onAddAppointment({
          title: title.trim(),
          start_time: new Date(dateStr).toISOString(),
          location: location.trim() || undefined,
          recurrence: recurrence ?? undefined,
          recurrence_until:
            recurrence && /^\d{4}-\d{2}-\d{2}$/.test(recurrenceUntil) ? recurrenceUntil : undefined,
        });
      } else {
        saved = await onAddDeadline({
          title: title.trim(),
          deadline_type: 'other',
          due_date: dateStr.trim(),
          notes: notes.trim() || undefined,
        });
      }
      if (saved) reset();
      else setSaving(false);
    } catch {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add New</Text>
            <TouchableOpacity onPress={() => { onClose(); reset(); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Type toggle */}
          <View style={styles.modalToggle}>
            <TouchableOpacity
              style={[styles.modalTogglePill, mode === 'appointment' && styles.modalTogglePillActive]}
              onPress={() => setMode('appointment')}
            >
              <Text style={[styles.modalToggleText, mode === 'appointment' && styles.modalToggleTextActive]}>
                📅 Appointment
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalTogglePill, mode === 'deadline' && styles.modalTogglePillActive]}
              onPress={() => setMode('deadline')}
            >
              <Text style={[styles.modalToggleText, mode === 'deadline' && styles.modalToggleTextActive]}>
                ⏰ Deadline
              </Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.modalInput}
            placeholder={mode === 'appointment' ? 'Appointment title' : 'Deadline title'}
            placeholderTextColor={colors.mid}
            value={title}
            onChangeText={setTitle}
          />
          <DateInput
            style={styles.modalInput}
            mode={mode === 'appointment' ? 'datetime' : 'date'}
            value={dateStr}
            onChange={setDateStr}
            accessibilityLabel={mode === 'appointment' ? 'Appointment date and time' : 'Due date'}
          />
          {mode === 'appointment' ? (
            <>
              <TextInput
                style={styles.modalInput}
                placeholder="Location (optional)"
                placeholderTextColor={colors.mid}
                value={location}
                onChangeText={setLocation}
              />
              {/* Repeats — series expands on the calendar automatically */}
              <View style={styles.recurrenceRow}>
                {RECURRENCE_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.label}
                    style={[styles.recurrencePill, recurrence === opt.value && styles.recurrencePillActive]}
                    onPress={() => setRecurrence(opt.value)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: recurrence === opt.value }}
                    accessibilityLabel={`Repeats: ${opt.label}`}
                  >
                    <Text style={[styles.recurrenceText, recurrence === opt.value && styles.recurrenceTextActive]}>
                      {opt.value ? '🔁 ' : ''}{opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {recurrence && (
                <DateInput
                  style={styles.modalInput}
                  value={recurrenceUntil}
                  onChange={setRecurrenceUntil}
                  accessibilityLabel="Repeat until (optional)"
                />
              )}
              {recurrence && !recurrenceUntil && (
                <Text style={styles.recurrenceHint}>
                  Repeats {recurrence === 'biweekly' ? 'every 2 weeks' : recurrence} — set an end date above, or leave blank to repeat indefinitely.
                </Text>
              )}
            </>
          ) : (
            <TextInput
              style={[styles.modalInput, { height: 60 }]}
              placeholder="Notes (optional)"
              placeholderTextColor={colors.mid}
              value={notes}
              onChangeText={setNotes}
              multiline
            />
          )}

          <TouchableOpacity
            style={[styles.modalSaveButton, (!title.trim() || !dateStr.trim() || saving) && styles.modalSaveDisabled]}
            onPress={handleSave}
            disabled={!title.trim() || !dateStr.trim() || saving}
          >
            <Text style={styles.modalSaveText}>
              {saving ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatTime(isoStr: string): string {
  const d = new Date(isoStr);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatWeekLabel(start: Date, end: Date): string {
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold, color: colors.navy },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.teal,
    minWidth: 52,
    alignItems: 'center',
  },
  syncButtonDisabled: {
    borderColor: colors.border,
  },
  syncButtonText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.teal,
    justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  toggleRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6,
  },
  togglePill: { flex: 1, paddingVertical: 6, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center' },
  togglePillActive: { backgroundColor: colors.teal },
  toggleText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium },
  toggleTextActive: { color: colors.white },
  scopeRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
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
  weekNav: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  weekNavArrow: { fontSize: 24, color: colors.teal, paddingHorizontal: 8 },
  weekLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.navy },
  dayHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: spacing.sm, backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  dayHeader: { alignItems: 'center', width: 40 },
  dayHeaderToday: { backgroundColor: '#E0F7FA', borderRadius: 20, paddingVertical: 2 },
  dayName: { fontSize: 10, color: colors.mid, fontWeight: fonts.weights.medium },
  dayNameToday: { color: colors.teal },
  dayNum: { fontSize: fonts.sizes.sm, color: colors.dark, fontWeight: fonts.weights.semibold, marginTop: 1 },
  dayNumToday: { color: colors.teal },
  dayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.teal, marginTop: 2 },
  listContent: { padding: spacing.md, paddingBottom: spacing['2xl'] },
  loadErrorBanner: {
    backgroundColor: '#FEE2E2',
    borderBottomWidth: 1,
    borderBottomColor: '#FECACA',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  loadErrorTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: '#991B1B',
  },
  loadErrorText: { fontSize: fonts.sizes.xs, color: '#B91C1C', marginTop: 2, lineHeight: 16 },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  reconnectEmoji: { fontSize: 20 },
  reconnectBody: { flex: 1 },
  reconnectTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: '#92400E',
  },
  reconnectText: { fontSize: fonts.sizes.xs, color: '#B45309', marginTop: 1, lineHeight: 16 },
  reminderBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  reminderBannerEmoji: { fontSize: 22 },
  reminderBannerBody: { flex: 1 },
  reminderBannerTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
  },
  reminderBannerText: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 1,
  },
  dayGroup: { marginBottom: spacing.lg },
  dayGroupHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dayGroupDate: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.navy },
  dayGroupDateToday: { color: colors.teal },
  dayGroupCount: { fontSize: 10, color: colors.mid },
  apptCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, marginBottom: spacing.sm, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  apptCardCancelled: { opacity: 0.5 },
  apptStripe: { width: 4, alignSelf: 'stretch' },
  apptTimeCol: { paddingHorizontal: spacing.sm, alignItems: 'center', width: 65 },
  apptTime: { fontSize: 11, fontWeight: fonts.weights.semibold, color: colors.dark },
  apptTimeEnd: { fontSize: 9, color: colors.mid },
  apptContent: { flex: 1, paddingVertical: spacing.sm },
  apptTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.dark },
  apptTitleCancelled: { textDecorationLine: 'line-through', color: colors.mid },
  apptLocation: { fontSize: 10, color: colors.mid, marginTop: 2 },
  apptType: { fontSize: 9, color: colors.mid, marginTop: 2 },
  statusBadge: {
    width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.sm,
  },
  statusBadgeText: { fontSize: 14, color: colors.teal },
  deadlineCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md,
    marginBottom: spacing.sm, borderLeftWidth: 4, borderLeftColor: '#2563EB',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  deadlineOverdue: { borderLeftColor: '#DC2626', backgroundColor: '#FEF2F2' },
  deadlineUrgent: { borderLeftColor: '#EA580C', backgroundColor: '#FFFBEB' },
  deadlineLeft: { flexDirection: 'row', flex: 1, gap: 10 },
  deadlineEmoji: { fontSize: 22, marginTop: 2 },
  deadlineContent: { flex: 1 },
  deadlineTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.dark },
  deadlineType: { fontSize: 10, color: colors.mid, marginTop: 2 },
  deadlineDue: { fontSize: 11, color: colors.mid, marginTop: 4 },
  deadlineDueOverdue: { color: '#DC2626', fontWeight: fonts.weights.semibold },
  deadlineDueUrgent: { color: '#EA580C', fontWeight: fonts.weights.medium },
  deadlineNotes: { fontSize: 10, color: colors.mid, marginTop: 4, fontStyle: 'italic' },
  completeButton: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#E0F7EA', justifyContent: 'center', alignItems: 'center',
  },
  completeButtonText: { fontSize: 16, color: colors.sage, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: spacing.xl },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy, marginBottom: spacing.sm },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', lineHeight: 20 },
  // Modal styles
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.lg, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  modalClose: { fontSize: 20, color: colors.mid, padding: 4 },
  modalToggle: { flexDirection: 'row', gap: 8, marginBottom: spacing.lg },
  modalTogglePill: { flex: 1, paddingVertical: 8, borderRadius: 12, backgroundColor: colors.light, alignItems: 'center' },
  modalTogglePillActive: { backgroundColor: colors.teal },
  modalToggleText: { fontSize: 13, color: colors.dark, fontWeight: fonts.weights.medium },
  modalToggleTextActive: { color: colors.white },
  modalInput: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radii.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    fontSize: fonts.sizes.sm, color: colors.dark, marginBottom: spacing.sm,
  },
  recurrenceRow: { flexDirection: 'row', gap: 6, marginBottom: spacing.sm },
  recurrencePill: {
    flex: 1, paddingVertical: 7, borderRadius: 12, backgroundColor: colors.light,
    alignItems: 'center', minHeight: 32, justifyContent: 'center',
  },
  recurrencePillActive: { backgroundColor: colors.teal },
  recurrenceText: { fontSize: 11, color: colors.dark, fontWeight: fonts.weights.medium },
  recurrenceTextActive: { color: colors.white },
  recurrenceHint: { fontSize: 11, color: colors.mid, marginBottom: spacing.sm },
  modalSaveButton: {
    backgroundColor: colors.teal, borderRadius: radii.md,
    paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm,
  },
  modalSaveDisabled: { backgroundColor: colors.border },
  modalSaveText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.white },
});
