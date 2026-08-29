/**
 * Home tools area (Home Tools Redesign, hybrid v2 — Aug 2026).
 * Replaces the 26-tile grid: search + privacy line, three always-open
 * action rows with live date/direction badges, then four doors that
 * expand in place (one open at a time, last-open remembered). All
 * destinations and copy come from lib/toolsCatalog.ts; the shape and
 * wording follow the 10-persona caregiver stress test.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import {
  getActionTools,
  getToolDoors,
  searchTools,
  searchPlaceholder,
  requestsBadge,
  replyBadge,
  lettersDescription,
} from '@/lib/toolsCatalog';
import type { ToolBadge, ToolEntry, DoorKey } from '@/lib/toolsCatalog';
import type { FamilyRequest } from '@/hooks/useRequests';
import { toFunnelLocale } from '@/lib/eligibility';
import type { FunnelLocale } from '@/lib/eligibility';
import { useI18n } from '@/i18n';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const OPEN_DOOR_KEY = 'waypoint.tools.openDoor';

const BADGE_STYLE: Record<ToolBadge['tone'], { bg: string; fg: string }> = {
  warning: { bg: semantic.warningBg, fg: semantic.warning },
  danger: { bg: semantic.dangerBg, fg: semantic.danger },
  info: { bg: semantic.infoBg, fg: semantic.info },
};

const STRINGS: Record<FunnelLocale, {
  takeAction: string;
  privacy: string;
  noResults: string;
  recordsTitle: (name: string) => string;
}> = {
  en: {
    takeAction: 'TAKE ACTION',
    privacy: 'Private to your family — never shared with any agency.',
    noResults: 'Nothing found — try another word, or ask the AI Navigator.',
    recordsTitle: (name) => `${name}'s records`,
  },
  es: {
    takeAction: 'TOMAR ACCIÓN',
    privacy: 'Privado para su familia — nunca se comparte con ninguna agencia.',
    noResults: 'No se encontró nada — pruebe otra palabra o pregunte al Navegador.',
    recordsTitle: (name) => `Expedientes de ${name}`,
  },
  vi: {
    takeAction: 'HÀNH ĐỘNG',
    privacy: 'Riêng tư cho gia đình quý vị — không bao giờ chia sẻ với cơ quan nào.',
    noResults: 'Không tìm thấy — thử từ khác, hoặc hỏi Trợ lý AI.',
    recordsTitle: (name) => `Hồ sơ của ${name}`,
  },
};

interface ToolsAreaProps {
  /** Selected child's first name (multi-child switching is the Home header's ChildPicker). */
  selectedChildName: string | null;
  requests: FamilyRequest[];
  hasUnansweredReply: boolean;
  childAgeYears: number | null;
}

export default function ToolsArea({
  selectedChildName,
  requests,
  hasUnansweredReply,
  childAgeYears,
}: ToolsAreaProps) {
  const navigation = useNavigation();
  const { locale } = useI18n();
  const funnelLocale: FunnelLocale = toFunnelLocale(locale);
  const S = STRINGS[funnelLocale];

  const [query, setQuery] = useState('');
  const [openDoor, setOpenDoor] = useState<DoorKey | null>(null);

  // Restore the last-open door; fail open on any error.
  useEffect(() => {
    (async () => {
      try {
        const door = await AsyncStorage.getItem(OPEN_DOOR_KEY);
        if (door === 'understand' || door === 'money' || door === 'records' || door === 'more') {
          setOpenDoor(door);
        }
      } catch {
        // AsyncStorage unavailable — defaults are fine
      }
    })();
  }, []);

  const toggleDoor = (key: DoorKey) => {
    const next = openDoor === key ? null : key;
    setOpenDoor(next);
    AsyncStorage.setItem(OPEN_DOOR_KEY, next ?? '').catch(() => {});
  };

  const goTo = (tool: ToolEntry) => {
    const { screen, params, tab } = tool.route;
    if (tab) {
      (navigation as any).navigate(tab, { screen, params, initial: false });
    } else {
      (navigation as any).navigate(screen, params);
    }
  };

  const actionTools = useMemo(() => getActionTools(funnelLocale), [funnelLocale]);
  const doors = useMemo(() => getToolDoors(funnelLocale), [funnelLocale]);
  const results = useMemo(
    () => (query.trim() ? searchTools(query, funnelLocale) : null),
    [query, funnelLocale]
  );

  const hasAnyRequest = requests.length > 0;
  const badges: Record<string, ToolBadge | null> = {
    letters: null,
    requests: requestsBadge(requests, funnelLocale),
    sent_received: replyBadge(hasUnansweredReply, funnelLocale),
  };

  const renderRow = (tool: ToolEntry, opts?: { description?: string; compact?: boolean }) => {
    const badge = badges[tool.key] ?? null;
    const description = opts?.description ?? tool.description;
    return (
      <Pressable
        key={tool.key}
        style={({ pressed }) => [styles.row, opts?.compact && styles.rowCompact, pressed && styles.pressed]}
        onPress={() => goTo(tool)}
        accessibilityRole="button"
        accessibilityLabel={`${tool.label}. ${description}`}
      >
        {!opts?.compact && (
          <View style={styles.iconChip}>
            <Ionicons name={tool.icon as never} size={20} color={colors.teal} />
          </View>
        )}
        <View style={styles.rowBody}>
          <View style={styles.rowTitleLine}>
            <Text style={styles.rowTitle}>{tool.label}</Text>
            {badge && (
              <View style={[styles.badge, { backgroundColor: BADGE_STYLE[badge.tone].bg }]}>
                <Text style={[styles.badgeText, { color: BADGE_STYLE[badge.tone].fg }]}>
                  {badge.text}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.rowDescription}>{description}</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.mid} />
      </Pressable>
    );
  };

  return (
    <View>
      {/* Search + privacy */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={18} color={colors.mid} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={searchPlaceholder(childAgeYears, funnelLocale)}
          placeholderTextColor={colors.mid}
          accessibilityLabel={searchPlaceholder(childAgeYears, funnelLocale)}
        />
        {query.length > 0 && (
          <Pressable onPress={() => setQuery('')} hitSlop={8} accessibilityRole="button">
            <Ionicons name="close-circle" size={18} color={colors.mid} />
          </Pressable>
        )}
      </View>
      <View style={styles.privacyLine}>
        <Ionicons name="lock-closed-outline" size={12} color={colors.mid} />
        <Text style={styles.privacyText}>{S.privacy}</Text>
      </View>

      {results ? (
        <View style={styles.card}>
          {results.length === 0 ? (
            <Text style={styles.noResults}>{S.noResults}</Text>
          ) : (
            results.map((t) => renderRow(t))
          )}
        </View>
      ) : (
        <>
          {/* Take action — always open */}
          <Text style={styles.sectionLabel}>{S.takeAction}</Text>
          <View style={styles.card}>
            {actionTools.map((t) =>
              renderRow(t, t.key === 'letters'
                ? { description: lettersDescription(hasAnyRequest, funnelLocale) }
                : undefined)
            )}
          </View>

          {/* Doors — expand in place, one at a time */}
          {/* Doors — expand in place, one at a time */}
          <View style={[styles.card, styles.cardSpaced]}>
            {doors.map((door, i) => {
              const open = openDoor === door.key;
              const title =
                door.key === 'records' && selectedChildName
                  ? S.recordsTitle(selectedChildName)
                  : door.title;
              return (
                <View key={door.key} style={i > 0 ? styles.doorDivider : null}>
                  <Pressable
                    style={({ pressed }) => [styles.row, open && styles.doorOpen, pressed && styles.pressed]}
                    onPress={() => toggleDoor(door.key)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: open }}
                    accessibilityLabel={`${title}. ${door.contents}`}
                  >
                    <View style={[styles.iconChip, { backgroundColor: door.tint }]}>
                      <Ionicons name={door.icon as never} size={20} color={door.color} />
                    </View>
                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>{title}</Text>
                      <Text style={styles.rowDescription}>{door.contents}</Text>
                    </View>
                    <Ionicons
                      name={open ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={open ? door.color : colors.mid}
                    />
                  </Pressable>
                  {open && (
                    <View style={styles.doorContents}>
                      {door.tools.map((t) => renderRow(t, { compact: true }))}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    paddingVertical: spacing.sm,
  },
  privacyLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.md,
  },
  privacyText: { fontSize: fonts.sizes.sm, color: '#475569' },
  sectionLabel: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.extrabold,
    letterSpacing: 1,
    color: '#475569',
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    overflow: 'hidden',
  },
  cardSpaced: { marginTop: spacing.md },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 48,
  },
  rowCompact: { paddingLeft: spacing.xl + spacing.md, paddingVertical: 10, minHeight: 44 },
  pressed: { backgroundColor: colors.light },
  iconChip: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: { flex: 1, minWidth: 0 },
  rowTitleLine: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  rowTitle: {
    fontSize: fonts.sizes.base,
    fontWeight: fonts.weights.semibold,
    color: colors.navy,
  },
  rowDescription: { fontSize: 13.5, color: '#475569', lineHeight: 18, marginTop: 1 },
  badge: {
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
  },
  badgeText: { fontSize: 11, fontWeight: fonts.weights.extrabold },
  doorDivider: { borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  doorOpen: { backgroundColor: colors.light },
  doorContents: {
    backgroundColor: colors.light,
    paddingBottom: spacing.sm,
  },
  noResults: {
    padding: spacing.base,
    fontSize: fonts.sizes.md,
    color: colors.mid,
  },
});
