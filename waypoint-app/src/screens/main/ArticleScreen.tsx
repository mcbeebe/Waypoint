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
import React, { useMemo } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getLearnArticle, type ArticleBlock } from '@/lib/learnLibrary';
import Citation from '@/components/Citation';
import { useI18n } from '@/i18n';
import { toFunnelLocale, type FunnelLocale } from '@/lib/eligibility';
import type { NavigatorStackParamList } from '@/types/navigation';
import { colors, fonts, spacing, radii } from '@/lib/theme';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';

const UI: Record<FunnelLocale, { min: (n: number) => string; reviewed: (d: string) => string; missing: string }> = {
  en: { min: (n) => `${n} min read`, reviewed: (d) => `Reviewed ${d}`, missing: "That article isn't available." },
  es: { min: (n) => `${n} min de lectura`, reviewed: (d) => `Revisado el ${d}`, missing: 'Ese artículo no está disponible.' },
  vi: { min: (n) => `Đọc ${n} phút`, reviewed: (d) => `Đã rà soát ${d}`, missing: 'Bài viết đó không có sẵn.' },
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
            <Block key={i} block={block} />
          ))}
        </View>

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

function Block({ block }: { block: ArticleBlock }) {
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
    case 'para':
    default:
      return <Text style={styles.para}>{block.text}</Text>;
  }
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
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.teal,
    borderRadius: radii.lg,
    minHeight: MIN_TOUCH_TARGET + 8,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold as '700' },
  missing: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  missingText: { fontSize: fonts.sizes.base, color: colors.mid, textAlign: 'center' },
});
