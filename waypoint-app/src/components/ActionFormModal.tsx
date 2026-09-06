/**
 * Create or edit an action by hand.
 *
 * Every field of a Waypoint-generated action is editable here — title,
 * category, priority, deadline, the explanation, the phone script, and the
 * step checklist — so a parent can bend a pre-built plan to their real
 * situation, or write their own action without going through the AI.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import DateInput from '@/components/DateInput';
import type { Action, ActionCategory, ActionPriority, ActionStep } from '@/types/database';
import { PRIORITY_META, PRIORITY_ORDER, priorityLabel } from '@/lib/actionMeta';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const CATEGORIES: Array<{ value: ActionCategory; label: string; emoji: string }> = [
  { value: 'regional_center', label: 'Regional Center', emoji: '🏛️' },
  { value: 'iep', label: 'IEP / School', emoji: '🏫' },
  { value: 'insurance', label: 'Insurance', emoji: '🏥' },
  { value: 'benefits', label: 'Benefits', emoji: '💰' },
  { value: 'medical', label: 'Medical', emoji: '⚕️' },
  { value: 'legal', label: 'Legal', emoji: '⚖️' },
  { value: 'general', label: 'General', emoji: '📋' },
];

/** The one priority table — labels and colours shared with both screens. */
const PRIORITIES: Array<{ value: ActionPriority; label: string; color: string }> =
  PRIORITY_ORDER.map((value) => ({
    value,
    label: priorityLabel(value),
    color: PRIORITY_META[value].color,
  }));

export interface ActionFormValues {
  title: string;
  description: string | null;
  category: ActionCategory;
  priority: ActionPriority;
  due_date: string | null;
  script: string | null;
  steps: ActionStep[] | null;
}

interface ActionFormModalProps {
  visible: boolean;
  /** Pass an action to edit it; omit to create a new one */
  action?: Action | null;
  onClose: () => void;
  /** Resolve true when saved so the sheet can close */
  onSubmit: (values: ActionFormValues) => Promise<boolean>;
}

export default function ActionFormModal({
  visible,
  action,
  onClose,
  onSubmit,
}: ActionFormModalProps) {
  const isEdit = !!action;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ActionCategory>('general');
  const [priority, setPriority] = useState<ActionPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [script, setScript] = useState('');
  const [steps, setSteps] = useState<ActionStep[]>([]);
  const [saving, setSaving] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  useEffect(() => {
    if (!visible) return;
    setTitle(action?.title ?? '');
    setDescription(action?.description ?? '');
    setCategory(action?.category ?? 'general');
    setPriority(action?.priority ?? 'medium');
    setDueDate(action?.due_date ?? '');
    setScript(action?.script ?? '');
    setSteps(action?.steps ? action.steps.map((s) => ({ ...s })) : []);
    setValidation(null);
    setSaving(false);
  }, [visible, action]);

  const updateStep = (index: number, text: string) =>
    setSteps((prev) => prev.map((s, i) => (i === index ? { ...s, step: text } : s)));
  const removeStep = (index: number) =>
    setSteps((prev) => prev.filter((_, i) => i !== index));
  const addStep = () => setSteps((prev) => [...prev, { step: '', done: false }]);

  const handleSave = async () => {
    if (saving) return;
    if (!title.trim()) {
      setValidation('Give this action a title.');
      return;
    }
    if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setValidation('Enter the deadline as YYYY-MM-DD, or leave it blank.');
      return;
    }
    const cleanSteps = steps.map((s) => ({ ...s, step: s.step.trim() })).filter((s) => s.step);
    setSaving(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      due_date: dueDate || null,
      script: script.trim() || null,
      steps: cleanSteps.length > 0 ? cleanSteps : null,
    });
    setSaving(false);
    if (ok) onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{isEdit ? 'Edit action' : 'New action'}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>What needs to happen? *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g., Email the case manager about OT hours"
              placeholderTextColor={colors.mid}
              accessibilityLabel="Action title"
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.pillRow}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.pill, category === c.value && styles.pillActive]}
                  onPress={() => setCategory(c.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: category === c.value }}
                  accessibilityLabel={c.label}
                >
                  <Text style={[styles.pillText, category === c.value && styles.pillTextActive]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.pillRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p.value}
                  style={[
                    styles.pill,
                    priority === p.value && { backgroundColor: p.color, borderColor: p.color },
                  ]}
                  onPress={() => setPriority(p.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: priority === p.value }}
                  accessibilityLabel={`${p.label} priority`}
                >
                  <Text style={[styles.pillText, priority === p.value && styles.pillTextActive]}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Deadline (optional)</Text>
            <DateInput value={dueDate} onChange={setDueDate} accessibilityLabel="Deadline" />

            <Text style={styles.label}>Details / why it matters</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              placeholder="Anything you want to remember about this step"
              placeholderTextColor={colors.mid}
              accessibilityLabel="Details"
            />

            <Text style={styles.label}>What to say (script)</Text>
            <TextInput
              style={[styles.input, styles.multiline]}
              value={script}
              onChangeText={setScript}
              multiline
              textAlignVertical="top"
              placeholder="Wording to use on the call or in the email"
              placeholderTextColor={colors.mid}
              accessibilityLabel="Script"
            />

            <Text style={styles.label}>Steps</Text>
            {steps.map((s, i) => (
              <View key={i} style={styles.stepRow}>
                <TextInput
                  style={[styles.input, styles.stepInput]}
                  value={s.step}
                  onChangeText={(t) => updateStep(i, t)}
                  placeholder={`Step ${i + 1}`}
                  placeholderTextColor={colors.mid}
                  accessibilityLabel={`Step ${i + 1}`}
                />
                <TouchableOpacity
                  onPress={() => removeStep(i)}
                  style={styles.stepRemove}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${i + 1}`}
                >
                  <Text style={styles.stepRemoveText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              onPress={addStep}
              style={styles.addStepButton}
              accessibilityRole="button"
              accessibilityLabel="Add a step"
            >
              <Text style={styles.addStepText}>＋ Add a step</Text>
            </TouchableOpacity>

            {validation && <Text style={styles.validation}>{validation}</Text>}

            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
              accessibilityRole="button"
              accessibilityLabel={isEdit ? 'Save changes' : 'Add action'}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveText}>{isEdit ? 'Save changes' : 'Add to my plan'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '92%',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  closeX: { fontSize: 18, color: colors.mid, padding: 4 },
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
  multiline: { minHeight: 72 },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.light,
    minHeight: 34,
    justifyContent: 'center',
  },
  pillActive: { backgroundColor: colors.teal, borderColor: colors.teal },
  pillText: { fontSize: 12, color: colors.dark },
  pillTextActive: { color: colors.white, fontWeight: fonts.weights.semibold as '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  stepInput: { flex: 1 },
  stepRemove: { padding: 8 },
  stepRemoveText: { fontSize: 15, color: '#DC2626' },
  addStepButton: { paddingVertical: 8, minHeight: 36, justifyContent: 'center' },
  addStepText: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
  },
  validation: { fontSize: fonts.sizes.xs, color: '#DC2626', marginTop: spacing.sm },
  saveButton: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 46,
  },
  saveButtonDisabled: { opacity: 0.7 },
  saveText: {
    fontSize: fonts.sizes.base,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
});
