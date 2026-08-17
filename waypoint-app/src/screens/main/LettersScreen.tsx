/**
 * Letters screen — Phase 3 Communication Suite.
 * 12-template letter/email generator ported from the GAS MVP:
 * pick a template → pick a tone → say what you need → get an editable,
 * copy-paste-sendable draft with the family's real details filled in.
 */

import React, { useState, useCallback } from 'react';
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
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function LettersScreen() {
  const { family, updateFamily } = useFamily();
  const { showToast } = useToast();
  const { locale } = useI18n();
  const hasAIConsent = !!family?.ai_consent_at;

  const [template, setTemplate] = useState<LetterTemplate | null>(null);
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
  }, [template, tone, question, hasAIConsent, locale, showToast]);

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
