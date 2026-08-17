/**
 * Structured answer cards for AI Navigator responses.
 *
 * Renders the metadata parsed from response trailers (see lib/followups.ts)
 * as rich cards below the prose bubble — action steps, rights reminders,
 * watch-outs, context notes, resources, and a letter-draft offer. Ported
 * from the GAS MVP's structured answer renderer.
 */

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Linking, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ChatMeta, ChatStep, ChatResource } from '@/lib/followups';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const CATEGORY_LABELS: Record<string, string> = {
  'regional-center': 'Regional Center',
  iep: 'School / IEP',
  benefits: 'Benefits',
  insurance: 'Insurance',
  rights: 'Your Rights',
  navigation: 'Navigation',
  transitions: 'Transitions',
};

interface ChatMetaCardsProps {
  meta: ChatMeta;
  onSaveStep?: (step: ChatStep) => void;
  onSaveAllSteps?: (steps: ChatStep[]) => void;
  onOpenDraft?: (draftKey: string) => void;
  /** step keys currently being saved (action text used as key) */
  savingSteps?: Set<string>;
  /** step keys already saved this session */
  savedSteps?: Set<string>;
}

export default function ChatMetaCards({
  meta,
  onSaveStep,
  onSaveAllSteps,
  onOpenDraft,
  savingSteps,
  savedSteps,
}: ChatMetaCardsProps) {
  return (
    <View style={styles.container}>
      {(meta.category || meta.urgency === 'high') && (
        <View style={styles.badgeRow}>
          {meta.category && CATEGORY_LABELS[meta.category] && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{CATEGORY_LABELS[meta.category]}</Text>
            </View>
          )}
          {meta.urgency === 'high' && (
            <View style={styles.urgentBadge}>
              <Ionicons name="alert-circle" size={12} color="#DC2626" />
              <Text style={styles.urgentBadgeText}>Time-sensitive</Text>
            </View>
          )}
        </View>
      )}

      {meta.steps.length > 0 && (
        <StepsCard
          steps={meta.steps}
          onSaveStep={onSaveStep}
          onSaveAll={onSaveAllSteps}
          savingSteps={savingSteps}
          savedSteps={savedSteps}
        />
      )}

      {meta.rights && (
        <NoteCard icon="scale-outline" color="#6366F1" bg="#EEF2FF" title="Your right" text={meta.rights} />
      )}
      {meta.context && (
        <NoteCard icon="bulb-outline" color="#B45309" bg="#FEF3C7" title="Good to know" text={meta.context} />
      )}
      {meta.watchOut && (
        <NoteCard icon="warning-outline" color="#DC2626" bg="#FEE2E2" title="Watch out" text={meta.watchOut} />
      )}

      {meta.resources.length > 0 && <ResourcesCard resources={meta.resources} />}

      {meta.draftKey && onOpenDraft && (
        <TouchableOpacity
          style={styles.draftOffer}
          onPress={() => onOpenDraft(meta.draftKey!)}
          accessibilityRole="button"
          accessibilityLabel={meta.draftOffer ?? 'Draft this letter'}
        >
          <Ionicons name="create-outline" size={18} color={colors.white} />
          <Text style={styles.draftOfferText}>{meta.draftOffer ?? 'Draft this letter for me'}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
}

/** Numbered action steps with per-step and save-all buttons */
function StepsCard({
  steps,
  onSaveStep,
  onSaveAll,
  savingSteps,
  savedSteps,
}: {
  steps: ChatStep[];
  onSaveStep?: (step: ChatStep) => void;
  onSaveAll?: (steps: ChatStep[]) => void;
  savingSteps?: Set<string>;
  savedSteps?: Set<string>;
}) {
  const allSaved = steps.every((s) => savedSteps?.has(s.action));
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="footsteps-outline" size={16} color={colors.teal} />
          <Text style={styles.cardTitle}>Your next steps</Text>
        </View>
        {onSaveAll && steps.length > 1 && !allSaved && (
          <TouchableOpacity
            onPress={() => onSaveAll(steps)}
            accessibilityRole="button"
            accessibilityLabel="Save all steps to your action plan"
          >
            <Text style={styles.saveAllText}>Save all</Text>
          </TouchableOpacity>
        )}
      </View>
      {steps.map((step, i) => {
        const saved = savedSteps?.has(step.action);
        const saving = savingSteps?.has(step.action);
        return (
          <View key={`step-${i}`} style={[styles.stepRow, i > 0 && styles.stepRowBorder]}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{i + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepAction}>{step.action}</Text>
              {(step.who || step.timeline) && (
                <Text style={styles.stepMeta}>
                  {[step.who, step.timeline].filter(Boolean).join(' · ')}
                </Text>
              )}
              {step.script && (
                <View style={styles.scriptBox}>
                  <Text style={styles.scriptLabel}>Say this:</Text>
                  <Text style={styles.scriptText}>"{step.script}"</Text>
                </View>
              )}
            </View>
            {onSaveStep && (
              <TouchableOpacity
                style={[styles.stepSaveBtn, saved && styles.stepSaveBtnDone]}
                onPress={() => !saved && !saving && onSaveStep(step)}
                disabled={saved || saving}
                accessibilityRole="button"
                accessibilityLabel={saved ? 'Step saved' : `Save step: ${step.action}`}
              >
                <Ionicons
                  name={saved ? 'checkmark' : 'add'}
                  size={16}
                  color={saved ? colors.white : colors.teal}
                />
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Single-sentence highlight cards (rights / context / watch-out) */
function NoteCard({
  icon,
  color,
  bg,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  title: string;
  text: string;
}) {
  return (
    <View style={[styles.noteCard, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={16} color={color} style={styles.noteIcon} />
      <View style={styles.noteBody}>
        <Text style={[styles.noteTitle, { color }]}>{title}</Text>
        <Text style={styles.noteText}>{text}</Text>
      </View>
    </View>
  );
}

/** Helpful organizations with tappable phone / link */
function ResourcesCard({ resources }: { resources: ChatResource[] }) {
  const [failedLinks, setFailedLinks] = useState<Set<string>>(new Set());

  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setFailedLinks((prev) => new Set(prev).add(url));
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardTitleRow}>
        <Ionicons name="people-outline" size={16} color={colors.teal} />
        <Text style={styles.cardTitle}>Who can help</Text>
      </View>
      {resources.map((r, i) => (
        <View key={`res-${i}`} style={[styles.resourceRow, i > 0 && styles.stepRowBorder]}>
          <Text style={styles.resourceName}>{r.name}</Text>
          {r.how && <Text style={styles.resourceHow}>{r.how}</Text>}
          <View style={styles.resourceLinks}>
            {r.phone && (
              <TouchableOpacity
                style={styles.resourceLink}
                onPress={() => open(`tel:${r.phone!.replace(/[^\d+]/g, '')}`)}
                accessibilityRole="button"
                accessibilityLabel={`Call ${r.name} at ${r.phone}`}
              >
                <Ionicons name="call-outline" size={13} color={colors.teal} />
                <Text style={styles.resourceLinkText}>{r.phone}</Text>
              </TouchableOpacity>
            )}
            {r.url && !failedLinks.has(r.url) && (
              <TouchableOpacity
                style={styles.resourceLink}
                onPress={() => open(r.url!)}
                accessibilityRole="button"
                accessibilityLabel={`Open ${r.name} website`}
              >
                <Ionicons name="open-outline" size={13} color={colors.teal} />
                <Text style={styles.resourceLinkText} numberOfLines={1}>
                  {r.url.replace(/^https?:\/\/(www\.)?/, '').split('/')[0]}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  categoryBadge: {
    backgroundColor: colors.light,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  categoryBadgeText: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    fontWeight: fonts.weights.medium as '500',
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.sm,
  },
  urgentBadgeText: {
    fontSize: fonts.sizes.xs,
    color: '#DC2626',
    fontWeight: fonts.weights.semibold as '600',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.navy,
  },
  saveAllText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.semibold as '600',
  },
  stepRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  stepRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.light,
  },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#E6F7F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepNumText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.bold as '700',
  },
  stepBody: {
    flex: 1,
  },
  stepAction: {
    fontSize: fonts.sizes.sm,
    color: colors.dark,
    lineHeight: 19,
  },
  stepMeta: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 2,
  },
  scriptBox: {
    backgroundColor: colors.light,
    borderRadius: radii.sm,
    padding: spacing.sm,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: colors.teal,
  },
  scriptLabel: {
    fontSize: 10,
    color: colors.mid,
    fontWeight: fonts.weights.semibold as '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  scriptText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  stepSaveBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: colors.teal,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  stepSaveBtnDone: {
    backgroundColor: colors.teal,
  },
  noteCard: {
    flexDirection: 'row',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  noteIcon: {
    marginTop: 1,
  },
  noteBody: {
    flex: 1,
  },
  noteTitle: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  noteText: {
    fontSize: fonts.sizes.xs,
    color: colors.dark,
    lineHeight: 17,
  },
  resourceRow: {
    paddingVertical: spacing.sm,
  },
  resourceName: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.medium as '500',
    color: colors.dark,
  },
  resourceHow: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    marginTop: 1,
  },
  resourceLinks: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  resourceLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resourceLinkText: {
    fontSize: fonts.sizes.xs,
    color: colors.teal,
    fontWeight: fonts.weights.medium as '500',
    maxWidth: 180,
  },
  draftOffer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.teal,
    borderRadius: radii.md,
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.md,
  },
  draftOfferText: {
    fontSize: fonts.sizes.sm,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
    flexShrink: 1,
  },
});
