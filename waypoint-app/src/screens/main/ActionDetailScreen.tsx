/**
 * Action Detail screen — shows full action with script, steps, KB links
 * Sprint 3: S3-03
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Linking,
  Platform,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useToast } from '@/components/Toast';
import { SafeAreaView } from 'react-native-safe-area-context';
import type {
  Action,
  ActionStatus,
  ActionStep,
  ActionCategory,
  ActionPriority,
} from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { useTextScale } from '@/lib/textSize';
import { parseActionDescription, extractLinks, formatActionForSharing } from '@/lib/actionContent';
import LearnMoreSheet, { LEARN_MORE_BY_ACTION_TITLE } from '@/components/LearnMoreSheet';
import ActionEventModal from '@/components/ActionEventModal';
import DateInput from '@/components/DateInput';
import { getCalendarEvent, updateCalendarEvent } from '@/lib/googleCalendar';

interface ActionDetailScreenProps {
  action: Action;
  onUpdateStatus: (status: ActionStatus, reason?: string) => void;
  onToggleStep: (stepIndex: number) => void;
  onUpdate: (data: Partial<Action>) => void;
  onBack: () => void;
}

const STATUS_OPTIONS: Array<{ status: ActionStatus; label: string; emoji: string; color: string }> = [
  { status: 'not_started', label: 'Not Started', emoji: '○', color: '#94A3B8' },
  { status: 'in_progress', label: 'In Progress', emoji: '◐', color: '#0891B2' },
  { status: 'completed', label: 'Completed', emoji: '●', color: '#10B981' },
  { status: 'dismissed', label: 'Dismissed', emoji: '—', color: '#CBD5E1' },
];

const CATEGORY_LABELS: Record<ActionCategory, string> = {
  regional_center: '🏛️ Regional Center',
  iep: '🏫 IEP / School',
  insurance: '🏥 Insurance',
  benefits: '💰 Benefits',
  medical: '⚕️ Medical',
  legal: '⚖️ Legal',
  general: '📋 General',
};

const PRIORITY_LABELS: Record<ActionPriority, { label: string; color: string }> = {
  urgent: { label: 'Urgent', color: '#DC2626' },
  high: { label: 'High', color: '#EA580C' },
  medium: { label: 'Medium', color: '#2563EB' },
  low: { label: 'Low', color: '#64748B' },
};

export default function ActionDetailScreen({
  action,
  onUpdateStatus,
  onToggleStep,
  onUpdate,
  onBack,
}: ActionDetailScreenProps) {
  const [dismissReason, setDismissReason] = useState('');
  const [showDismissInput, setShowDismissInput] = useState(false);
  const [learnKey, setLearnKey] = useState<string | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  // Deadline editing: the due date is system-suggested but user-editable
  const [editingDue, setEditingDue] = useState(false);
  const [dueDraft, setDueDraft] = useState('');
  const [savingDue, setSavingDue] = useState(false);
  const { showToast } = useToast();
  const learnMoreKey = LEARN_MORE_BY_ACTION_TITLE[action.title];
  const { scale, cycleScale } = useTextScale();
  /** Scaled font size — applied to all reading-heavy text */
  const sz = (n: number) => Math.round(n * scale);

  const stepsDone = action.steps?.filter((s) => s.done).length ?? 0;
  const stepsTotal = action.steps?.length ?? 0;

  const content = useMemo(
    () => parseActionDescription(action.description ?? ''),
    [action.description]
  );
  const { links, phones } = useMemo(
    () =>
      extractLinks([
        action.description,
        action.script,
        ...(action.steps?.map((s) => s.step) ?? []),
      ]),
    [action.description, action.script, action.steps]
  );

  const openDueEditor = () => {
    setDueDraft(action.due_date ?? '');
    setEditingDue(true);
  };

  /**
   * Save an edited deadline. If the action is linked to a Google Calendar
   * event, move that event to the new date too (keeping its time of day,
   * duration, and attendees — Google notifies invitees of the change).
   */
  const handleSaveDueDate = async () => {
    if (savingDue) return;
    if (dueDraft && !/^\d{4}-\d{2}-\d{2}$/.test(dueDraft)) {
      showToast('Enter a valid date (YYYY-MM-DD)', 'error');
      return;
    }
    setSavingDue(true);
    try {
      onUpdate({ due_date: dueDraft || null });

      if (action.google_event_id && dueDraft) {
        try {
          const ev = await getCalendarEvent(action.google_event_id);
          if (ev.start.dateTime && ev.end.dateTime) {
            const oldStart = new Date(ev.start.dateTime);
            const durationMs = new Date(ev.end.dateTime).getTime() - oldStart.getTime();
            const [y, m, d] = dueDraft.split('-').map(Number);
            const start = new Date(oldStart);
            start.setFullYear(y, m - 1, d);
            const end = new Date(start.getTime() + durationMs);
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            await updateCalendarEvent(action.google_event_id, {
              start: { dateTime: start.toISOString(), timeZone },
              end: { dateTime: end.toISOString(), timeZone },
            });
          }
          showToast('Deadline updated — Google Calendar event moved', 'success');
        } catch {
          showToast("Deadline saved, but the calendar event couldn't be moved — tap the calendar chip to fix it.", 'error');
        }
      } else {
        showToast(dueDraft ? 'Deadline updated' : 'Deadline cleared', 'success');
      }
      setEditingDue(false);
    } finally {
      setSavingDue(false);
    }
  };

  const handleStatusChange = (status: ActionStatus) => {
    if (status === 'dismissed') {
      setShowDismissInput(true);
      return;
    }
    onUpdateStatus(status);
  };

  const handleDismiss = () => {
    onUpdateStatus('dismissed', dismissReason || undefined);
    setShowDismissInput(false);
  };

  /**
   * Share the whole action as plain text with someone outside the app
   * (partner, advocate, grandparent): native share sheet where available,
   * clipboard fallback on desktop browsers.
   */
  const handleShare = async () => {
    const text = formatActionForSharing(action);
    try {
      if (Platform.OS === 'web') {
        const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> }) : null;
        if (nav?.share) {
          await nav.share({ title: action.title, text });
          return;
        }
        await Clipboard.setStringAsync(text);
        showToast('Copied! Paste it into a text or email.', 'success');
        return;
      }
      await Share.share({ message: text }, { dialogTitle: action.title });
    } catch {
      // Share sheet dismissed — not an error
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareButton}
            accessibilityRole="button"
            accessibilityLabel="Share this action with someone"
          >
            <Ionicons name="share-outline" size={18} color={colors.teal} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={cycleScale}
            style={styles.textSizeButton}
            accessibilityRole="button"
            accessibilityLabel={`Text size ${Math.round(scale * 100)} percent. Tap to change.`}
          >
            <Text style={styles.textSizeButtonText}>Aa {Math.round(scale * 100)}%</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Title + Meta */}
        <Text style={styles.title}>{action.title}</Text>

        <View style={styles.metaRow}>
          <Text style={styles.categoryLabel}>
            {CATEGORY_LABELS[action.category]}
          </Text>
          <Text style={[styles.priorityLabel, { color: PRIORITY_LABELS[action.priority].color }]}>
            {PRIORITY_LABELS[action.priority].label} Priority
          </Text>
        </View>

        {/* At-a-glance chips: when, calendar link, how big a lift, steps */}
        <View style={styles.chipRow}>
          <TouchableOpacity
            style={[styles.chip, styles.chipDue]}
            onPress={openDueEditor}
            accessibilityRole="button"
            accessibilityLabel={action.due_date ? `Deadline ${formatDate(action.due_date)}. Tap to change.` : 'Set a deadline'}
          >
            <Text style={[styles.chipText, { fontSize: sz(12) }]}>
              📅 {action.due_date ? `Due ${formatDate(action.due_date)}` : 'Set deadline'}  ✏️
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, styles.chipCalendar]}
            onPress={() => setShowEventModal(true)}
            accessibilityRole="button"
            accessibilityLabel={action.google_event_id ? 'On your Google Calendar. Tap to edit the event or attendees.' : 'Add this action to Google Calendar'}
          >
            <Text style={[styles.chipText, styles.chipCalendarText, { fontSize: sz(12) }]}>
              🗓️ {action.google_event_id ? 'On calendar · Edit' : 'Add to Calendar'}
            </Text>
          </TouchableOpacity>
          {content.timeline && (
            <View style={styles.chip}>
              <Text style={[styles.chipText, { fontSize: sz(12) }]}>⏰ {content.timeline}</Text>
            </View>
          )}
          {stepsTotal > 0 && (
            <View style={styles.chip}>
              <Text style={[styles.chipText, { fontSize: sz(12) }]}>✅ {stepsTotal} steps</Text>
            </View>
          )}
        </View>

        {/* Inline deadline editor — suggested by Waypoint, yours to change */}
        {editingDue && (
          <View style={styles.dueEditor}>
            <Text style={[styles.cardLabel, { fontSize: sz(11) }]}>
              📅 DEADLINE — suggested by Waypoint, yours to change
            </Text>
            <DateInput value={dueDraft} onChange={setDueDraft} />
            {action.google_event_id ? (
              <Text style={[styles.dueEditorHint, { fontSize: sz(12) }]}>
                Your linked Google Calendar event will move to the new date, and attendees will be notified.
              </Text>
            ) : null}
            <View style={styles.dueEditorButtons}>
              <TouchableOpacity
                style={[styles.dueSaveBtn, savingDue && { opacity: 0.7 }]}
                onPress={handleSaveDueDate}
                disabled={savingDue}
                accessibilityRole="button"
                accessibilityLabel="Save deadline"
              >
                <Text style={styles.dueSaveText}>{savingDue ? 'Saving…' : 'Save deadline'}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dueCancelBtn}
                onPress={() => setEditingDue(false)}
                accessibilityRole="button"
                accessibilityLabel="Cancel deadline edit"
              >
                <Text style={styles.dueCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Effort — the honest "how big is this lift" */}
        {content.effort && (
          <View style={styles.effortCard}>
            <Text style={[styles.effortLabel, { fontSize: sz(11) }]}>🕒 YOUR TIME</Text>
            <Text style={[styles.effortText, { fontSize: sz(14) }]}>{content.effort}</Text>
          </View>
        )}

        {/* One-tap links: apply online or call directly */}
        {(links.length > 0 || phones.length > 0) && (
          <View style={styles.linkSection}>
            {links.map((link) => (
              <TouchableOpacity
                key={link.url}
                style={styles.linkButton}
                onPress={() => Linking.openURL(link.url)}
                accessibilityRole="link"
                accessibilityLabel={link.label}
              >
                <Text style={[styles.linkButtonText, { fontSize: sz(14) }]}>🌐 {link.label}</Text>
              </TouchableOpacity>
            ))}
            {phones.map((phone) => (
              <TouchableOpacity
                key={phone.number}
                style={[styles.linkButton, styles.phoneButton]}
                onPress={() => Linking.openURL(`tel:${phone.number}`)}
                accessibilityRole="link"
                accessibilityLabel={phone.label}
              >
                <Text style={[styles.linkButtonText, styles.phoneButtonText, { fontSize: sz(14) }]}>📞 {phone.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* What this is */}
        {content.summary ? (
          <Text style={[styles.description, { fontSize: sz(15), lineHeight: sz(23) }]}>{content.summary}</Text>
        ) : null}

        {/* Why this matters — the benefit, front and center */}
        {content.why && (
          <View style={styles.whyCard}>
            <Text style={[styles.cardLabel, styles.whyLabel, { fontSize: sz(11) }]}>⭐ WHY THIS MATTERS</Text>
            <Text style={[styles.cardBody, { fontSize: sz(14.5), lineHeight: sz(22) }]}>{content.why}</Text>
          </View>
        )}

        {/* Do I qualify? */}
        {content.eligibility && (
          <View style={styles.qualifyCard}>
            <Text style={[styles.cardLabel, styles.qualifyLabel, { fontSize: sz(11) }]}>✅ DO I QUALIFY?</Text>
            <Text style={[styles.cardBody, { fontSize: sz(14.5), lineHeight: sz(22) }]}>{content.eligibility}</Text>
          </View>
        )}

        {/* Documents to gather */}
        {content.documents.length > 0 && (
          <View style={styles.docsCard}>
            <Text style={[styles.cardLabel, { fontSize: sz(11) }]}>📄 DOCUMENTS TO GATHER</Text>
            {content.documents.map((doc, i) => (
              <View key={i} style={styles.docRow}>
                <Text style={[styles.docBullet, { fontSize: sz(14) }]}>•</Text>
                <Text style={[styles.cardBody, styles.docText, { fontSize: sz(14), lineHeight: sz(21) }]}>{doc}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Insider tip */}
        {content.tip && (
          <View style={styles.tipCard}>
            <Text style={[styles.cardLabel, styles.tipLabel, { fontSize: sz(11) }]}>💡 INSIDER TIP</Text>
            <Text style={[styles.cardBody, { fontSize: sz(14.5), lineHeight: sz(22) }]}>{content.tip}</Text>
          </View>
        )}

        {/* Learn more explainer */}
        {learnMoreKey && (
          <TouchableOpacity
            style={styles.learnMoreButton}
            onPress={() => setLearnKey(learnMoreKey)}
            accessibilityRole="button"
            accessibilityLabel={`Learn more about ${learnMoreKey}`}
          >
            <Text style={[styles.learnMoreText, { fontSize: sz(14) }]}>
              📖 What is {learnMoreKey}? Learn more
            </Text>
          </TouchableOpacity>
        )}

        {/* Status Selector */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Status</Text>
          <View style={styles.statusRow}>
            {STATUS_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.status}
                style={[
                  styles.statusPill,
                  action.status === opt.status && { backgroundColor: opt.color },
                ]}
                onPress={() => handleStatusChange(opt.status)}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    action.status === opt.status && styles.statusPillTextActive,
                  ]}
                >
                  {opt.emoji} {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {showDismissInput && (
            <View style={styles.dismissBox}>
              <TextInput
                style={styles.dismissInput}
                placeholder="Reason for dismissing (optional)"
                placeholderTextColor={colors.mid}
                value={dismissReason}
                onChangeText={setDismissReason}
              />
              <TouchableOpacity style={styles.dismissButton} onPress={handleDismiss}>
                <Text style={styles.dismissButtonText}>Dismiss</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Script */}
        {action.script && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📝 Suggested Script</Text>
            <View style={styles.scriptBox}>
              <Text style={[styles.scriptText, { fontSize: sz(14), lineHeight: sz(22) }]}>{action.script}</Text>
            </View>
            <Text style={styles.scriptHint}>
              You can read this when calling your Regional Center or school district.
            </Text>
          </View>
        )}

        {/* Steps Checklist */}
        {action.steps && action.steps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              ✅ Steps ({stepsDone}/{stepsTotal})
            </Text>
            {action.steps.map((step, index) => (
              <TouchableOpacity
                key={index}
                style={styles.stepRow}
                onPress={() => onToggleStep(index)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: step.done }}
              >
                <View style={[styles.checkbox, step.done && styles.checkboxDone]}>
                  {step.done && <Text style={styles.checkmark}>✓</Text>}
                </View>
                <Text style={[styles.stepText, step.done && styles.stepTextDone, { fontSize: sz(14), lineHeight: sz(21) }]}>
                  {step.step}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* KB Article Links */}
        {action.kb_article_ids && action.kb_article_ids.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📚 Related Knowledge Base</Text>
            {action.kb_article_ids.map((articleId) => (
              <View key={articleId} style={styles.kbLink}>
                <Text style={styles.kbLinkText}>
                  {articleId} — Tap to view article
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Timeline Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Timeline</Text>
          <View style={styles.timelineGrid}>
            {action.due_date && (
              <TimelineItem label="Due Date" value={formatDate(action.due_date)} />
            )}
            {action.follow_up_date && (
              <TimelineItem label="Follow-up" value={formatDate(action.follow_up_date)} />
            )}
            <TimelineItem label="Created" value={formatDate(action.created_at)} />
            {action.completed_at && (
              <TimelineItem label="Completed" value={formatDate(action.completed_at)} />
            )}
          </View>
          {action.follow_up_note && (
            <Text style={styles.followUpNote}>Note: {action.follow_up_note}</Text>
          )}
          {/* Text-myself reminder (wave 3, ported from GAS smsReminder) —
              native only; the web has no SMS handler */}
          {Platform.OS !== 'web' && action.status !== 'completed' && (
            <TouchableOpacity
              style={styles.smsButton}
              onPress={() => {
                const body = action.follow_up_note || `Waypoint reminder: ${action.title}`;
                const url =
                  Platform.OS === 'ios'
                    ? `sms:&body=${encodeURIComponent(body)}`
                    : `sms:?body=${encodeURIComponent(body)}`;
                Linking.openURL(url).catch(() => {});
              }}
              accessibilityRole="button"
              accessibilityLabel="Text this reminder to yourself"
            >
              <Text style={styles.smsButtonText}>📱 Text me this reminder</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Google Calendar (021): turn this action into a real event with invitees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🗓️ Google Calendar</Text>
          {action.google_event_id ? (
            <>
              <Text style={styles.calendarStatus}>
                ✅ This action is on your Google Calendar.
              </Text>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowEventModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Edit calendar event, time, or attendees"
              >
                <Text style={styles.calendarButtonText}>Edit event / attendees</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.calendarStatus}>
                Schedule this as a calendar event — and invite your spouse, advocate, or anyone
                else who should be there.
              </Text>
              <TouchableOpacity
                style={styles.calendarButton}
                onPress={() => setShowEventModal(true)}
                accessibilityRole="button"
                accessibilityLabel="Add this action to Google Calendar"
              >
                <Text style={styles.calendarButtonText}>Add to Google Calendar</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Source */}
        <View style={styles.sourceRow}>
          <Text style={styles.sourceText}>
            Source: {action.source === 'ai_navigator' ? '🧭 AI Navigator' : action.source === 'system' ? '⚙️ System' : '✏️ Manual'}
          </Text>
        </View>
      </ScrollView>

      <LearnMoreSheet learnKey={learnKey} onClose={() => setLearnKey(null)} />

      <ActionEventModal
        visible={showEventModal}
        action={action}
        onClose={() => setShowEventModal(false)}
        onSaved={(googleEventId) => onUpdate({ google_event_id: googleEventId })}
      />
    </SafeAreaView>
  );
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.timelineItem}>
      <Text style={styles.timelineLabel}>{label}</Text>
      <Text style={styles.timelineValue}>{value}</Text>
    </View>
  );
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFB',
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  textSizeButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    minHeight: 32,
    justifyContent: 'center',
  },
  textSizeButtonText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.teal,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
  },
  chipDue: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FDBA74',
  },
  chipCalendar: {
    backgroundColor: colors.teal,
    borderColor: colors.teal,
  },
  chipCalendarText: {
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  dueEditor: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: '#FDBA74',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dueEditorHint: {
    color: colors.mid,
    lineHeight: 17,
  },
  dueEditorButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dueSaveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  dueSaveText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  dueCancelBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  dueCancelText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
  },
  chipText: {
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  effortCard: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  effortLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: '#2563EB',
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  effortText: {
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  linkSection: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  linkButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  linkButtonText: {
    color: colors.white,
    fontWeight: fonts.weights.bold as '700',
  },
  phoneButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  phoneButtonText: {
    color: colors.teal,
  },
  whyCard: {
    backgroundColor: '#FFFBEB',
    borderLeftWidth: 3,
    borderLeftColor: '#F59E0B',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  whyLabel: {
    color: '#B45309',
  },
  qualifyCard: {
    backgroundColor: '#ECFDF5',
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  qualifyLabel: {
    color: '#047857',
  },
  docsCard: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  docRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  docBullet: {
    color: colors.teal,
    marginRight: 6,
  },
  docText: {
    flex: 1,
  },
  tipCard: {
    backgroundColor: '#F5F3FF',
    borderLeftWidth: 3,
    borderLeftColor: '#7C3AED',
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  tipLabel: {
    color: '#6D28D9',
  },
  cardLabel: {
    fontWeight: fonts.weights.bold as '700',
    color: colors.mid,
    letterSpacing: 0.6,
    marginBottom: 4,
  },
  cardBody: {
    color: colors.dark,
  },
  learnMoreButton: {
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  learnMoreText: {
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  backButton: {
    paddingVertical: 4,
  },
  backText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.medium,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.bold,
    color: colors.navy,
    lineHeight: 30,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  categoryLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  priorityLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold,
  },
  description: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: colors.light,
  },
  statusPillText: {
    fontSize: 12,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  statusPillTextActive: {
    color: colors.white,
  },
  dismissBox: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  dismissInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: fonts.sizes.xs,
  },
  dismissButton: {
    backgroundColor: '#CBD5E1',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.sm,
    justifyContent: 'center',
  },
  dismissButtonText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  scriptBox: {
    backgroundColor: '#F0FDF9',
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
    padding: spacing.md,
    borderRadius: radii.sm,
  },
  scriptText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  scriptHint: {
    fontSize: 10,
    color: colors.mid,
    marginTop: 4,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.sage,
    borderColor: colors.sage,
  },
  checkmark: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  stepText: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 18,
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: colors.mid,
  },
  kbLink: {
    backgroundColor: '#EFF6FF',
    padding: spacing.sm,
    borderRadius: radii.sm,
    marginBottom: 4,
  },
  kbLinkText: {
    fontSize: fonts.sizes.xs,
    color: '#2563EB',
  },
  timelineGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  timelineItem: {
    width: '45%',
  },
  timelineLabel: {
    fontSize: 10,
    color: colors.mid,
    marginBottom: 2,
  },
  timelineValue: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium,
  },
  followUpNote: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  shareButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarStatus: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 19,
    marginBottom: spacing.sm,
  },
  calendarButton: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    minHeight: 40,
    justifyContent: 'center',
  },
  calendarButtonText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
  smsButton: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: '#E6F7F5',
    borderWidth: 1,
    borderColor: colors.teal,
    minHeight: 36,
    justifyContent: 'center',
  },
  smsButtonText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
  },
  sourceRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sourceText: {
    fontSize: 10,
    color: colors.mid,
  },
});
