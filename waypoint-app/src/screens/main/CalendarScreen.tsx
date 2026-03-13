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

import React, { useState, useMemo, useCallback } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useAppointments } from '@/hooks/useAppointments';
import { useDeadlines } from '@/hooks/useDeadlines';
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

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function CalendarScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';

  const [viewMode, setViewMode] = useState<ViewMode>('upcoming');
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

  const loading = loadingAppts || loadingDeadlines;

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchAppts(), refetchDeadlines()]);
  }, [refetchAppts, refetchDeadlines]);

  // Navigate weeks
  const shiftWeek = (direction: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + direction * 7);
    setSelectedDate(d);
  };

  // Group appointments by day
  const appointmentsByDay = useMemo(() => {
    const groups: Record<string, Appointment[]> = {};
    for (const appt of appointments) {
      const day = appt.start_time.split('T')[0];
      if (!groups[day]) groups[day] = [];
      groups[day].push(appt);
    }
    return groups;
  }, [appointments]);

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
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
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
          await createAppointment(data);
          setShowAddModal(false);
        }}
        onAddDeadline={async (data) => {
          await createDeadline(data);
          setShowAddModal(false);
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
  appointments: Appointment[];
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
        <AppointmentCard key={appt.id} appointment={appt} onStatusChange={onStatusChange} />
      ))}
    </View>
  );
}

// ─── Appointment Card ───────────────────────────────────────────────────────

function AppointmentCard({
  appointment,
  onStatusChange,
}: {
  appointment: Appointment;
  onStatusChange: (id: string, status: Appointment['status']) => void;
}) {
  const config = APPOINTMENT_TYPE_CONFIG[appointment.appointment_type ?? 'other'] ?? APPOINTMENT_TYPE_CONFIG.other;
  const startTime = formatTime(appointment.start_time);
  const endTime = appointment.end_time ? formatTime(appointment.end_time) : null;
  const isCancelled = appointment.status === 'cancelled';

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
        <Text style={styles.apptType}>{config.label}</Text>
      </View>
      <TouchableOpacity
        style={styles.statusBadge}
        onPress={() => {
          const next = appointment.status === 'scheduled' ? 'completed' : 'scheduled';
          onStatusChange(appointment.id, next as Appointment['status']);
        }}
      >
        <Text style={styles.statusBadgeText}>
          {appointment.status === 'completed' ? '✓' : '○'}
        </Text>
      </TouchableOpacity>
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
  onAddAppointment: (data: { title: string; start_time: string; appointment_type?: AppointmentType; location?: string }) => Promise<void>;
  onAddDeadline: (data: { title: string; deadline_type: DeadlineType; due_date: string; notes?: string }) => Promise<void>;
}

function AddModal({ visible, onClose, onAddAppointment, onAddDeadline }: AddModalProps) {
  const [mode, setMode] = useState<'appointment' | 'deadline'>('appointment');
  const [title, setTitle] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setTitle('');
    setDateStr('');
    setLocation('');
    setNotes('');
    setSaving(false);
  };

  const handleSave = async () => {
    if (!title.trim() || !dateStr.trim()) return;
    setSaving(true);

    try {
      if (mode === 'appointment') {
        await onAddAppointment({
          title: title.trim(),
          start_time: new Date(dateStr).toISOString(),
          location: location.trim() || undefined,
        });
      } else {
        await onAddDeadline({
          title: title.trim(),
          deadline_type: 'other',
          due_date: dateStr.trim(),
          notes: notes.trim() || undefined,
        });
      }
      reset();
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
          <TextInput
            style={styles.modalInput}
            placeholder={mode === 'appointment' ? 'Date & time (YYYY-MM-DD HH:MM)' : 'Due date (YYYY-MM-DD)'}
            placeholderTextColor={colors.mid}
            value={dateStr}
            onChangeText={setDateStr}
          />
          {mode === 'appointment' ? (
            <TextInput
              style={styles.modalInput}
              placeholder="Location (optional)"
              placeholderTextColor={colors.mid}
              value={location}
              onChangeText={setLocation}
            />
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

// ─── Empty State ────────────────────────────────────────────────────────────

function EmptyState({ emoji, title, subtitle }: { emoji: string; title: string; subtitle: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyEmoji}>{emoji}</Text>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySubtitle}>{subtitle}</Text>
    </View>
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
  modalSaveButton: {
    backgroundColor: colors.teal, borderRadius: radii.md,
    paddingVertical: 12, alignItems: 'center', marginTop: spacing.sm,
  },
  modalSaveDisabled: { backgroundColor: colors.border },
  modalSaveText: { fontSize: fonts.sizes.base, fontWeight: fonts.weights.semibold, color: colors.white },
});
