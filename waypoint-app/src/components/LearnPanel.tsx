/**
 * The Learn library under the Ask composer (Home rebuild phase 5).
 *
 * A parent asks a question two ways: they type it, or they go looking. Ask
 * handles the typing; this handles the looking — and it answers first, before
 * the AI has to, whenever the library already knows.
 *
 * Everything decidable is in `lib/learnLibrary.ts`, which is pure and tested.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getLearnLibrary,
  popularQuestions,
  searchLearn,
} from '@/lib/learnLibrary';
import type { LearnHit, LearnTarget } from '@/lib/learnLibrary';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, spacing } from '@/lib/theme';

function strings(locale: FunnelLocale) {
  const L = (en: string, es: string, vi: string) =>
    locale === 'es' ? es : locale === 'vi' ? vi : en;
  return {
    popular: L('Common questions', 'Preguntas comunes', 'Câu hỏi thường gặp'),
    guides: L('Guides', 'Guías', 'Hướng dẫn'),
    articles: L('Read about it', 'Léalo', 'Đọc thêm'),
    glossary: L('What the words mean', 'Qué significan las palabras', 'Các từ này nghĩa là gì'),
    found: L('Waypoint already knows this', 'Waypoint ya sabe esto', 'Waypoint đã biết điều này'),
    noMatch: L(
      'Nothing in the library matches that',
      'Nada en la biblioteca coincide con eso',
      'Thư viện không có mục nào khớp'
    ),
    askAnyway: L('Ask Waypoint instead →', 'Preguntar a Waypoint →', 'Hỏi Waypoint →'),
    minutes: (n: number) => L(`${n} min read`, `${n} min de lectura`, `đọc ${n} phút`),
    read: L('Read', 'Leer', 'Đọc'),
    showAll: L('Show the whole library', 'Ver toda la biblioteca', 'Xem toàn bộ thư viện'),
    showLess: L('Show less', 'Ver menos', 'Thu gọn'),
  };
}

interface LearnPanelProps {
  locale: FunnelLocale;
  /** What the parent has typed, so the library can answer first. */
  query?: string;
  /** Fills the composer with a popular question — it does not send it. */
  onAsk: (question: string) => void;
  /** Sends what the parent typed to the AI. */
  onAskAI: (question: string) => void;
}

export default function LearnPanel({ locale, query, onAsk, onAskAI }: LearnPanelProps) {
  const navigation = useNavigation();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const t = strings(locale);
  const [expanded, setExpanded] = useState(false);

  const library = useMemo(() => getLearnLibrary(locale), [locale]);
  const hits = useMemo(
    () => (query && query.trim().length > 1 ? searchLearn(query, locale) : []),
    [query, locale]
  );

  /**
   * Every target names its tab. This panel renders inside the Ask stack, and
   * a `navigate` bubbles to PARENTS, never to a sibling — so a bare screen
   * name here is silently unhandled in production.
   */
  const go = (target: LearnTarget) => {
    (navigation as any).navigate(target.tab, {
      screen: target.screen,
      params: target.params,
      initial: false,
    });
  };

  /** Open an article in the reader (phase 8). This panel renders in the
   *  Navigator (Learn) stack, which registers 'Article', so a bare navigate
   *  lands here and Back returns to Learn. */
  const openArticle = (key: string) => {
    (navigation as any).navigate('Article', { articleKey: key });
  };

  const hitRow = (hit: LearnHit) => {
    const body = (
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { fontSize: sz(14), lineHeight: sz(19) }]}>
          {hit.title}
        </Text>
        <Text style={[styles.rowDetail, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
          {hit.detail}
        </Text>
        {!!hit.citation && (
          <Text style={[styles.citation, { fontSize: sz(11), lineHeight: sz(15) }]}>
            {hit.citation}
          </Text>
        )}
        {!!hit.actionLabel && (
          <Text style={[styles.action, { fontSize: sz(12.5), lineHeight: sz(17) }]}>
            {hit.actionLabel} ›
          </Text>
        )}
      </View>
    );
    // A definition is the answer. Rendering it as a button that does nothing
    // is worse than never claiming it was one.
    if (!hit.target) {
      return (
        <View
          key={`${hit.kind}:${hit.key}`}
          style={styles.row}
          accessible
          accessibilityRole="text"
        >
          {body}
        </View>
      );
    }
    return (
      <Pressable
        key={`${hit.kind}:${hit.key}`}
        style={({ pressed }) => [styles.row, pressed && styles.dim]}
        // An article opens the reader (same as browsing it), so the reader is
        // reachable from search too and one article never behaves two ways; a
        // path/guide jumps straight to its screen.
        onPress={() => (hit.kind === 'article' ? openArticle(hit.key) : go(hit.target!))}
        accessibilityRole="button"
        accessibilityLabel={`${hit.title}. ${hit.detail}${
          hit.actionLabel ? `. ${hit.actionLabel}` : ''
        }`}
      >
        {body}
      </Pressable>
    );
  };

  // Typing: the library answers first, and Ask stays one tap away.
  const typing = !!query && query.trim().length > 1;
  if (typing) {
    return (
      <View style={styles.wrap}>
        <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>
          {(hits.length ? t.found : t.noMatch).toUpperCase()}
        </Text>
        {hits.length > 0 && (
          <View style={styles.card}>{hits.slice(0, 4).map(hitRow)}</View>
        )}
        <Pressable
          style={({ pressed }) => [styles.chip, pressed && styles.dim]}
          onPress={() => onAskAI(query!)}
          accessibilityRole="button"
          accessibilityLabel={t.askAnyway}
        >
          <Text style={[styles.chipText, { fontSize: sz(13), lineHeight: sz(18) }]}>
            {t.askAnyway}
          </Text>
        </Pressable>
      </View>
    );
  }

  const articles = expanded ? library.articles : library.articles.slice(0, 2);
  const glossary = expanded ? library.glossary : library.glossary.slice(0, 3);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>{t.popular.toUpperCase()}</Text>
      <View style={styles.chips}>
        {popularQuestions(locale).map((q) => (
          <Pressable
            key={q}
            style={({ pressed }) => [styles.chip, pressed && styles.dim]}
            onPress={() => onAsk(q)}
            accessibilityRole="button"
            accessibilityLabel={q}
          >
            <Text style={[styles.chipText, { fontSize: sz(13), lineHeight: sz(18) }]}>{q}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>{t.guides.toUpperCase()}</Text>
      <View style={styles.card}>
        {library.paths.map((p) => (
          <Pressable
            key={p.key}
            style={({ pressed }) => [styles.row, pressed && styles.dim]}
            onPress={() => go(p.target)}
            accessibilityRole="button"
            accessibilityLabel={`${p.title}. ${p.description}`}
          >
            <Ionicons name={p.icon as never} size={20} color={colors.teal} />
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { fontSize: sz(14), lineHeight: sz(19) }]}>
                {p.title}
              </Text>
              <Text style={[styles.rowDetail, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
                {p.description}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.mid} />
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>{t.articles.toUpperCase()}</Text>
      <View style={styles.card}>
        {articles.map((a) => (
          <Pressable
            key={a.key}
            style={({ pressed }) => [styles.row, pressed && styles.dim]}
            onPress={() => openArticle(a.key)}
            accessibilityRole="button"
            accessibilityLabel={`${a.title}. ${a.summary}`}
          >
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { fontSize: sz(14), lineHeight: sz(19) }]}>
                {a.title}
              </Text>
              <Text style={[styles.rowDetail, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
                {a.summary}
              </Text>
              <Text style={[styles.meta, { fontSize: sz(11), lineHeight: sz(15) }]}>
                {t.minutes(a.minutes)}
                {a.citation ? ` · ${a.citation}` : ''}
              </Text>
              <Text style={[styles.action, { fontSize: sz(12.5), lineHeight: sz(17) }]}>
                {t.read} ›
              </Text>
            </View>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.sectionLabel, { fontSize: sz(11) }]}>{t.glossary.toUpperCase()}</Text>
      <View style={styles.card}>
        {glossary.map((g) => (
          <View key={g.term} style={styles.row} accessible accessibilityRole="text">
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { fontSize: sz(14), lineHeight: sz(19) }]}>
                {g.term}
              </Text>
              <Text style={[styles.rowDetail, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
                {g.plain}
              </Text>
              {!!g.citation && (
                <Text style={[styles.citation, { fontSize: sz(11), lineHeight: sz(15) }]}>
                  {g.citation}
                </Text>
              )}
            </View>
          </View>
        ))}
      </View>

      <Pressable
        style={({ pressed }) => [styles.more, pressed && styles.dim]}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityLabel={expanded ? t.showLess : t.showAll}
      >
        <Text style={[styles.moreText, { fontSize: sz(13), lineHeight: sz(18) }]}>
          {expanded ? t.showLess : t.showAll}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, paddingHorizontal: spacing.base, paddingBottom: spacing.base },
  sectionLabel: {
    color: colors.mid,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  chips: { gap: spacing.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  chipText: { color: colors.navy, fontWeight: fonts.weights.semibold },
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    minHeight: 44,
    paddingVertical: spacing.sm,
  },
  rowText: { flex: 1, gap: 3 },
  rowTitle: { color: colors.navy, fontWeight: fonts.weights.bold },
  rowDetail: { color: colors.dark },
  meta: { color: colors.mid },
  citation: {
    color: colors.mid,
    backgroundColor: '#F1F5F9',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    overflow: 'hidden',
  },
  action: { color: colors.teal, fontWeight: fonts.weights.bold },
  more: { minHeight: 44, justifyContent: 'center' },
  moreText: { color: colors.teal, fontWeight: fonts.weights.bold },
  dim: { opacity: 0.6 },
});
