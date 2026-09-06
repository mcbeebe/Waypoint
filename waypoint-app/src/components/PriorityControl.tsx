/**
 * "How urgent is this?" — a priority picker for the list card and the detail
 * screen.
 *
 * Priority was read-only on both surfaces. The only way to change it was the
 * full Edit sheet, which submits all seven fields of an action at once — a
 * heavy door for "actually, this one is urgent".
 *
 * On the card the picker is collapsed behind the badge that was already there,
 * because the alternative — a permanent four-chip row on every card — doubles
 * the chrome on a list whose whole design is "one step at a time". Expanding
 * happens IN PLACE rather than in a popover: the list rows are wrapped in
 * `SwipeableRow`, which is `overflow: 'hidden'`, so anything floating out of a
 * card is clipped with no portal to escape through.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { ActionPriority } from '@/types/database';
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  priorityActionLabel,
  priorityLabel,
  type ActionLocale,
} from '@/lib/actionMeta';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { brand, fonts, radii } from '@/lib/theme';

interface PriorityControlProps {
  priority: ActionPriority;
  onChange: (next: ActionPriority) => void;
  locale?: ActionLocale;
  /** `compact` on a list card, `large` on the detail screen. */
  size?: 'compact' | 'large';
  /** Multiplier from the detail screen's `Aa` text-size control. */
  scale?: number;
  /** Prefix for the spoken label, so a screen reader hears which step. */
  accessibilityPrefix?: string;
}

/**
 * A four-chip Urgent / High / Medium / Low picker.
 *
 * @param priority - the step's current priority
 * @param onChange - called with the priority tapped; never with the current one
 * @param locale - en (default), es or vi
 * @param size - `compact` for a list card, `large` for the detail screen
 * @param scale - text-scale multiplier (detail screen only)
 * @param accessibilityPrefix - e.g. the step's title, spoken before the action
 */
export default function PriorityControl({
  priority,
  onChange,
  locale = 'en',
  size = 'compact',
  scale = 1,
  accessibilityPrefix,
}: PriorityControlProps) {
  const large = size === 'large';
  const height = large ? Math.max(MIN_TOUCH_TARGET, Math.round(46 * scale)) : MIN_TOUCH_TARGET;
  const fontSize = large ? Math.round(13 * scale) : 12;

  return (
    <View style={styles.row}>
      {PRIORITY_ORDER.map((option) => {
        const selected = option === priority;
        const meta = PRIORITY_META[option];
        const name = priorityLabel(option, locale);
        const spoken = selected
          ? `${name} — ${currentWord(locale)}`
          : priorityActionLabel(option, locale);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              { minHeight: height },
              selected && { backgroundColor: meta.bg, borderColor: meta.color },
            ]}
            onPress={() => {
              if (!selected) onChange(option);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            aria-pressed={selected}
            accessibilityLabel={
              accessibilityPrefix ? `${accessibilityPrefix}: ${spoken}` : spoken
            }
          >
            <Text
              numberOfLines={1}
              style={[
                styles.chipText,
                { fontSize, color: selected ? meta.color : brand.inkSoft },
                selected && styles.chipTextSelected,
              ]}
            >
              {name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

/** "current" as a screen reader should hear it, per locale. */
function currentWord(locale: ActionLocale): string {
  if (locale === 'es') return 'prioridad actual';
  if (locale === 'vi') return 'mức ưu tiên hiện tại';
  return 'current priority';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flex: 1,
    minWidth: 68,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.paper,
  },
  chipText: {
    fontWeight: fonts.weights.medium,
  },
  chipTextSelected: {
    fontWeight: fonts.weights.bold,
  },
});
