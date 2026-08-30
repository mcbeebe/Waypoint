/**
 * The draft-flow question sheet (Roadmap/Draft-Flow-Plan.md phase 9b) — a
 * bottom sheet over Home. Tapping "Draft the follow-up" on the One Thing card
 * opens this: two or three tappable questions that sharpen the letter, then
 * "Write my letter" hands the answers off to the prefilled draft. The card
 * stays behind it, so the parent never loses the thing they tapped.
 *
 * All decidable logic is in lib/draftQuestions.ts (which questions, the tone
 * default, the request they build); this file only renders and collects taps.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import type { TriageItem } from '@/lib/homeTriage';
import type { FunnelLocale } from '@/lib/eligibility';
import type { LetterProfile } from '@/lib/draftBlanks';
import { questionsFor } from '@/lib/draftQuestions';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

interface DraftQuestionsSheetProps {
  visible: boolean;
  item: TriageItem | null;
  profile: LetterProfile;
  locale: FunnelLocale;
  /** The AI's one-line reading of the reply (9e), shown so the parent answers
   *  from what the reply actually said rather than from memory. */
  aiSummary?: string;
  onClose: () => void;
  onComplete: (answers: Record<string, string>) => void;
}

const SUMMARY_LABEL: Record<FunnelLocale, string> = {
  en: 'Waypoint read their reply',
  es: 'Waypoint leyó su respuesta',
  vi: 'Waypoint đã đọc thư trả lời',
};

const STRINGS: Record<FunnelLocale, { title: string; write: string; close: string; skipHint: string }> = {
  en: {
    title: 'A couple of quick questions',
    write: 'Write my letter',
    close: 'Close — nothing is lost',
    skipHint: 'Then Waypoint writes the draft. Nothing sends until you press Send.',
  },
  es: {
    title: 'Un par de preguntas rápidas',
    write: 'Escribir mi carta',
    close: 'Cerrar — no se pierde nada',
    skipHint: 'Luego Waypoint escribe el borrador. Nada se envía hasta que usted pulse Enviar.',
  },
  vi: {
    title: 'Vài câu hỏi nhanh',
    write: 'Viết thư của tôi',
    close: 'Đóng — không mất gì',
    skipHint: 'Sau đó Waypoint viết bản nháp. Không có gì được gửi cho đến khi quý vị bấm Gửi.',
  },
};

export default function DraftQuestionsSheet({
  visible,
  item,
  profile,
  locale,
  aiSummary,
  onClose,
  onComplete,
}: DraftQuestionsSheetProps) {
  const t = STRINGS[locale];
  const questions = useMemo(
    () => (item ? questionsFor(item, profile, locale) : []),
    [item, profile, locale]
  );
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Pre-select each question's suggested chip, so accepting the defaults and
  // tapping straight through still yields a complete, honest request. Seed ONCE
  // per opened item: `questions` gets a new identity whenever the family/child
  // data refetches (its profile dep), and re-seeding then would silently wipe a
  // half-typed note or a changed chip. Reset on close so reopening seeds fresh.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!item) {
      seededFor.current = null;
      return;
    }
    if (seededFor.current === item.id) return;
    const seed: Record<string, string> = {};
    for (const q of questions) if (q.suggested) seed[q.id] = q.suggested;
    setAnswers(seed);
    seededFor.current = item.id;
  }, [item, questions]);

  if (!item) return null;

  const set = (id: string, value: string) => setAnswers((prev) => ({ ...prev, [id]: value }));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.scrim}>
        <SafeAreaView style={styles.sheet} edges={['bottom']}>
          <View style={styles.grabber} />
          <View style={styles.head}>
            <Text style={styles.title}>{t.title}</Text>
            <Pressable
              onPress={onClose}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              accessibilityRole="button"
              accessibilityLabel={t.close}
            >
              <Ionicons name="close" size={24} color={colors.mid} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
            {!!aiSummary && (
              <View style={styles.aiSummary}>
                <Text style={styles.aiSummaryLabel} accessibilityRole="header">
                  {SUMMARY_LABEL[locale]}
                </Text>
                <Text style={styles.aiSummaryText}>{aiSummary}</Text>
              </View>
            )}
            {questions.map((q) => (
              <View key={q.id} style={styles.question}>
                <Text style={styles.prompt}>{q.prompt}</Text>
                {!!q.help && <Text style={styles.help}>{q.help}</Text>}

                {q.options.length > 0 && (
                  <View style={styles.chips}>
                    {q.options.map((opt) => {
                      const on = answers[q.id] === opt.value;
                      return (
                        <Pressable
                          key={opt.value}
                          onPress={() => set(q.id, opt.value)}
                          style={[styles.chip, on && styles.chipOn]}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          accessibilityLabel={opt.label}
                        >
                          {on && (
                            <Ionicons
                              name="checkmark"
                              size={16}
                              color={colors.teal}
                              style={styles.chipCheck}
                            />
                          )}
                          <Text style={[styles.chipText, on && styles.chipTextOn]}>{opt.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {!!q.freeform && (
                  <TextInput
                    style={styles.freeform}
                    placeholder={q.freeform.placeholder}
                    placeholderTextColor={colors.mid}
                    multiline
                    value={answers[q.id] ?? ''}
                    onChangeText={(v) => set(q.id, v)}
                    accessibilityLabel={q.freeform.label}
                  />
                )}
              </View>
            ))}

            <Pressable
              style={({ pressed }) => [styles.cta, pressed && styles.dim]}
              onPress={() => onComplete(answers)}
              accessibilityRole="button"
              accessibilityLabel={t.write}
            >
              <Ionicons name="create-outline" size={18} color={colors.white} />
              <Text style={styles.ctaText}>{t.write}</Text>
            </Pressable>
            <Text style={styles.skipHint}>{t.skipHint}</Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(15,23,42,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '90%',
    paddingHorizontal: spacing.base,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.extrabold, color: colors.navy, flex: 1 },
  body: { paddingBottom: spacing.xl, gap: spacing.lg },
  aiSummary: {
    backgroundColor: '#ECFEFF',
    borderWidth: 1,
    borderColor: '#A5F3FC',
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 2,
  },
  aiSummaryLabel: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.extrabold as '800',
    letterSpacing: 0.6,
    color: colors.teal,
  },
  aiSummaryText: { fontSize: fonts.sizes.sm, color: '#155E75', lineHeight: 19 },
  question: { gap: spacing.sm },
  prompt: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, lineHeight: 24 },
  help: { fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18, marginTop: -2 },
  chips: { gap: spacing.sm },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  chipOn: { borderColor: colors.teal, backgroundColor: '#ECFEFF' },
  chipCheck: { marginRight: spacing.sm },
  chipText: { fontSize: fonts.sizes.base, color: colors.dark, flex: 1, lineHeight: 20, paddingVertical: spacing.sm },
  chipTextOn: { color: '#0E7490', fontWeight: fonts.weights.bold as '700' },
  freeform: {
    minHeight: 88,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.white,
    padding: spacing.md,
    fontSize: fonts.sizes.base,
    color: colors.dark,
    textAlignVertical: 'top',
  },
  cta: {
    minHeight: MIN_TOUCH_TARGET + 2,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold as '700', fontSize: fonts.sizes.base },
  dim: { opacity: 0.6 },
  skipHint: { fontSize: fonts.sizes.xs, color: colors.mid, textAlign: 'center', lineHeight: 16, marginTop: spacing.xs },
});
