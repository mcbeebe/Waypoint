/**
 * The tiles a family pinned (Home rebuild phase 4).
 *
 * Twenty-six tools serve twenty-six different families, so the top of the
 * toolbox is theirs to choose: pinned tiles, shared across the family, capped
 * at six, with one suggestion Waypoint offers in place — never as a popup,
 * and never twice for the same tool.
 *
 * All of the rules live in `lib/toolPins.ts`; this renders them.
 */
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getAllTools } from '@/lib/toolsCatalog';
import type { ToolEntry } from '@/lib/toolsCatalog';
import { MAX_PINS, pinStrings } from '@/lib/toolPins';
import type { UseToolPins } from '@/hooks/useToolPins';
import type { FunnelLocale } from '@/lib/eligibility';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, radii, semantic, spacing } from '@/lib/theme';

interface PinnedToolsProps {
  pins: UseToolPins;
  locale: FunnelLocale;
  /** Shown when the pins could not be shared with the family. */
  onNotice?: (message: string) => void;
}

export default function PinnedTools({ pins, locale, onNotice }: PinnedToolsProps) {
  const navigation = useNavigation();
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);
  const s = pinStrings(locale);
  const [editing, setEditing] = useState(false);

  const catalog = useMemo(() => getAllTools(locale), [locale]);
  const byKey = useMemo(() => {
    const map: Record<string, ToolEntry> = {};
    for (const t of catalog) map[t.key] = t;
    return map;
  }, [catalog]);

  const tiles = pins.pins.map((k) => byKey[k]).filter(Boolean) as ToolEntry[];
  const suggested = pins.suggestion ? byKey[pins.suggestion] : null;

  const open = (tool: ToolEntry) => {
    pins.noteOpened(tool.key);
    const { screen, params, tab } = tool.route;
    if (tab) {
      (navigation as any).navigate(tab, { screen, params, initial: false });
      return;
    }
    (navigation as any).navigate(screen, params);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.head}>
        <Text style={[styles.heading, { fontSize: sz(11) }]}>{s.heading.toUpperCase()}</Text>
        {tiles.length > 0 && (
          <Pressable
            onPress={() => setEditing((e) => !e)}
            style={styles.editButton}
            accessibilityRole="button"
            accessibilityLabel={editing ? s.done : s.edit}
          >
            <Text style={[styles.editText, { fontSize: sz(13) }]}>
              {editing ? s.done : s.edit}
            </Text>
          </Pressable>
        )}
      </View>

      {tiles.length === 0 ? (
        <Text style={[styles.hint, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
          {s.emptyHint}
        </Text>
      ) : (
        <View style={styles.grid}>
          {tiles.map((tool) => (
            <View key={tool.key} style={styles.tileWrap}>
              <Pressable
                style={({ pressed }) => [styles.tile, pressed && styles.dim]}
                onPress={() => (editing ? undefined : open(tool))}
                disabled={editing}
                accessibilityRole="button"
                accessibilityLabel={tool.label}
              >
                <Ionicons name={tool.icon as never} size={22} color={colors.teal} />
                <Text
                  style={[styles.tileLabel, { fontSize: sz(11.5), lineHeight: sz(15) }]}
                  numberOfLines={2}
                >
                  {tool.label}
                </Text>
              </Pressable>
              {editing && (
                <Pressable
                  style={styles.remove}
                  onPress={() => void pins.unpin(tool.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`${s.unpin}: ${tool.label}`}
                >
                  <Ionicons name="close" size={14} color={colors.white} />
                </Pressable>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Offered in place, once. Either answer ends it for that tool. */}
      {!editing && suggested && (
        <View style={styles.suggest}>
          <Text style={[styles.suggestTitle, { fontSize: sz(13.5), lineHeight: sz(19) }]}>
            {s.suggestTitle(suggested.label)}
          </Text>
          <Text style={[styles.suggestBody, { fontSize: sz(12.5), lineHeight: sz(18) }]}>
            {s.suggestBody(suggested.label, pins.opensOf(suggested.key))}
          </Text>
          <View style={styles.suggestRow}>
            <Pressable
              style={({ pressed }) => [styles.suggestYes, pressed && styles.dim]}
              onPress={() =>
                void pins.pin(suggested.key).then((message) => {
                  if (message) onNotice?.(message);
                })
              }
              accessibilityRole="button"
              accessibilityLabel={s.suggestYes}
            >
              <Text style={[styles.suggestYesText, { fontSize: sz(13) }]}>{s.suggestYes}</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.suggestNo, pressed && styles.dim]}
              onPress={() => void pins.declineSuggestion(suggested.key)}
              accessibilityRole="button"
              accessibilityLabel={s.suggestNo}
            >
              <Text style={[styles.suggestNoText, { fontSize: sz(13) }]}>{s.suggestNo}</Text>
            </Pressable>
          </View>
        </View>
      )}

      {editing && tiles.length >= MAX_PINS && (
        <Text style={[styles.hint, { fontSize: sz(12), lineHeight: sz(17) }]}>
          {s.emptyHint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: spacing.sm, marginBottom: spacing.base },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heading: { color: colors.mid, fontWeight: fonts.weights.bold, letterSpacing: 1 },
  editButton: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  editText: { color: colors.teal, fontWeight: fonts.weights.bold },
  hint: { color: colors.mid },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tileWrap: { width: '31%' },
  tile: {
    minHeight: 76,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: spacing.sm,
  },
  tileLabel: {
    color: colors.navy,
    fontWeight: fonts.weights.semibold,
    textAlign: 'center',
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: semantic.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggest: {
    backgroundColor: semantic.successBg,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
  },
  suggestTitle: { color: colors.navy, fontWeight: fonts.weights.bold },
  suggestBody: { color: colors.dark },
  suggestRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  suggestYes: {
    minHeight: 44,
    paddingHorizontal: spacing.base,
    borderRadius: radii.sm,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestYesText: { color: colors.white, fontWeight: fonts.weights.bold },
  suggestNo: { minHeight: 44, paddingHorizontal: spacing.md, justifyContent: 'center' },
  suggestNoText: { color: colors.mid, fontWeight: fonts.weights.semibold },
  dim: { opacity: 0.6 },
});
