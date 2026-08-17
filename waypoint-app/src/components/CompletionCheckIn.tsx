/**
 * Completion check-in modal (wave 2 adaptive engine).
 *
 * When a parent completes an action that carries a follow_up_key ("Call your
 * Regional Center" → rc_done), this asks the GAS-ported FOLLOWUPS question
 * ("How did the RC call go?"). Answers that signal a blocker (voicemail,
 * denial, refusal) generate the next escalation actions automatically.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { useToast } from '@/components/Toast';
import {
  FOLLOWUPS,
  getFollowUpActions,
  insertGeneratedActions,
  type AdaptiveContext,
} from '@/lib/adaptiveEngine';
import type { Action } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface CompletionCheckInProps {
  /** The just-completed action (must carry follow_up_key), or null when hidden */
  action: Action | null;
  familyId: string;
  ctx: AdaptiveContext;
  onClose: () => void;
  /** Called after follow-up actions were inserted so lists can refresh */
  onActionsAdded?: () => void;
}

export default function CompletionCheckIn({
  action,
  familyId,
  ctx,
  onClose,
  onActionsAdded,
}: CompletionCheckInProps) {
  const { showToast } = useToast();
  const [saving, setSaving] = useState(false);

  const followUp = action?.follow_up_key ? FOLLOWUPS[action.follow_up_key] : undefined;
  if (!action || !followUp) return null;

  const handleAnswer = async (value: string) => {
    if (saving) return;
    const generated = getFollowUpActions(action.follow_up_key!, value, ctx);
    if (generated.length === 0) {
      showToast('Nice work! 🎉', 'success');
      onClose();
      return;
    }
    setSaving(true);
    const count = await insertGeneratedActions(familyId, action.child_id, generated);
    setSaving(false);
    if (count > 0) {
      showToast('New steps added based on your update', 'success');
      onActionsAdded?.();
    } else {
      showToast("Couldn't add the follow-up steps — you can ask the Navigator instead.", 'error');
    }
    onClose();
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.completedNote}>✅ {action.title}</Text>
          <Text style={styles.question}>{followUp.question}</Text>
          {saving ? (
            <ActivityIndicator size="small" color={colors.teal} style={styles.spinner} />
          ) : (
            followUp.options.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={styles.option}
                onPress={() => handleAnswer(o.value)}
                accessibilityRole="button"
                accessibilityLabel={o.label}
              >
                <Text style={styles.optionEmoji}>{o.emoji}</Text>
                <Text style={styles.optionLabel}>{o.label}</Text>
              </TouchableOpacity>
            ))
          )}
          <TouchableOpacity style={styles.skip} onPress={onClose} accessibilityRole="button">
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
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
  },
  completedNote: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginBottom: spacing.xs,
  },
  question: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginBottom: spacing.md,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
    marginBottom: 6,
    minHeight: 44,
  },
  optionEmoji: {
    fontSize: 18,
  },
  optionLabel: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  spinner: {
    paddingVertical: spacing.lg,
  },
  skip: {
    alignSelf: 'center',
    marginTop: spacing.sm,
    paddingVertical: 6,
    minHeight: 24,
  },
  skipText: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
  },
});
