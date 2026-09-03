/**
 * "Where is this step at?" — one control, two sizes, both screens.
 *
 * Replaces two affordances that had the same job and neither of which said
 * what a tap would do:
 *
 * - the list card's 28pt circle, which CYCLED To Do → In Progress → Done →
 *   To Do. Reaching Done from To Do took two taps, nothing named the state a
 *   tap would produce, and 28pt is well under the 44 this repo sets as its own
 *   floor in `accessibility.ts`;
 * - the detail screen's pill row, which sat thirteen sections down the page,
 *   was ~27pt, hard-coded 12px on a screen that ships a text-size control, and
 *   carried no role, no label and no selected state for a screen reader.
 *
 * One tap now goes straight to any state, the current one is filled and
 * announced as selected, and every target clears 44pt.
 *
 * Dismissing is NOT in this control. It is the one status change a parent
 * cannot undo by tapping the next segment along, so it stays behind a
 * deliberate act — a swipe on the list, a secondary button on the detail
 * screen — rather than sitting one mis-tap away from "Done".
 *
 * ## Why both `accessibilityState` and `aria-pressed`
 *
 * react-native-web 0.19 — the translation the web build and the `ui` test
 * project both run through — DROPS the legacy `accessibilityState` object
 * entirely. It reaches neither the DOM nor the accessibility tree, for any
 * role: rendering `accessibilityState={{ selected: true }}` emits
 * `role="button"` and nothing else. Only the newer ARIA-style props survive,
 * and React Native 0.76 maps those back onto native state — so setting both is
 * correct on iOS, Android and web rather than a workaround for one of them.
 *
 * `aria-pressed` rather than `aria-selected`: these are toggle buttons, and
 * `aria-selected` is only valid on option/tab/row/gridcell.
 *
 * Every other `accessibilityState={{ selected }}` in this app has the same
 * silent hole on the web build — including the edit sheet's priority row.
 * Noted rather than swept: fixing them all is a separate change.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActionStatus } from '@/types/database';
import {
  STATUS_META,
  STATUS_PRIMARY,
  statusActionLabel,
  statusLabel,
  type ActionLocale,
} from '@/lib/actionMeta';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { brand, fonts, radii } from '@/lib/theme';

interface StatusControlProps {
  status: ActionStatus;
  onChange: (next: ActionStatus) => void;
  locale?: ActionLocale;
  /** `compact` on a list card, `large` on the detail screen. */
  size?: 'compact' | 'large';
  /**
   * This step builds on another that is not done yet. The segments still
   * respond so the caller can explain why — a control that goes dead on tap
   * reads as broken, not as locked.
   */
  locked?: boolean;
  /** Multiplier from the detail screen's `Aa` text-size control. */
  scale?: number;
  /** Prefix for the spoken label, so a screen reader hears which step. */
  accessibilityPrefix?: string;
}

/**
 * A segmented To Do / In Progress / Done control.
 *
 * @param status - the step's current status
 * @param onChange - called with the status the parent tapped; it is never
 *   called with the status the step is already in
 * @param locale - en (default), es or vi
 * @param size - `compact` for a list card, `large` for the detail screen
 * @param locked - render the padlock; taps still fire so the caller can explain
 * @param scale - text-scale multiplier (detail screen only)
 * @param accessibilityPrefix - e.g. the step's title, spoken before the action
 */
export default function StatusControl({
  status,
  onChange,
  locale = 'en',
  size = 'compact',
  locked = false,
  scale = 1,
  accessibilityPrefix,
}: StatusControlProps) {
  const large = size === 'large';
  const height = large ? Math.max(MIN_TOUCH_TARGET + 8, Math.round(52 * scale)) : MIN_TOUCH_TARGET;
  const fontSize = large ? Math.round(14 * scale) : 12;

  return (
    <View style={[styles.row, { minHeight: height }, large && styles.rowLarge]}>
      {STATUS_PRIMARY.map((option, i) => {
        const selected = option === status;
        const meta = STATUS_META[option];
        const name = statusLabel(option, locale);
        const spoken = selected
          ? `${name} — ${currentWord(locale)}`
          : statusActionLabel(option, locale);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.segment,
              { minHeight: height },
              i > 0 && styles.segmentDivided,
              // Selection is carried by THREE cues, not one: the tint, the
              // bold coloured label, and this underline. `not_started`'s tint
              // is a near-white by necessity (it is the resting state of most
              // cards), so on tint alone the current segment was barely
              // distinguishable — and tint alone would fail a colour-blind
              // parent anyway. Same rule `brandKit`'s ProgressRail follows.
              selected && { backgroundColor: meta.tint, borderBottomWidth: 3, borderBottomColor: meta.color },
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
            {locked && option !== status ? (
              <Ionicons name="lock-closed" size={Math.round(fontSize)} color={brand.inkFaint} />
            ) : (
              <Text
                style={[
                  styles.glyph,
                  { fontSize: Math.round(fontSize * 1.1), color: selected ? meta.color : brand.inkFaint },
                ]}
              >
                {meta.glyph}
              </Text>
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { fontSize, color: selected ? meta.color : brand.inkSoft },
                selected && styles.labelSelected,
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
  if (locale === 'es') return 'estado actual';
  if (locale === 'vi') return 'trạng thái hiện tại';
  return 'current status';
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: brand.border,
    borderRadius: radii.md,
    backgroundColor: brand.paper,
    overflow: 'hidden',
  },
  rowLarge: {
    borderColor: brand.borderStrong,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 4,
    // Reserved on every segment so the row does not jump by 3pt when the
    // selection moves.
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  segmentDivided: {
    borderLeftWidth: 1,
    borderLeftColor: brand.border,
  },
  glyph: {
    fontWeight: fonts.weights.bold,
  },
  label: {
    fontWeight: fonts.weights.medium,
  },
  labelSelected: {
    fontWeight: fonts.weights.bold,
  },
});
