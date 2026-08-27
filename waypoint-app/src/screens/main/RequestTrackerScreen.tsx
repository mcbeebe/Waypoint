/**
 * Request Tracker (PRD W-G: G4) — every ask the family has in flight, with
 * the app watching the statutory clocks. Overdue items surface the matching
 * lever letter as the next action; a denial prompts the written-NOA path.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useFamily } from '@/hooks/useFamily';
import { useRequests, type FamilyRequest } from '@/hooks/useRequests';
import {
  deadlineFor,
  REQUEST_LEVERS,
  REQUEST_TYPE_LABELS,
  type RequestType,
} from '@/lib/requestClocks';
import { useToast } from '@/components/Toast';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const ADDABLE_TYPES: RequestType[] = [
  'service_request',
  'ipp_meeting',
  'rc_assessment',
  'authorization',
  'reimbursement',
  'iep_evaluation',
  'other',
];

const STATUS_CYCLE: Record<FamilyRequest['status'], FamilyRequest['status']> = {
  requested: 'in_progress',
  in_progress: 'granted',
  granted: 'denied',
  denied: 'requested',
  withdrawn: 'requested',
};

const STATUS_STYLE: Record<FamilyRequest['status'], { bg: string; fg: string; label: string }> = {
  requested: { bg: semantic.infoBg, fg: semantic.info, label: 'Requested' },
  in_progress: { bg: semantic.warningBg, fg: semantic.warning, label: 'In progress' },
  granted: { bg: semantic.successBg, fg: semantic.success, label: 'Granted ✓' },
  denied: { bg: semantic.dangerBg, fg: semantic.danger, label: 'Denied' },
  withdrawn: { bg: colors.light, fg: colors.mid, label: 'Withdrawn' },
};

export default function RequestTrackerScreen() {
  const navigation = useNavigation();
  const { family } = useFamily();
  const { requests, loading, error, createRequest, updateStatus } = useRequests(family?.id);
  const { showToast } = useToast();

  const [adding, setAdding] = useState(false);
  const [newType, setNewType] = useState<RequestType>('service_request');
  const [newTitle, setNewTitle] = useState('');

  const openLetter = (template: string) => {
    (navigation as any).navigate('Letters', { template });
  };

  const add = async () => {
    if (!newTitle.trim()) {
      showToast('Give the request a short name first.', 'info');
      return;
    }
    const created = await createRequest({
      request_type: newType,
      title: newTitle.trim(),
      requested_on: new Date().toISOString().slice(0, 10),
    });
    if (created) {
      setNewTitle('');
      setAdding(false);
      showToast('Tracking it — we watch the clock from here.', 'success');
    } else {
      showToast('Could not save the request — please try again.', 'error');
    }
  };

  const renderItem = ({ item }: { item: FamilyRequest }) => {
    const deadline = deadlineFor(item.request_type, item.requested_on);
    const lever = REQUEST_LEVERS[item.request_type];
    const s = STATUS_STYLE[item.status];
    const open = item.status === 'requested' || item.status === 'in_progress';
    const showLever = open && (deadline?.overdue || !deadline);
    const showDenialLever = item.status === 'denied';

    return (
      <View style={styles.card}>
        <View style={styles.cardHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMeta}>
              {REQUEST_TYPE_LABELS[item.request_type]} · asked {item.requested_on}
            </Text>
          </View>
          <Pressable
            style={[styles.statusChip, { backgroundColor: s.bg }]}
            onPress={() => updateStatus(item.id, STATUS_CYCLE[item.status])}
          >
            <Text style={[styles.statusChipText, { color: s.fg }]}>{s.label}</Text>
          </Pressable>
        </View>

        {open && deadline && (
          <View
            style={[
              styles.clockChip,
              deadline.overdue ? styles.clockOverdue : styles.clockRunning,
            ]}
          >
            <Text
              style={[
                styles.clockText,
                deadline.overdue ? styles.clockTextOverdue : styles.clockTextRunning,
              ]}
            >
              {deadline.overdue
                ? `⚠ ${-deadline.daysRemaining} days past the legal deadline (${deadline.dueOn})`
                : `⏱ Due ${deadline.dueOn} · ${deadline.daysRemaining} days left`}{' '}
              · {deadline.citation}
            </Text>
          </View>
        )}
        {open && !deadline && (
          <Text style={styles.noClock}>
            No legal deadline on this one — the lever below creates the pressure.
          </Text>
        )}

        {(showLever || showDenialLever) && (
          <Pressable
            style={[styles.lever, (deadline?.overdue || showDenialLever) && styles.leverPrimary]}
            onPress={() =>
              openLetter(showDenialLever ? 'noa_request' : lever.template)
            }
          >
            <Text
              style={[
                styles.leverText,
                (deadline?.overdue || showDenialLever) && styles.leverTextPrimary,
              ]}
            >
              ✉️ {showDenialLever ? 'Denied? Get it in writing + appeal rights' : lever.label}
            </Text>
          </Pressable>
        )}

        {item.communication_id && (
          <Pressable
            style={styles.letterLink}
            onPress={() =>
              (navigation as any).navigate('CommunicationLog', {
                highlightId: item.communication_id,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="View the letter behind this request"
          >
            <Text style={styles.letterLinkText}>📄 View the letter in your Paper Trail ›</Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.title}>Requests &amp; clocks</Text>
            <Text style={styles.subtitle}>
              Track every ask — the app watches the legal deadlines and hands you
              the letter when one slips. Tap a status to update it.
            </Text>
            {error ? <Text style={styles.error}>{error}</Text> : null}
          </View>
        }
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyTitle}>Nothing tracked yet</Text>
              <Text style={styles.emptyBody}>
                Add the first thing you&apos;ve asked the Regional Center or school
                for — an assessment, a service, an IPP meeting — and we&apos;ll watch
                the clock with you. This record also becomes your evidence of unmet
                needs if you ever switch to Self-Determination.
              </Text>
            </View>
          )
        }
        renderItem={renderItem}
      />

      <View style={styles.footer}>
        {adding ? (
          <View style={styles.addForm}>
            <View style={styles.typeRow}>
              {ADDABLE_TYPES.map((t) => (
                <Pressable
                  key={t}
                  style={[styles.typePill, newType === t && styles.typePillActive]}
                  onPress={() => setNewType(t)}
                >
                  <Text
                    style={[styles.typePillText, newType === t && styles.typePillTextActive]}
                  >
                    {REQUEST_TYPE_LABELS[t]}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder="What did you ask for? (e.g. 8 hrs/wk respite)"
              placeholderTextColor={colors.mid}
              value={newTitle}
              onChangeText={setNewTitle}
              autoFocus
            />
            <View style={styles.addActions}>
              <Pressable style={[styles.cta, { flex: 1 }]} onPress={add}>
                <Text style={styles.ctaText}>Track it</Text>
              </Pressable>
              <Pressable style={styles.cancel} onPress={() => setAdding(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable style={styles.cta} onPress={() => setAdding(true)}>
            <Text style={styles.ctaText}>+ Track a request</Text>
          </Pressable>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.light },
  list: { padding: spacing.base, paddingBottom: spacing.md },
  header: { marginBottom: spacing.md },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: spacing.xs, fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 20 },
  error: { marginTop: spacing.sm, color: semantic.danger, fontSize: fonts.sizes.sm },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  cardHead: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  cardMeta: { marginTop: 2, fontSize: fonts.sizes.sm, color: colors.mid },
  statusChip: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    minHeight: 32,
    justifyContent: 'center',
  },
  statusChipText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold },
  clockChip: { borderRadius: radii.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  clockRunning: { backgroundColor: semantic.warningBg },
  clockOverdue: { backgroundColor: semantic.dangerBg },
  clockText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  clockTextRunning: { color: semantic.warning },
  clockTextOverdue: { color: semantic.danger },
  noClock: { fontSize: fonts.sizes.sm, color: colors.mid },
  letterLink: { minHeight: 32, justifyContent: 'center', alignSelf: 'flex-start' },
  letterLinkText: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    color: colors.teal,
  },
  lever: {
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  leverPrimary: { backgroundColor: colors.teal, borderColor: colors.teal },
  leverText: { fontWeight: fonts.weights.semibold, color: colors.dark, fontSize: fonts.sizes.md },
  leverTextPrimary: { color: colors.white },
  empty: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
  },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  emptyBody: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 20 },
  footer: {
    padding: spacing.base,
    paddingBottom: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  addForm: { gap: spacing.md },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typePill: {
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    minHeight: 36,
    justifyContent: 'center',
  },
  typePillActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  typePillText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold, color: colors.dark },
  typePillTextActive: { color: colors.white },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
  },
  addActions: { flexDirection: 'row', gap: spacing.sm },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold },
  cancel: {
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  cancelText: { color: colors.dark, fontWeight: fonts.weights.semibold },
});
