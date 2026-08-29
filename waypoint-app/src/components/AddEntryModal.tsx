/**
 * Log-a-communication modal, shared by the Paper Trail and the Request
 * Case File. When opened from a case it stamps the new entry with that
 * request_id so a phoned promise lands on the request it belongs to.
 * Backdating is honest by design: the date field sets occurred_at, and
 * provenance (logged later vs promptly) is derived downstream, never here.
 */
import React, { useState } from 'react';
import { View, Text, TextInput, Modal, TouchableOpacity, StyleSheet } from 'react-native';
import type { CommunicationKind, CommunicationOrg } from '@/hooks/useCommunications';
import DateInput from '@/components/DateInput';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export const KIND_CONFIG: Record<CommunicationKind, { label: string; emoji: string }> = {
  letter: { label: 'Letter', emoji: '📄' },
  email: { label: 'Email', emoji: '✉️' },
  call: { label: 'Call', emoji: '📞' },
  meeting: { label: 'Meeting', emoji: '🤝' },
  note: { label: 'Note', emoji: '📝' },
};

export const ORG_OPTIONS: Array<{ value: CommunicationOrg; label: string }> = [
  { value: 'regional_center', label: 'Regional Center' },
  { value: 'school', label: 'School' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'medical', label: 'Medical' },
  { value: 'other', label: 'Other' },
];

export const ORG_LABELS: Record<string, string> = Object.fromEntries(
  ORG_OPTIONS.map((o) => [o.value, o.label])
);

export interface AddEntryInput {
  kind: CommunicationKind;
  subject: string;
  contact?: string;
  organization?: CommunicationOrg;
  body?: string;
  occurred_at?: string;
  request_id?: string | null;
}

interface AddEntryModalProps {
  visible: boolean;
  onClose: () => void;
  /** Resolve true when the entry actually saved — the fields only clear then. */
  onSave: (entry: AddEntryInput) => Promise<boolean>;
  /** Attach every saved entry to this tracked request (case-file entry point). */
  presetRequestId?: string | null;
  defaultKind?: CommunicationKind;
  title?: string;
}

function Pill({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function AddEntryModal({
  visible,
  onClose,
  onSave,
  presetRequestId,
  defaultKind = 'call',
  title = 'Log a communication',
}: AddEntryModalProps) {
  const [kind, setKind] = useState<CommunicationKind>(defaultKind);
  const [subject, setSubject] = useState('');
  const [contact, setContact] = useState('');
  const [organization, setOrganization] = useState<CommunicationOrg>('regional_center');
  const [body, setBody] = useState('');
  const [date, setDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!subject.trim() || saving) return;
    setSaving(true);
    let ok = false;
    try {
      ok = await onSave({
        kind,
        subject: subject.trim(),
        contact: contact.trim() || undefined,
        organization,
        body: body.trim() || undefined,
        occurred_at: /^\d{4}-\d{2}-\d{2}$/.test(date) ? `${date}T12:00:00` : undefined,
        request_id: presetRequestId ?? undefined,
      });
    } finally {
      setSaving(false);
    }
    // A failed save keeps everything the parent typed — the modal stays
    // open saying "try again", and their notes are the evidence.
    if (ok) {
      setSubject(''); setContact(''); setBody(''); setDate('');
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>{title}</Text>

          <View style={styles.kindRow}>
            {(['call', 'meeting', 'email', 'note'] as CommunicationKind[]).map((k) => (
              <Pill
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
              <Pill
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
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    minHeight: 30,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.teal },
  pillText: { fontSize: fonts.sizes.xs, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  pillTextActive: { color: colors.white },
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
