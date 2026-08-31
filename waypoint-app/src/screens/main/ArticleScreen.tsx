/**
 * ArticleScreen — the Learn reader (phase 8, slice 8-0). Until now an article
 * was a card blurb that jumped straight to a tool; this is the page you can
 * actually read. It renders the typed body, the tappable Citation (Waypoint's
 * most defensible asset), an honest "reviewed on" date, and the one action the
 * article ends in.
 *
 * Registered in the Navigator (Learn) stack, so Back returns to Learn. The
 * end-action target lives in the Home stack, so its navigate names tab:'Home'.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, AccessibilityInfo } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { getLearnArticle, type ArticleBlock } from '@/lib/learnLibrary';
import Citation from '@/components/Citation';
import { useI18n } from '@/i18n';
import { toFunnelLocale, type FunnelLocale } from '@/lib/eligibility';
import type { NavigatorStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

const UI: Record<
  FunnelLocale,
  {
    min: (n: number) => string;
    reviewed: (d: string) => string;
    missing: string;
    copy: string;
    copied: string;
    copyFailed: string;
    related: string;
  }
> = {
  en: {
    min: (n) => `${n} min read`,
    reviewed: (d) => `Reviewed ${d}`,
    missing: "That article isn't available.",
    copy: 'Copy to my notes',
    copied: 'Copied',
    copyFailed: "Couldn't copy — select the text to copy it.",
    related: 'People also ask',
  },
  es: {
    min: (n) => `${n} min de lectura`,
    reviewed: (d) => `Revisado el ${d}`,
    missing: 'Ese artículo no está disponible.',
    copy: 'Copiar a mis notas',
    copied: 'Copiado',
    copyFailed: 'No se pudo copiar — seleccione el texto para copiarlo.',
    related: 'La gente también pregunta',
  },
  vi: {
    min: (n) => `Đọc ${n} phút`,
    reviewed: (d) => `Đã rà soát ${d}`,
    missing: 'Bài viết đó không có sẵn.',
    copy: 'Sao chép vào ghi chú',
    copied: 'Đã sao chép',
    copyFailed: 'Không sao chép được — hãy chọn văn bản để sao chép.',
    related: 'Mọi người cũng hỏi',
  },
};

/** Reviewed-on date as a short local label, never via Date's own locale. */
function reviewedLabel(iso: string, locale: FunnelLocale): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  // Matches Citation.tsx's month labels so "Reviewed" and "Verified" on the
  // same screen read consistently (esp. vi: "thg 8", not "Th8").
  const months: Record<FunnelLocale, string[]> = {
    en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    vi: ['thg 1', 'thg 2', 'thg 3', 'thg 4', 'thg 5', 'thg 6', 'thg 7', 'thg 8', 'thg 9', 'thg 10', 'thg 11', 'thg 12'],
  };
  const mon = months[locale][Number(m[2]) - 1] ?? m[2];
  const day = Number(m[3]);
  return locale === 'vi' ? `${day} ${mon} ${m[1]}` : `${mon} ${day}, ${m[1]}`;
}

export default function ArticleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<NavigatorStackParamList, 'Article'>>();
  const { locale } = useI18n();
  const fl = toFunnelLocale(locale);
  const t = UI[fl];
  const article = useMemo(() => getLearnArticle(route.params.articleKey, fl), [route.params.articleKey, fl]);

  if (!article) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.missing}>
          <Text style={styles.missingText}>{t.missing}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const openAction = () => {
    const { screen, params, tab } = article.target;
    (navigation as any).navigate(tab, { screen, params, initial: false });
  };

  /**
   * The conversation bridge — hand the parent to the AI, already seeded with
   * what they were reading (never a blank box). `seed` opens the general
   * handoff; a tapped related question opens that specific one.
   *
   * PUSH a fresh chat rather than `navigate` to NavigatorMain: the reader and
   * the chat share the Navigator stack, so a plain navigate would POP back to
   * NavigatorMain and discard the article. Pushing keeps the article beneath,
   * so Back returns to it — the article stays "complete," and the fresh screen
   * starts with isLoading false, so the seed can never land mid-stream.
   */
  const openBridge = (ask: string) => {
    (navigation as any).push('NavigatorMain', { ask });
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{article.title}</Text>
        <View style={styles.metaRow}>
          <Text style={styles.meta}>{t.min(article.minutes)}</Text>
          {/* The "Reviewed" seal shows ONLY when a human actually verified the
              body against its citation — an unreviewed draft carries no date. */}
          {!!article.reviewedOn && (
            <>
              <Text style={styles.metaDot}>·</Text>
              <Text style={styles.meta}>{t.reviewed(reviewedLabel(article.reviewedOn, fl))}</Text>
            </>
          )}
        </View>
        {!!article.citation && (
          <View style={styles.citeRow}>
            <Citation citation={article.citation} locale={fl} fontSize={12} />
          </View>
        )}

        <View style={styles.body}>
          {article.body.map((block, i) => (
            <Block key={i} block={block} t={t} />
          ))}
        </View>

        {/* The conversation bridge — the soft "not sure?" door into the AI,
            seeded with this article's context. The article reads as complete
            without it (two doors, never forced). */}
        <View style={styles.bridge}>
          <Text style={styles.bridgeBlurb}>{article.bridge.blurb}</Text>
          <Pressable
            style={({ pressed }) => [styles.bridgeCta, pressed && styles.ctaPressed]}
            onPress={() => openBridge(article.bridge.seed)}
            accessibilityRole="button"
            accessibilityLabel={article.bridge.label}
          >
            <Ionicons name="chatbubbles-outline" size={17} color={colors.white} />
            <Text style={styles.bridgeCtaText}>{article.bridge.label}</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.white} />
          </Pressable>

          {article.relatedQuestions.length > 0 && (
            <View style={styles.related}>
              <Text style={styles.relatedHead}>{t.related}</Text>
              {article.relatedQuestions.map((q, i) => (
                <Pressable
                  key={i}
                  style={({ pressed }) => [styles.relatedRow, pressed && styles.relatedRowPressed]}
                  onPress={() => openBridge(q)}
                  accessibilityRole="button"
                  accessibilityLabel={q}
                >
                  <Text style={styles.relatedText}>{q}</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.teal} />
                </Pressable>
              ))}
            </View>
          )}
        </View>

        {/* The confident "I know what I need" door — the article's direct
            end-action (the productAction). */}
        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={openAction}
          accessibilityRole="button"
          accessibilityLabel={article.actionLabel}
        >
          <Text style={styles.ctaText}>{article.actionLabel}</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.white} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

type ToolLabels = { copy: string; copied: string; copyFailed: string };

function Block({ block, t }: { block: ArticleBlock; t: ToolLabels }) {
  switch (block.kind) {
    case 'heading':
      return <Text style={styles.heading}>{block.text}</Text>;
    case 'callout':
      return (
        <View style={styles.callout}>
          <Ionicons name="bulb-outline" size={18} color={colors.teal} style={styles.calloutIcon} />
          <Text style={styles.calloutText}>{block.text}</Text>
        </View>
      );
    case 'steps':
      return (
        <View style={styles.steps}>
          {block.items.map((item, i) => (
            <View key={i} style={styles.step}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{item}</Text>
            </View>
          ))}
        </View>
      );
    case 'checklist':
      // A tool the parent KEEPS. Plain text (dashes, one per line) is what
      // pastes cleanly into Notes, Reminders, or a text to themselves.
      return (
        <ToolBlock
          t={t}
          label={block.label}
          icon="checkbox-outline"
          lines={block.items}
          copyText={`${block.label}\n${block.items.map((i) => `- ${i}`).join('\n')}`}
        />
      );
    case 'script':
      return (
        <ToolBlock
          t={t}
          label={block.label}
          icon="chatbubble-ellipses-outline"
          lines={[block.text]}
          copyText={block.text}
        />
      );
    case 'para':
    default:
      return <Text style={styles.para}>{block.text}</Text>;
  }
}

/**
 * A copyable "tool" (checklist or script). The utility-over-prose bet: a parent
 * lifts it into their own notes and carries it into the meeting or the call.
 * Copy is best-effort — a failure never throws in a reader they're mid-article.
 */
function ToolBlock({
  t,
  label,
  icon,
  lines,
  copyText,
}: {
  t: ToolLabels;
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  lines: string[];
  copyText: string;
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await Clipboard.setStringAsync(copyText);
      setCopied(true);
      // The visible label flip is silent to a screen reader, so announce it —
      // a blind parent needs to know the checklist is on their clipboard.
      AccessibilityInfo.announceForAccessibility(t.copied);
    } catch {
      // Clipboard denied or unavailable — don't claim a copy that didn't
      // happen. Say so, so success and silent failure aren't indistinguishable.
      AccessibilityInfo.announceForAccessibility(t.copyFailed);
    }
  };
  return (
    <View style={styles.tool}>
      <View style={styles.toolHead}>
        <Ionicons name={icon} size={18} color={colors.navy} />
        <Text style={styles.toolLabel}>{label}</Text>
      </View>
      {lines.map((line, i) => (
        <Text key={i} style={styles.toolLine}>
          {line}
        </Text>
      ))}
      <Pressable
        style={({ pressed }) => [styles.copyBtn, pressed && styles.copyBtnPressed]}
        onPress={onCopy}
        accessibilityRole="button"
        accessibilityLabel={copied ? t.copied : t.copy}
      >
        <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color={colors.teal} />
        <Text style={styles.copyText}>{copied ? t.copied : t.copy}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.white },
  content: { padding: spacing.lg, paddingBottom: spacing['2xl'] },
  title: {
    fontSize: fonts.sizes['2xl'],
    lineHeight: fonts.sizes['2xl'] * 1.25,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  meta: { fontSize: fonts.sizes.sm, color: colors.mid },
  metaDot: { fontSize: fonts.sizes.sm, color: colors.mid },
  citeRow: { marginTop: spacing.md, flexDirection: 'row' },
  body: { marginTop: spacing.lg, gap: spacing.base },
  para: { fontSize: fonts.sizes.base, lineHeight: fonts.sizes.base * 1.55, color: colors.dark },
  heading: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
    marginTop: spacing.sm,
  },
  callout: {
    flexDirection: 'row',
    gap: spacing.sm,
    backgroundColor: '#E6F7F1',
    borderRadius: radii.md,
    padding: spacing.base,
  },
  calloutIcon: { marginTop: 2 },
  calloutText: { flex: 1, fontSize: fonts.sizes.md, lineHeight: fonts.sizes.md * 1.5, color: colors.navy },
  steps: { gap: spacing.md },
  step: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  stepNum: {
    width: 26,
    height: 26,
    borderRadius: radii.full,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { color: colors.white, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700' },
  stepText: { flex: 1, fontSize: fonts.sizes.base, lineHeight: fonts.sizes.base * 1.5, color: colors.dark, paddingTop: 2 },
  tool: {
    backgroundColor: colors.light,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.base,
    gap: spacing.xs,
  },
  toolHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  toolLabel: { flex: 1, fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  toolLine: { fontSize: fonts.sizes.base, lineHeight: fonts.sizes.base * 1.5, color: colors.dark },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: spacing.xs,
    minHeight: MIN_TOUCH_TARGET,
    minWidth: MIN_TOUCH_TARGET,
    paddingRight: spacing.sm,
    marginTop: spacing.xs,
  },
  copyBtnPressed: { opacity: 0.6 },
  copyText: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.teal },
  bridge: {
    marginTop: spacing.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.coral,
    backgroundColor: '#FEF0E6',
    borderRadius: radii.lg,
    padding: spacing.base,
  },
  bridgeBlurb: {
    fontSize: fonts.sizes.md,
    lineHeight: fonts.sizes.md * 1.5,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  bridgeCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.coral,
    borderRadius: radii.md,
    minHeight: MIN_TOUCH_TARGET + 4,
    paddingHorizontal: spacing.base,
  },
  bridgeCtaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold as '700' },
  related: { marginTop: spacing.base, gap: spacing.xs },
  relatedHead: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold as '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.mid,
    marginBottom: spacing.xs,
  },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: MIN_TOUCH_TARGET,
    paddingVertical: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: '#F3D9C4',
  },
  relatedRowPressed: { opacity: 0.6 },
  relatedText: { flex: 1, fontSize: fonts.sizes.md, color: colors.navy, lineHeight: fonts.sizes.md * 1.4 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold as '700' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  missingText: { fontSize: fonts.sizes.base, color: colors.mid, textAlign: 'center' },
});
