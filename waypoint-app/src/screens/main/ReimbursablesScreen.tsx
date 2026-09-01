/**
 * RC Reimbursables (roadmap 1.3) — what Regional Centers can actually fund,
 * with POS billing codes, typical costs, and insider notes. One of the most
 * differentiated pieces of content in the product (ported from GAS MVP).
 *
 * Upgraded (owner, Aug 31 2026): an AI ask bar on top so a parent can ask a
 * quick question, and every service expands to digestible detail plus a link to
 * the full guide.
 */

import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { RC_REIMBURSABLES } from '@/data/reimbursables';
import { Card, Chip } from '@/components/ui';
import { useTextScale } from '@/lib/textSize';
import { colors, brand, fonts, spacing, semantic, radii } from '@/lib/theme';

/** One-tap starters for the ask bar — real questions the AI answers well. */
const STARTERS = ['Can I get respite?', 'Diapers past age 3?', 'What if they deny it?'];
/** The article the "full guide" link opens until a service has its own. */
const DEFAULT_ARTICLE = 'rc_money';

export default function ReimbursablesScreen() {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const navigation = useNavigation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  /** Hand the question to the AI Navigator (blank box opens the AI too). */
  const askAI = (seed?: string) => {
    const q = (seed ?? query).trim();
    (navigation as any).navigate('Navigator', {
      screen: 'NavigatorMain',
      params: q ? { ask: q } : undefined,
    });
    setQuery('');
  };

  const toggle = (name: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });

  const openGuide = (articleKey: string) =>
    (navigation as any).navigate('Navigator', {
      screen: 'Article',
      params: { articleKey },
      initial: false,
    });

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* AI ask bar — a quick question, right at the top. */}
        <View style={styles.askCard}>
          <View style={styles.composer}>
            <Ionicons name="search" size={sz(19)} color={brand.pine} />
            <TextInput
              style={[styles.composerInput, { fontSize: sz(15) }]}
              value={query}
              onChangeText={setQuery}
              placeholder="Ask about funding — “Can I get respite?”"
              placeholderTextColor={brand.inkFaint}
              returnKeyType="search"
              onSubmitEditing={() => askAI()}
              accessibilityLabel="Ask Waypoint AI about Regional Center funding"
            />
            <Pressable
              style={({ pressed }) => [styles.askBtn, pressed && styles.askBtnPressed]}
              onPress={() => askAI()}
              accessibilityRole="button"
              accessibilityLabel="Ask Waypoint AI your question"
            >
              <Ionicons name="sparkles" size={sz(14)} color={colors.white} />
              <Text style={[styles.askBtnText, { fontSize: sz(13) }]}>Ask</Text>
            </Pressable>
          </View>
          <View style={styles.chips}>
            {STARTERS.map((s) => (
              <Pressable
                key={s}
                style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
                onPress={() => askAI(s)}
                hitSlop={{ top: 8, bottom: 8 }}
                accessibilityRole="button"
                accessibilityLabel={s}
              >
                <Text style={[styles.chipText, { fontSize: sz(12) }]}>{s}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <Text style={[styles.intro, { fontSize: sz(14), lineHeight: sz(21) }]}>
          Services your Regional Center can fund once your child is a client. Ask your Service
          Coordinator about any of these by name — the POS code tells them exactly what you mean.
        </Text>

        {/* Some of these — respite, camp, sibling support — aren't automatic:
            they have to tie to a need in the IPP. This door explains how. */}
        <Pressable
          style={({ pressed }) => [styles.askForLink, pressed && styles.askForLinkPressed]}
          onPress={() => (navigation as any).navigate('AskForSupports')}
          accessibilityRole="button"
          accessibilityLabel="Some supports you have to ask for. See how to get them into the IPP."
        >
          <Ionicons name="hand-left-outline" size={sz(18)} color={brand.pine} />
          <Text style={[styles.askForLinkText, { fontSize: sz(13) }]}>
            Some of these you have to ask for — see how to get them into the IPP
          </Text>
          <Ionicons name="chevron-forward" size={sz(16)} color={brand.inkFaint} />
        </Pressable>

        {RC_REIMBURSABLES.map((item) => {
          const open = expanded.has(item.name);
          const hasMore = !!item.moreInfo && item.moreInfo.length > 0;
          return (
            <Card key={item.name}>
              <View style={styles.head}>
                <Text style={[styles.name, { fontSize: sz(16) }]}>{item.name}</Text>
                <Chip label={`POS ${item.code}`} tone="info" textSize={sz(11)} />
              </View>
              <Text style={[styles.description, { fontSize: sz(14), lineHeight: sz(21) }]}>
                {item.description}
              </Text>
              <Text style={[styles.cost, { fontSize: sz(13) }]}>💰 {item.cost}</Text>
              <View style={styles.noteBox}>
                <Text style={[styles.note, { fontSize: sz(13), lineHeight: sz(19) }]}>
                  💡 {item.note}
                </Text>
              </View>

              {hasMore && (
                <Pressable
                  style={styles.moreToggle}
                  onPress={() => toggle(item.name)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  accessibilityLabel={`${open ? 'Hide' : 'More'} info about ${item.name}`}
                >
                  <Text style={[styles.moreToggleText, { fontSize: sz(13) }]}>
                    {open ? 'Hide' : 'More info'} {open ? '▲' : '▼'}
                  </Text>
                </Pressable>
              )}

              {hasMore && open && (
                <View style={styles.expand}>
                  {item.moreInfo!.map((line, i) => (
                    <View key={i} style={styles.bulletRow}>
                      <Text style={[styles.bulletDot, { fontSize: sz(13) }]}>•</Text>
                      <Text style={[styles.bulletText, { fontSize: sz(13), lineHeight: sz(19) }]}>
                        {line}
                      </Text>
                    </View>
                  ))}
                  <Pressable
                    style={({ pressed }) => [styles.guideLink, pressed && styles.guideLinkPressed]}
                    onPress={() => openGuide(item.articleKey ?? DEFAULT_ARTICLE)}
                    accessibilityRole="button"
                    // Names the funding guide, not the service — every service
                    // links the funding overview until a dedicated article
                    // exists, so the label shouldn't promise per-service content.
                    accessibilityLabel="Read the full funding guide"
                  >
                    <Ionicons name="book-outline" size={sz(15)} color={brand.pine} />
                    <Text style={[styles.guideLinkText, { fontSize: sz(13) }]}>
                      Read the full funding guide
                    </Text>
                    <Ionicons name="arrow-forward" size={sz(14)} color={brand.inkFaint} />
                  </Pressable>
                </View>
              )}
            </Card>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: brand.paper,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  askCard: {
    backgroundColor: brand.pineTint,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.xl,
    padding: spacing.sm + 2,
    marginBottom: spacing.md,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    backgroundColor: brand.panel,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: brand.borderStrong,
    paddingLeft: spacing.base,
    paddingRight: spacing.xs + 2,
    shadowColor: brand.pine,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.14,
    shadowRadius: 10,
    elevation: 2,
  },
  composerInput: { flex: 1, color: brand.ink, paddingVertical: 0 },
  askBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: brand.pine,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    minHeight: 44,
  },
  askBtnPressed: { backgroundColor: brand.pineDeep },
  askBtnText: { color: colors.white, fontWeight: fonts.weights.bold as '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    backgroundColor: brand.panel,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 1,
    paddingHorizontal: spacing.md,
  },
  chipPressed: { backgroundColor: brand.pineTint },
  chipText: { color: brand.inkSoft, fontWeight: fonts.weights.semibold as '600' },
  intro: {
    color: brand.inkFaint,
    marginBottom: spacing.md,
  },
  askForLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: brand.pineTint,
    borderWidth: 1,
    borderColor: brand.borderStrong,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  askForLinkPressed: { backgroundColor: brand.pineTintPressed },
  askForLinkText: {
    flex: 1,
    color: brand.ink,
    fontWeight: fonts.weights.semibold as '600',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontWeight: fonts.weights.bold as '700',
    color: brand.ink,
  },
  description: {
    color: brand.inkSoft,
    marginBottom: 6,
  },
  cost: {
    color: semantic.success,
    fontWeight: fonts.weights.semibold as '600',
    marginBottom: 8,
  },
  noteBox: {
    backgroundColor: semantic.warningBg,
    borderRadius: 8,
    padding: spacing.md,
  },
  note: {
    color: brand.inkSoft,
  },
  moreToggle: {
    marginTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: brand.headerTop,
    paddingTop: spacing.md,
    minHeight: 44,
    justifyContent: 'center',
  },
  moreToggleText: { color: brand.pine, fontWeight: fonts.weights.bold as '700' },
  expand: { marginTop: spacing.sm, gap: spacing.sm },
  bulletRow: { flexDirection: 'row', gap: spacing.sm },
  bulletDot: { color: brand.pine, fontWeight: fonts.weights.bold as '700' },
  bulletText: { flex: 1, color: brand.inkSoft },
  guideLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs,
    backgroundColor: brand.pineTint,
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.base,
  },
  guideLinkPressed: { backgroundColor: brand.pineTintPressed },
  guideLinkText: { flex: 1, color: brand.pineDeep, fontWeight: fonts.weights.bold as '700' },
});
