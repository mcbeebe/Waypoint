/**
 * Action → Google Calendar event modal.
 *
 * Creates a Google Calendar event from an action (title, date/time,
 * duration, notes) with optional attendees — Google emails invitees an
 * invitation. Reopening for an action that already has an event loads it
 * for editing (change time, add/remove attendees) or removal; attendees
 * are notified of updates and cancellations.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import DateInput from '@/components/DateInput';
import { useToast } from '@/components/Toast';
import {
  createCalendarEvent,
  getCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/googleCalendar';
import { actionUrl, withWaypointLink, stripWaypointLink } from '@/lib/appLinks';
import type { Action } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const DURATIONS = [30, 60, 90, 120] as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** "a@b.com, c@d.com; e@f.com" → valid unique emails */
export function parseAttendeeEmails(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => s && EMAIL_RE.test(s))
    )
  );
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

/** Local YYYY-MM-DD + HH:MM from an ISO dateTime */
function splitLocal(dateTime: string): { date: string; time: string } {
  const d = new Date(dateTime);
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  };
}

interface ActionEventModalProps {
  visible: boolean;
  action: Action;
  onClose: () => void;
  /** Persist the event linkage (null = event removed) */
  onSaved: (googleEventId: string | null) => void;
}

export default function ActionEventModal({ visible, action, onClose, onSaved }: ActionEventModalProps) {
  const { showToast } = useToast();
  const isEdit = !!action.google_event_id;

  const [prefilling, setPrefilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState<number>(60);
  const [attendeesText, setAttendeesText] = useState('');
  const [notes, setNotes] = useState('');
  const [htmlLink, setHtmlLink] = useState<string | null>(null);

  // Prefill on open: existing event (edit) or sensible defaults (create)
  useEffect(() => {
    if (!visible) return;
    setError(null);
    setHtmlLink(null);

    if (action.google_event_id) {
      setPrefilling(true);
      getCalendarEvent(action.google_event_id)
        .then((ev) => {
          setTitle(ev.summary);
          setNotes(stripWaypointLink(ev.description ?? ''));
          setHtmlLink(ev.htmlLink || null);
          setAttendeesText((ev.attendees ?? []).map((a) => a.email).join(', '));
          if (ev.start.dateTime && ev.end.dateTime) {
            const { date: d, time: t } = splitLocal(ev.start.dateTime);
            setDate(d);
            setTime(t);
            const mins = Math.round(
              (new Date(ev.end.dateTime).getTime() - new Date(ev.start.dateTime).getTime()) / 60000
            );
            setDuration(mins > 0 ? mins : 60);
          }
        })
        .catch((err) => {
          // Event may have been deleted directly in Google Calendar —
          // fall back to create-mode defaults and clear the stale link
          if (String(err).includes('404') || String(err).includes('410')) {
            onSaved(null);
            applyCreateDefaults();
          } else {
            setError(friendlyError(err));
          }
        })
        .finally(() => setPrefilling(false));
    } else {
      applyCreateDefaults();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const applyCreateDefaults = useCallback(() => {
    setTitle(action.title);
    if (action.due_date) {
      setDate(action.due_date);
    } else {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
    }
    setTime('09:00');
    setDuration(60);
    setAttendeesText('');
    const firstLine = (action.description ?? '').split('\n')[0];
    // The Waypoint link isn't shown in this field — it's attached on save,
    // so the parent edits their own notes without a URL in the way.
    setNotes(`${firstLine}${firstLine ? '\n\n' : ''}From your Waypoint action plan.`);
  }, [action]);

  const friendlyError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('No Google access token') || msg.includes('sign in')) {
      return 'Connect your Google account first — Profile → Google Account → Connect.';
    }
    return msg.length > 200 ? 'Google Calendar request failed — please try again.' : msg;
  };

  const handleSave = async () => {
    if (saving) return;
    setError(null);

    if (!title.trim()) {
      setError('Give the event a title.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
      setError('Enter a valid date (YYYY-MM-DD) and time (HH:MM).');
      return;
    }
    const rawEntries = attendeesText.split(/[,;\s]+/).map((s) => s.trim()).filter(Boolean);
    const attendees = parseAttendeeEmails(attendeesText);
    if (rawEntries.length !== attendees.length) {
      setError('One of the attendee emails doesn\'t look right — use full addresses, separated by commas.');
      return;
    }

    const start = new Date(`${date}T${time}:00`);
    if (isNaN(start.getTime())) {
      setError('That date/time couldn\'t be read — please check it.');
      return;
    }
    const end = new Date(start.getTime() + duration * 60000);
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // Always (re)attach the deep link so tapping the event in Google
    // Calendar comes back here to update status — including on events
    // created before this existed, and without stacking duplicates.
    const description = withWaypointLink(notes.trim(), actionUrl(action.id));

    const payload = {
      summary: title.trim(),
      description,
      start: { dateTime: start.toISOString(), timeZone },
      end: { dateTime: end.toISOString(), timeZone },
      attendees: attendees.map((email) => ({ email })),
    };

    setSaving(true);
    try {
      if (isEdit && action.google_event_id) {
        await updateCalendarEvent(action.google_event_id, payload);
        showToast(
          attendees.length > 0 ? 'Event updated — attendees notified' : 'Event updated',
          'success'
        );
        onSaved(action.google_event_id);
      } else {
        const ev = await createCalendarEvent(payload);
        showToast(
          attendees.length > 0 ? 'Added to Google Calendar — invitations sent' : 'Added to Google Calendar',
          'success'
        );
        onSaved(ev.id);
      }
      onClose();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (removing || !action.google_event_id) return;
    setRemoving(true);
    setError(null);
    try {
      await deleteCalendarEvent(action.google_event_id);
      showToast('Event removed from Google Calendar', 'success');
      onSaved(null);
      onClose();
    } catch (err) {
      // Already gone in Google? Still clear our link.
      if (String(err).includes('404') || String(err).includes('410')) {
        onSaved(null);
        onClose();
      } else {
        setError(friendlyError(err));
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>
              {isEdit ? 'Edit calendar event' : 'Add to Google Calendar'}
            </Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          {prefilling ? (
            <ActivityIndicator size="small" color={colors.teal} style={styles.spinner} />
          ) : (
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={colors.mid}
              />

              <View style={styles.row}>
                <View style={styles.rowItem}>
                  <Text style={styles.label}>Date</Text>
                  <DateInput value={date} onChange={setDate} />
                </View>
                <View style={styles.rowItemSmall}>
                  <Text style={styles.label}>Time</Text>
                  <TextInput
                    style={styles.input}
                    value={time}
                    onChangeText={setTime}
                    placeholder="HH:MM"
                    placeholderTextColor={colors.mid}
                    maxLength={5}
                  />
                </View>
              </View>

              <Text style={styles.label}>Duration</Text>
              <View style={styles.durationRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.durationPill, duration === d && styles.durationPillActive]}
                    onPress={() => setDuration(d)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: duration === d }}
                  >
                    <Text style={[styles.durationText, duration === d && styles.durationTextActive]}>
                      {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? '30' : ''}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Invite people (optional)</Text>
              <TextInput
                style={styles.input}
                value={attendeesText}
                onChangeText={setAttendeesText}
                placeholder="advocate@email.com, spouse@email.com"
                placeholderTextColor={colors.mid}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.hint}>
                They'll get a Google Calendar invitation by email and can RSVP.
              </Text>

              <Text style={styles.label}>Notes</Text>
              <TextInput
                style={[styles.input, styles.notesInput]}
                value={notes}
                onChangeText={setNotes}
                multiline
                textAlignVertical="top"
                placeholder="Agenda, phone number to call, documents to bring…"
                placeholderTextColor={colors.mid}
              />
              <Text style={styles.hint}>
                A link back to this action in Waypoint is added automatically — tap it from
                Google Calendar to see the details and update its status.
              </Text>

              {error && <Text style={styles.errorText}>{error}</Text>}

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.btnDisabled]}
                onPress={handleSave}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={isEdit ? 'Save event changes' : 'Create calendar event'}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {isEdit ? 'Save changes' : 'Create event'}
                  </Text>
                )}
              </TouchableOpacity>

              {isEdit && htmlLink && (
                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => Linking.openURL(htmlLink).catch(() => {})}
                  accessibilityRole="button"
                  accessibilityLabel="Open in Google Calendar"
                >
                  <Text style={styles.linkBtnText}>Open in Google Calendar ↗</Text>
                </TouchableOpacity>
              )}

              {isEdit && (
                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={handleRemove}
                  disabled={removing}
                  accessibilityRole="button"
                  accessibilityLabel="Remove event from Google Calendar"
                >
                  {removing ? (
                    <ActivityIndicator size="small" color="#DC2626" />
                  ) : (
                    <Text style={styles.removeBtnText}>Remove from calendar</Text>
                  )}
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  closeX: {
    fontSize: 18,
    color: colors.mid,
    padding: 4,
  },
  spinner: {
    paddingVertical: spacing.xl,
  },
  label: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.mid,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: 4,
  },
  input: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.base,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
  },
  notesInput: {
    minHeight: 70,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  rowItem: {
    flex: 1.4,
  },
  rowItemSmall: {
    flex: 1,
  },
  durationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  durationPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    minHeight: 36,
    justifyContent: 'center',
  },
  durationPillActive: {
    backgroundColor: colors.teal,
  },
  durationText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  durationTextActive: {
    color: colors.white,
  },
  hint: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 4,
  },
  errorText: {
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
    marginTop: spacing.sm,
  },
  saveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    minHeight: 44,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  linkBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    minHeight: 36,
    justifyContent: 'center',
  },
  linkBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  removeBtn: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginTop: 2,
    minHeight: 36,
    justifyContent: 'center',
  },
  removeBtnText: {
    fontSize: fonts.sizes.sm,
    color: '#DC2626',
  },
});
