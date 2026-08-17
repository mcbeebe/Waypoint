/**
 * Home check-in + frustration deep-dive wizard (wave 2 adaptive engine).
 * Ported from the GAS MVP's homeCheckIn / homeFrustrationStart flows.
 *
 * "How's it going?" → good (celebrate) / overwhelmed (simplify) /
 * stuck (frustration wizard: pick the failing system, answer 1-3 questions,
 * preview the generated escalation actions, add them to the plan).
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useToast } from '@/components/Toast';
import {
  FRUSTRATION_TARGETS,
  startFrustrationFlow,
  advanceFrustrationFlow,
  insertGeneratedActions,
  type FlowStep,
  type FrustrationFlowState,
  type FrustrationTarget,
  type GeneratedAction,
  type AdaptiveContext,
} from '@/lib/adaptiveEngine';
import { colors, fonts, spacing, radii } from '@/lib/theme';

type Mode =
  | { kind: 'idle' }
  | { kind: 'message'; text: string }
  | { kind: 'pick-target' }
  | { kind: 'flow'; state: FrustrationFlowState; step: FlowStep }
  | { kind: 'preview'; actions: GeneratedAction[] };

interface CheckInCardProps {
  familyId: string;
  childId: string | null;
  childName?: string | null;
  parentName?: string | null;
  regionalCenterName?: string | null;
  diagnoses?: string[];
  /** Called after escalation actions are added so the parent list refreshes */
  onActionsAdded?: () => void;
}

export default function CheckInCard({
  familyId,
  childId,
  childName,
  parentName,
  regionalCenterName,
  diagnoses,
  onActionsAdded,
}: CheckInCardProps) {
  const navigation = useNavigation<any>();
  const { showToast } = useToast();
  const [mode, setMode] = useState<Mode>({ kind: 'idle' });
  const [saving, setSaving] = useState(false);

  const ctx: AdaptiveContext = {
    childName,
    parentName,
    regionalCenterName,
    diagnoses,
  };

  const handleCheckIn = (value: 'good' | 'overwhelmed' | 'frustrated') => {
    if (value === 'good') {
      setMode({
        kind: 'message',
        text: `Amazing! Keep going. Every action you take is a step forward for ${childName || 'your child'}. 🎉`,
      });
    } else if (value === 'overwhelmed') {
      setMode({
        kind: 'message',
        text: "Let's simplify. Focus on just the top action — everything else can wait. You're doing great. 💛",
      });
    } else {
      setMode({ kind: 'pick-target' });
    }
  };

  const handleTarget = (target: FrustrationTarget) => {
    const { state, step } = startFrustrationFlow(target);
    setMode({ kind: 'flow', state, step });
  };

  const handleFlowAnswer = (value: string) => {
    if (mode.kind !== 'flow') return;
    const result = advanceFrustrationFlow(mode.state, value, ctx);
    if (result.kind === 'step') {
      setMode({ kind: 'flow', state: result.state, step: result.step });
    } else if (result.kind === 'navigate') {
      setMode({ kind: 'idle' });
      navigation.navigate(result.screen);
    } else {
      setMode({ kind: 'preview', actions: result.actions });
    }
  };

  const handleAddToPlan = async () => {
    if (mode.kind !== 'preview' || saving) return;
    setSaving(true);
    const count = await insertGeneratedActions(familyId, childId, mode.actions);
    setSaving(false);
    if (count > 0) {
      showToast(
        count === 1 ? 'Escalation step added to your plan' : `${count} escalation steps added to your plan`,
        'success'
      );
      setMode({ kind: 'idle' });
      onActionsAdded?.();
    } else {
      showToast("Couldn't save the plan steps — please try again.", 'error');
    }
  };

  const backToIdle = () => setMode({ kind: 'idle' });

  return (
    <View style={styles.card}>
      {mode.kind === 'idle' && (
        <>
          <Text style={styles.title}>How's it going?</Text>
          <View style={styles.optionRow}>
            <CheckInOption emoji="🎉" label="Going well" onPress={() => handleCheckIn('good')} />
            <CheckInOption emoji="😮‍💨" label="Overwhelmed" onPress={() => handleCheckIn('overwhelmed')} />
            <CheckInOption emoji="😤" label="I'm stuck" onPress={() => handleCheckIn('frustrated')} />
          </View>
        </>
      )}

      {mode.kind === 'message' && (
        <>
          <Text style={styles.messageText}>{mode.text}</Text>
          <TouchableOpacity style={styles.backBtn} onPress={backToIdle} accessibilityRole="button">
            <Text style={styles.backBtnText}>↩️ Back</Text>
          </TouchableOpacity>
        </>
      )}

      {mode.kind === 'pick-target' && (
        <>
          <Text style={styles.title}>Which system is giving you trouble?</Text>
          {FRUSTRATION_TARGETS.map((t) => (
            <TouchableOpacity
              key={t.value}
              style={styles.flowOption}
              onPress={() => handleTarget(t.value)}
              accessibilityRole="button"
              accessibilityLabel={t.label}
            >
              <Text style={styles.flowEmoji}>{t.emoji}</Text>
              <Text style={styles.flowLabel}>{t.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backBtn} onPress={backToIdle} accessibilityRole="button">
            <Text style={styles.backBtnText}>↩️ Go back</Text>
          </TouchableOpacity>
        </>
      )}

      {mode.kind === 'flow' && (
        <>
          <Text style={styles.title}>{mode.step.question}</Text>
          {mode.step.options.map((o) => (
            <TouchableOpacity
              key={o.value}
              style={styles.flowOption}
              onPress={() => handleFlowAnswer(o.value)}
              accessibilityRole="button"
              accessibilityLabel={o.label}
            >
              <Text style={styles.flowEmoji}>{o.emoji}</Text>
              <Text style={styles.flowLabel}>{o.label}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.backBtn} onPress={backToIdle} accessibilityRole="button">
            <Text style={styles.backBtnText}>↩️ Start over</Text>
          </TouchableOpacity>
        </>
      )}

      {mode.kind === 'preview' && (
        <>
          <Text style={styles.title}>Here's your escalation plan</Text>
          <Text style={styles.previewIntro}>
            Based on what you told us, these legally-grounded steps go straight into your action plan
            — with the exact words to say and ready-to-send letters:
          </Text>
          {mode.actions.map((a, i) => (
            <View key={a.key} style={styles.previewItem}>
              <View style={styles.previewNum}>
                <Text style={styles.previewNumText}>{i + 1}</Text>
              </View>
              <View style={styles.previewBody}>
                <Text style={styles.previewTitle}>{a.title}</Text>
                <Text style={styles.previewSubtitle} numberOfLines={2}>
                  {a.description.split('\n')[0]}
                </Text>
                {a.dependsOnKey && (
                  <View style={styles.lockedHint}>
                    <Ionicons name="lock-closed-outline" size={11} color={colors.mid} />
                    <Text style={styles.lockedHintText}>Unlocks after step {mode.actions.findIndex((x) => x.key === a.dependsOnKey) + 1}</Text>
                  </View>
                )}
              </View>
            </View>
          ))}
          <TouchableOpacity
            style={styles.addBtn}
            onPress={handleAddToPlan}
            disabled={saving}
            accessibilityRole="button"
            accessibilityLabel="Add these steps to my action plan"
          >
            {saving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.addBtnText}>
                Add {mode.actions.length === 1 ? 'this step' : `these ${mode.actions.length} steps`} to my plan
              </Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={backToIdle} accessibilityRole="button">
            <Text style={styles.backBtnText}>Not now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function CheckInOption({ emoji, label, onPress }: { emoji: string; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.checkInOption}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <Text style={styles.checkInEmoji}>{emoji}</Text>
      <Text style={styles.checkInLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  title: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  checkInOption: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.light,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    minHeight: 44,
  },
  checkInEmoji: {
    fontSize: 22,
    marginBottom: 2,
  },
  checkInLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  messageText: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 20,
  },
  flowOption: {
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
  flowEmoji: {
    fontSize: 18,
  },
  flowLabel: {
    flex: 1,
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    fontWeight: fonts.weights.medium as '500',
  },
  backBtn: {
    marginTop: spacing.sm,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    minHeight: 24,
  },
  backBtnText: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
  },
  previewIntro: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 17,
    marginBottom: spacing.sm,
  },
  previewItem: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  previewNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  previewNumText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  previewBody: {
    flex: 1,
  },
  previewTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
  previewSubtitle: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 2,
    lineHeight: 16,
  },
  lockedHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 3,
  },
  lockedHintText: {
    fontSize: 10,
    color: colors.mid,
  },
  addBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    alignItems: 'center',
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  addBtnText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
});
