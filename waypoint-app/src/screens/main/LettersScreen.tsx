/**
 * Letters screen — Phase 3 Communication Suite.
 * 12-template letter/email generator ported from the GAS MVP:
 * pick a template → pick a tone → say what you need → get an editable,
 * copy-paste-sendable draft with the family's real details filled in.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { useFamily } from '@/hooks/useFamily';
import { useToast } from '@/components/Toast';
import AIConsentModal from '@/components/AIConsentModal';
import Button from '@/components/Button';
import {
  LETTER_TEMPLATES,
  TONE_OPTIONS,
  generateLetter,
  openInGmail,
  type DraftTone,
  type LetterTemplate,
} from '@/lib/letters';
import { useI18n } from '@/i18n';
import { trackDraftUsed } from '@/lib/analytics';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { HomeStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function LettersScreen() {
  const { family, updateFamily } = useFamily();
  const { showToast } = useToast();
  const { locale } = useI18n();
  const route = useRoute<RouteProp<HomeStackParamList, 'Letters'>>();
  const hasAIConsent = !!family?.ai_consent_at;

  const [template, setTemplate] = useState<LetterTemplate | null>(null);

  // Chat → Letters handoff: the Navigator's "draft this letter" card passes
  // the template key so the parent lands one tap from generating.
  useEffect(() => {
    const key = route.params?.template;
    if (!key) return;
    const match = LETTER_TEMPLATES.find((t) => t.key === key);
    if (match) {
      setTemplate(match);
      setDraft(null);
    }
  }, [route.params?.template]);
  const [tone, setTone] = useState<DraftTone>('professional');
  const [question, setQuestion] = useState('');
  const [draft, setDraft] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showConsent, setShowConsent] = useState(false);

  const handleGenerate = useCallback(async () => {
    if (!template) return;
    if (!hasAIConsent) {
      setShowConsent(true);
      return;
    }
    if (!question.trim() && template.key !== 'iep_prep') {
      showToast('Tell us what you need first — a sentence or two is plenty.', 'error');
      return;
    }
    setGenerating(true);
    const result = await generateLetter({
      draftType: template.key,
      tone,
      question: question.trim(),
      language: locale !== 'en' ? locale : undefined,
    });
    setGenerating(false);
    if (result.error === 'consent_required') {
      setShowConsent(true);
      return;
    }
    if (!result.draft) {
      showToast(result.error ?? 'Could not generate the draft — please try again.', 'error');
      return;
    }
    setDraft(result.draft);
    if (family?.id) {
      // Anonymous usage analytics (fire-and-forget)
      trackDraftUsed(family.id, template.key, family.regional_center ?? undefined);
    }
  }, [template, tone, question, hasAIConsent, locale, showToast, family]);

  const handleCopy = useCallback(async () => {
    if (!draft) return;
    await Clipboard.setStringAsync(draft);
    showToast('Draft copied to clipboard.', 'success');
  }, [draft, showToast]);

  const handleGmail = useCallback(() => {
    if (!draft || !template) return;
    const subject = `${template.title} — ${family?.parent_first_name ?? ''}`.trim();
    const url =
      Platform.OS === 'web'
        ? openInGmail(subject, draft)
        : `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(draft)}`;
    Linking.openURL(url).catch(() => showToast('Could not open your email app.', 'error'));
  }, [draft, template, family, showToast]);

  const reset = () => {
    setDraft(null);
    setTemplate(null);
    setQuestion('');
  };

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <AIConsentModal
        visible={showConsent}
        onAccept={async () => {
          setShowConsent(false);
          await updateFamily({ ai_consent_at: new Date().toISOString() });
        }}
        onDecline={() => setShowConsent(false)}
      />

      <ScrollView contentContainerStyle={styles.content}>
        {!template ? (
          <>
            <Text style={styles.intro}>
              Pick what you need to send. Waypoint drafts it with your family's details and the
              right legal backing — you review, edit, and send.
            </Text>
            {LETTER_TEMPLATES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={styles.templateCard}
                onPress={() => setTemplate(t)}
                accessibilityRole="button"
                accessibilityLabel={t.title}
              >
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
                <View style={styles.templateBody}>
                  <Text style={styles.templateTitle}>{t.title}</Text>
                  <Text style={styles.templateDesc}>{t.description}</Text>
                  <Text style={styles.templateAudience}>To: {t.audience}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </>
        ) : !draft ? (
          <>
            <TouchableOpacity onPress={reset} accessibilityRole="button">
              <Text style={styles.backLink}>‹ All letter types</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>
              {template.emoji} {template.title}
            </Text>
            <Text style={styles.templateDesc}>{template.description}</Text>

            <Text style={styles.fieldLabel}>How should it sound?</Text>
            {TONE_OPTIONS.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[styles.toneRow, tone === t.key && styles.toneRowActive]}
                onPress={() => setTone(t.key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: tone === t.key }}
              >
                <Text style={[styles.toneLabel, tone === t.key && styles.toneLabelActive]}>
                  {t.label}
                </Text>
                <Text style={styles.toneHint}>{t.hint}</Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.fieldLabel}>
              {template.key === 'iep_prep'
                ? 'Anything specific to prepare for? (optional)'
                : 'What do you need? A sentence or two is plenty.'}
            </Text>
            <TextInput
              style={styles.questionInput}
              value={question}
              onChangeText={setQuestion}
              placeholder={
                template.key === 'appeal_letter'
                  ? 'e.g., Blue Shield denied 20 hrs/week of ABA, says not medically necessary'
                  : 'e.g., The school has ignored my two emails asking for a speech assessment'
              }
              placeholderTextColor={colors.mid}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />

            <Button
              title={generating ? 'Drafting…' : 'Generate Draft'}
              onPress={handleGenerate}
              variant="primary"
              loading={generating}
              disabled={generating}
            />
            {generating && (
              <Text style={styles.generatingHint}>
                Writing your {template.title.toLowerCase()} — usually 10–20 seconds…
              </Text>
            )}
          </>
        ) : (
          <>
            <TouchableOpacity onPress={() => setDraft(null)} accessibilityRole="button">
              <Text style={styles.backLink}>‹ Change tone or details</Text>
            </TouchableOpacity>
            <Text style={styles.stepTitle}>Your draft — edit anything, then send</Text>
            {(() => {
              // [BRACKET] highlighting (wave 4): surface the blanks the
              // parent still needs to fill before this is sendable
              const blanks = Array.from(
                new Set((draft.match(/\[[^\]\n]{1,40}\]/g) ?? []).map((b) => b.trim()))
              );
              if (blanks.length === 0) {
                return (
                  <View style={styles.blanksDone}>
                    <Text style={styles.blanksDoneText}>✅ No blanks left — ready to send</Text>
                  </View>
                );
              }
              return (
                <View style={styles.blanksCard}>
                  <Text style={styles.blanksTitle}>
                    Fill in {blanks.length} blank{blanks.length === 1 ? '' : 's'} before sending:
                  </Text>
                  <View style={styles.blanksRow}>
                    {blanks.slice(0, 8).map((b) => (
                      <View key={b} style={styles.blankChip}>
                        <Text style={styles.blankChipText}>{b}</Text>
                      </View>
                    ))}
                    {blanks.length > 8 && (
                      <Text style={styles.blanksMore}>+{blanks.length - 8} more</Text>
                    )}
                  </View>
                </View>
              );
            })()}
            <TextInput
              style={styles.draftBox}
              value={draft}
              onChangeText={setDraft}
              multiline
              textAlignVertical="top"
            />
            <View style={styles.actionRow}>
              <Button title="Copy" onPress={handleCopy} variant="primary" />
              <Button
                title={Platform.OS === 'web' ? 'Open in Gmail' : 'Open in Email'}
                onPress={handleGmail}
                variant="outline"
              />
            </View>
            <Button title="Start a new letter" onPress={reset} variant="outline" />
            <Text style={styles.disclaimer}>
              Review before sending: fill in any [BRACKETED] blanks and double-check dates and
              names. Waypoint drafts are a starting point, not legal advice.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.md, gap: spacing.sm, paddingBottom: spacing.xl },
  intro: {
    fontSize: fonts.sizes.base,
    color: colors.mid,
    lineHeight: 20,
    marginBottom: spacing.xs,
  },
  templateCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    alignItems: 'center',
  },
  templateEmoji: { fontSize: 28 },
  templateBody: { flex: 1, gap: 2 },
  templateTitle: {
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  templateDesc: { fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  templateAudience: { fontSize: fonts.sizes.xs, color: colors.teal, fontWeight: '600' },
  backLink: {
    fontSize: fonts.sizes.base,
    color: colors.teal,
    fontWeight: '600',
    paddingVertical: spacing.xs,
  },
  stepTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  fieldLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: '600',
    color: colors.dark,
    marginTop: spacing.sm,
  },
  toneRow: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  toneRowActive: { borderColor: colors.teal, backgroundColor: '#E0F2FE' },
  toneLabel: { fontSize: fonts.sizes.base, fontWeight: '600', color: colors.dark },
  toneLabelActive: { color: colors.teal },
  toneHint: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  questionInput: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    minHeight: 96,
  },
  generatingHint: {
    fontSize: fonts.sizes.sm,
    color: colors.mid,
    textAlign: 'center',
  },
  blanksCard: {
    backgroundColor: '#FEF3C7',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  blanksTitle: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.semibold as '600',
    color: '#B45309',
    marginBottom: 4,
  },
  blanksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
  },
  blankChip: {
    backgroundColor: colors.white,
    borderRadius: radii.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  blankChipText: {
    fontSize: fonts.sizes.xs,
    color: '#B45309',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  blanksMore: {
    fontSize: fonts.sizes.xs,
    color: '#B45309',
  },
  blanksDone: {
    backgroundColor: '#DCFCE7',
    borderRadius: radii.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  blanksDoneText: {
    fontSize: fonts.sizes.xs,
    color: '#15803D',
    fontWeight: fonts.weights.medium as '500',
  },
  draftBox: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    minHeight: 320,
    lineHeight: 21,
  },
  actionRow: { flexDirection: 'row', gap: spacing.sm },
  disclaimer: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    lineHeight: 16,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
});
