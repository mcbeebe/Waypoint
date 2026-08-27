/**
 * Paper Trail — communication log (roadmap 3.3).
 *
 * Every letter generated in the app lands here automatically; calls,
 * meetings, and notes are added by hand. Filter by type, expand entries,
 * share the whole log as text for an advocate or hearing prep.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  StyleSheet,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useFamily } from '@/hooks/useFamily';
import {
  useCommunications,
  type Communication,
  type CommunicationKind,
  type CommunicationOrg,
} from '@/hooks/useCommunications';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useToast } from '@/components/Toast';
import { showConfirm } from '@/lib/dialogs';
import { usePremiumGuard } from '@/hooks/usePremiumGuard';
import EmptyState from '@/components/EmptyState';
import DateInput from '@/components/DateInput';
import { SkeletonCard } from '@/components/ui';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const KIND_CONFIG: Record<CommunicationKind, { label: string; emoji: string }> = {
  letter: { label: 'Letter', emoji: '📄' },
  email: { label: 'Email', emoji: '✉️' },
  call: { label: 'Call', emoji: '📞' },
  meeting: { label: 'Meeting', emoji: '🤝' },
  note: { label: 'Note', emoji: '📝' },
};

const ORG_OPTIONS: Array<{ value: CommunicationOrg; label: string }> = [
  { value: 'regional_center', label: 'Regional Center' },
  { value: 'school', label: 'School' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

const ORG_LABELS: Record<string, string> = Object.fromEntries(
  ORG_OPTIONS.map((o) => [o.value, o.label])
);

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CommunicationLogScreen() {
  const { guard } = usePremiumGuard();
  const { family } = useFamily();
  const { showToast } = useToast();
  const {
    communications, loading, addCommunication, deleteCommunication, markSent,
  } = useCommunications(family?.id ?? '');
  const navigation = useNavigation();
  const route = useRoute();
  // A tracker row's "view the letter" lands here with the entry pre-expanded.
  const highlightId =
    (route.params as { highlightId?: string } | undefined)?.highlightId ?? null;

  const [filter, setFilter] = useState<CommunicationKind | 'all' | 'drafts'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(highlightId);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = useMemo(() => {
    if (filter === 'all') return communications;
    // Unsent drafts are the ones that need chasing, so they get their own view
    if (filter === 'drafts') return communications.filter((c) => c.status === 'draft');
    return communications.filter((c) => c.kind === filter);
  }, [communications, filter]);

  const draftCount = useMemo(
    () => communications.filter((c) => c.status === 'draft').length,
    [communications]
  );

  /** Share the whole (filtered) log as plain text — hearing/advocate prep */
  const handleShareLog = useCallback(async () => {
    if (filtered.length === 0) return;
    // Premium (E3): the export is the hearing-prep artifact — logging and
    // reading your own paper trail stays free
    if (!guard('Paper-trail export')) return;
    const lines = filtered.map((c) => {
      const bits = [
        `${KIND_CONFIG[c.kind].emoji} ${formatWhen(c.occurred_at)} — ${c.subject}`,
        [c.contact, c.organization ? ORG_LABELS[c.organization] : null].filter(Boolean).join(' · '),
        c.body ? c.body.slice(0, 400) : null,
      ].filter(Boolean);
      return bits.join('\n');
    });
    const text = `Communication log — ${family?.parent_first_name ?? 'Waypoint family'}\n\n${lines.join('\n\n---\n\n')}\n\n— Exported from Waypoint · waypointchild.com`;
    try {
      if (Platform.OS === 'web') {
        const nav = navigator as Navigator & { share?: (d: { text?: string }) => Promise<void> };
        if (nav.share) { await nav.share({ text }); return; }
        await Clipboard.setStringAsync(text);
        showToast('Log copied — paste it into an email or document.', 'success');
        return;
      }
      await Share.share({ message: text });
    } catch {
      // share sheet dismissed
    }
  }, [filtered, family, showToast]);

  const handleDelete = useCallback(async (c: Communication) => {
    const confirmed = await showConfirm(
      'Delete entry?',
      `"${c.subject}" will be removed from your paper trail.`,
      'Delete',
      true
    );
    if (!confirmed) return;
    const ok = await deleteCommunication(c.id);
    showToast(ok ? 'Entry deleted' : "Couldn't delete — try again.", ok ? 'success' : 'error');
  }, [deleteCommunication, showToast]);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      {/* Filters + actions */}
      <View style={styles.toolbar}>
        <View style={styles.filterRow}>
          <FilterPill label="All" active={filter === 'all'} onPress={() => setFilter('all')} />
          {draftCount > 0 && (
            <FilterPill
              label={`✍️ Drafts (${draftCount})`}
              active={filter === 'drafts'}
              onPress={() => setFilter('drafts')}
            />
          )}
          {(Object.keys(KIND_CONFIG) as CommunicationKind[]).map((k) => (
            <FilterPill
              key={k}
              label={`${KIND_CONFIG[k].emoji} ${KIND_CONFIG[k].label}`}
              active={filter === k}
              onPress={() => setFilter(k)}
            />
          ))}
        </View>
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => setShowAdd(true)}
            accessibilityRole="button"
            accessibilityLabel="Add a call, meeting, or note"
          >
            <Ionicons name="add" size={16} color={colors.white} />
            <Text style={styles.addBtnText}>Log a call / meeting</Text>
          </TouchableOpacity>
          {filtered.length > 0 && (
            <TouchableOpacity
              style={styles.shareBtn}
              onPress={handleShareLog}
              accessibilityRole="button"
              accessibilityLabel="Share this log"
            >
              <Ionicons name="share-outline" size={16} color={colors.teal} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.entry}
            onPress={() => setExpandedId(expandedId === item.id ? null : item.id)}
            accessibilityRole="button"
            accessibilityLabel={`${KIND_CONFIG[item.kind].label}: ${item.subject}`}
          >
            <View style={styles.entryTop}>
              <Text style={styles.entryEmoji}>{KIND_CONFIG[item.kind].emoji}</Text>
              <View style={styles.entryBody}>
                <View style={styles.entryTitleRow}>
                  <Text
                    style={[styles.entrySubject, styles.entrySubjectFlex]}
                    numberOfLines={expandedId === item.id ? undefined : 2}
                  >
                    {item.subject}
                  </Text>
                  {item.status === 'draft' && (
                    <View style={styles.draftBadge}>
                      <Text style={styles.draftBadgeText}>DRAFT</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.entryMeta}>
                  {[
                    formatWhen(item.occurred_at),
                    item.contact,
                    item.organization ? ORG_LABELS[item.organization] : null,
                    item.status === 'sent' && item.sent_at ? `Sent ${formatWhen(item.sent_at)}` : null,
                    item.template_key ? 'From Letters' : null,
                  ].filter(Boolean).join(' · ')}
                </Text>
              </View>
              <Ionicons
                name={expandedId === item.id ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.mid}
              />
            </View>
            {expandedId === item.id && (
              <>
                {item.body ? <Text style={styles.entryText}>{item.body}</Text> : null}
                {item.status === 'draft' && (
                  <View style={styles.draftActions}>
                    <TouchableOpacity
                      style={styles.markSentBtn}
                      onPress={async () => {
                        const ok = await markSent(item.id);
                        showToast(ok ? 'Marked as sent' : "Couldn't update — please try again.", ok ? 'success' : 'error');
                      }}
                      accessibilityRole="button"
                      accessibilityLabel={`Mark "${item.subject}" as sent`}
                    >
                      <Text style={styles.markSentText}>✓ Mark as sent</Text>
                    </TouchableOpacity>
                    {item.body ? (
                      <TouchableOpacity
                        style={styles.reopenBtn}
                        onPress={() =>
                          (navigation as never as { navigate: (n: string, p?: object) => void }).navigate(
                            'Letters',
                            { template: item.template_key ?? 'general', draftBody: item.body }
                          )
                        }
                        accessibilityRole="button"
                        accessibilityLabel={`Keep working on "${item.subject}"`}
                      >
                        <Text style={styles.reopenText}>Keep editing</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                )}
                <TouchableOpacity
                  style={styles.deleteLink}
                  onPress={() => handleDelete(item)}
                  accessibilityRole="button"
                  accessibilityLabel="Delete this entry"
                >
                  <Text style={styles.deleteLinkText}>Delete entry</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          loading ? (
            <View><SkeletonCard /><SkeletonCard /></View>
          ) : (
            <EmptyState
              emoji="🗂️"
              title="Your paper trail starts here"
              subtitle="Letters you generate are logged automatically. Add calls and meetings so nothing is ever 'your word against theirs.'"
              actionLabel="Log your first call"
              onAction={() => setShowAdd(true)}
            />
          )
        }
        showsVerticalScrollIndicator={false}
      />

      <AddEntryModal
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        onSave={async (entry) => {
          const ok = await addCommunication(entry);
          showToast(ok ? 'Added to your paper trail' : "Couldn't save — try again.", ok ? 'success' : 'error');
          if (ok) setShowAdd(false);
        }}
      />
    </SafeAreaView>
  );
}

function FilterPill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

function AddEntryModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (entry: {
    kind: CommunicationKind; subject: string; contact?: string;
    organization?: CommunicationOrg; body?: string; occurred_at?: string;
  }) => Promise<void>;
}) {
  const [kind, setKind] = useState<CommunicationKind>('call');
  const [subject, setSubject] = useState('');
  const [contact, setContact] = useState('');
  const [organization, setOrganization] = useState<CommunicationOrg>('regional_center');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!subject.trim() || saving) return;
    setSaving(true);
    await onSave({
      kind,
      subject: subject.trim(),
      contact: contact.trim() || undefined,
      organization,
      body: body.trim() || undefined,
      occurred_at: /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : undefined,
    });
    setSaving(false);
    setSubject(''); setContact(''); setBody(''); setDate('');
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Log a communication</Text>

          <View style={styles.kindRow}>
            {(['call', 'meeting', 'email', 'note'] as CommunicationKind[]).map((k) => (
              <FilterPill
                key={k}
                label={`${KIND_CONFIG[k].emoji} ${KIND_CONFIG[k].label}`}
                active={kind === k}
                onPress={() => setKind(k)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>What happened?</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="e.g., Called RCEB about intake status"
            placeholderTextColor={colors.mid}
          />

          <Text style={styles.fieldLabel}>Who / where</Text>
          <TextInput
            style={styles.input}
            value={contact}
            onChangeText={setContact}
            placeholder="e.g., Maria Lopez (Service Coordinator)"
            placeholderTextColor={colors.mid}
          />
          <View style={styles.kindRow}>
            {ORG_OPTIONS.map((o) => (
              <FilterPill
                key={o.value}
                label={o.label}
                active={organization === o.value}
                onPress={() => setOrganization(o.value)}
              />
            ))}
          </View>

          <Text style={styles.fieldLabel}>Date (optional — defaults to today)</Text>
          <DateInput value={date} onChange={setDate} />

          <Text style={styles.fieldLabel}>Notes</Text>
          <TextInput
            style={[styles.input, styles.notesInput]}
            value={body}
            onChangeText={setBody}
            multiline
            textAlignVertical="top"
            placeholder="What was said, what was promised, names and times…"
            placeholderTextColor={colors.mid}
          />

          <TouchableOpacity
            style={[styles.saveBtn, (!subject.trim() || saving) && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={!subject.trim() || saving}
            accessibilityRole="button"
            accessibilityLabel="Save this entry"
          >
            <Text style={styles.saveBtnText}>Save to paper trail</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} accessibilityRole="button">
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  toolbar: {
    backgroundColor: colors.white,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    minHeight: 30,
    justifyContent: 'center',
  },
  filterPillActive: { backgroundColor: colors.teal },
  filterPillText: { fontSize: fonts.sizes.xs, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  filterPillTextActive: { color: colors.white },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minHeight: 36,
  },
  addBtnText: { fontSize: fonts.sizes.xs, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  shareBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center', alignItems: 'center',
  },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  entry: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  entryTop: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  entryEmoji: { fontSize: 18 },
  entryBody: { flex: 1 },
  entrySubject: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.dark, lineHeight: 19 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  entrySubjectFlex: { flex: 1 },
  draftBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  draftBadgeText: {
    fontSize: 9,
    color: '#92400E',
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.5,
  },
  draftActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm, flexWrap: 'wrap' },
  markSentBtn: {
    backgroundColor: '#D1FAE5',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  markSentText: {
    fontSize: fonts.sizes.xs,
    color: '#047857',
    fontWeight: fonts.weights.semibold as '600',
  },
  reopenBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    minHeight: 36,
    justifyContent: 'center',
  },
  reopenText: { fontSize: fonts.sizes.xs, color: colors.dark },
  entryMeta: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  entryText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    lineHeight: 18,
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  deleteLink: { alignSelf: 'flex-start', marginTop: spacing.sm, minHeight: 24, justifyContent: 'center' },
  deleteLinkText: { fontSize: fonts.sizes.xs, color: '#DC2626' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.sm },
  kindRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  fieldLabel: {
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
  notesInput: { minHeight: 70 },
  saveBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  cancelBtn: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: 6, minHeight: 24 },
  cancelBtnText: { fontSize: fonts.sizes.sm, color: colors.mid },
});
