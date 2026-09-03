/**
 * "What do I do with this step?" — the two moves a parent actually makes,
 * one tap each, on the list card and the action detail screen.
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
 * ## Buttons, not a segmented bar (owner decision, Sep 3 2026)
 *
 * Three mockup options went to the owner: a three-segment To Do / In Progress
 * / Done bar, these two buttons, and an enlarged version of the old cycling
 * circle. The owner picked the buttons, "slightly smaller".
 *
 * The accepted trade is that the current state is IMPLIED by which buttons are
 * showing rather than stated — a parent cannot glance at a card and read "In
 * Progress". Two mitigations, both free: a finished step reads as finished
 * (struck-through title, and its only button is Reopen), and the detail
 * screen — which has the room the card does not — names the state beside its
 * STATUS heading.
 *
 * ## "Slightly smaller" without dropping below the floor
 *
 * 44pt WAS the visible height, which is exactly `MIN_TOUCH_TARGET`, so
 * shrinking the button cannot mean shrinking the target. The visible button is
 * 38 (46 on the detail screen) and reaches 44 through vertical `hitSlop` — the
 * same trick the card's priority badge uses. The slop is vertical ONLY: two
 * buttons sit side by side with an 8pt gap, and horizontal slop wide enough to
 * matter would overlap in the middle, where a mis-tap means marking the wrong
 * thing Done.
 *
 * Fills are tinted rather than solid for the same reason — a solid teal button
 * out-shouted the step's own title, which is the thing a parent is meant to
 * read first.
 *
 * ## Why both `accessibilityState` and `aria-pressed`-style props
 *
 * react-native-web 0.19 (the translation the web build and the `ui` test
 * project both use) DROPS the legacy `accessibilityState` object entirely — it
 * reaches neither the DOM nor the accessibility tree, for any role. Only the
 * newer ARIA-style props survive, and React Native 0.76 maps those back onto
 * native state, so setting both is correct on iOS, Android and web rather than
 * a workaround for one. These are plain actions rather than toggles, so what
 * they carry is `accessibilityState={{ disabled }}` / `aria-disabled`.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ActionStatus } from '@/types/database';
import {
  STATUS_META,
  statusActionLabel,
  statusVerbLabel,
  type ActionLocale,
  type StatusVerb,
} from '@/lib/actionMeta';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { brand, fonts, radii } from '@/lib/theme';

/** Visible height. The 44pt target is reached with vertical hitSlop. */
const COMPACT_HEIGHT = 38;
const LARGE_HEIGHT = 46;

interface StatusControlProps {
  status: ActionStatus;
  onChange: (next: ActionStatus) => void;
  locale?: ActionLocale;
  /** `compact` on a list card, `large` on the detail screen. */
  size?: 'compact' | 'large';
  /**
   * This step builds on another that is not done yet. The forward buttons
   * still respond so the caller can explain why — a control that goes dead on
   * tap reads as broken, not as locked.
   */
  locked?: boolean;
  /** Multiplier from the detail screen's `Aa` text-size control. */
  scale?: number;
  /** Prefix for the spoken label, so a screen reader hears which step. */
  accessibilityPrefix?: string;
}

interface StatusButton {
  verb: StatusVerb;
  /** The status this button moves the step to. */
  target: ActionStatus;
  /** Which status's colour it wears — the one it produces. */
  emphasis: 'primary' | 'secondary';
  /** Forward moves are the ones a dependency lock blocks. */
  forward: boolean;
}

/**
 * What a step at this status offers. Dismissing is not here: it is the one
 * change a parent cannot undo by tapping the other button, so it stays behind
 * a swipe on the list and a secondary link on the detail screen.
 */
function buttonsFor(status: ActionStatus): StatusButton[] {
  switch (status) {
    case 'not_started':
      return [
        { verb: 'start', target: 'in_progress', emphasis: 'primary', forward: true },
        { verb: 'done', target: 'completed', emphasis: 'secondary', forward: true },
      ];
    case 'in_progress':
      return [
        { verb: 'done', target: 'completed', emphasis: 'primary', forward: true },
        { verb: 'todo', target: 'not_started', emphasis: 'secondary', forward: false },
      ];
    // Completed and dismissed both offer one way back, and nothing else.
    default:
      return [{ verb: 'reopen', target: 'not_started', emphasis: 'primary', forward: false }];
  }
}

const ICON: Record<StatusVerb, keyof typeof Ionicons.glyphMap> = {
  start: 'play-circle-outline',
  done: 'checkmark-circle-outline',
  todo: 'ellipse-outline',
  reopen: 'refresh-outline',
};

/**
 * The card's status buttons — Start / Done, Done / To Do, or Reopen.
 *
 * @param status - the step's current status
 * @param onChange - called with the status the parent chose
 * @param locale - en (default), es or vi
 * @param size - `compact` for a list card, `large` for the detail screen
 * @param locked - render padlocks on the forward moves; taps still fire so the
 *   caller can explain why
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
  const height = large ? Math.round(LARGE_HEIGHT * scale) : COMPACT_HEIGHT;
  const fontSize = large ? Math.round(14 * scale) : 13;
  // Vertical only — see the note on side-by-side slop at the top of this file.
  const slop = Math.max(0, Math.round((MIN_TOUCH_TARGET - height) / 2));
  const hitSlop = { top: slop, bottom: slop, left: 0, right: 0 };

  const buttons = buttonsFor(status);

  return (
    <View style={styles.row}>
      {buttons.map((b) => {
        const meta = STATUS_META[b.target];
        const primary = b.emphasis === 'primary';
        const gated = locked && b.forward;
        return (
          <TouchableOpacity
            key={b.verb}
            style={[
              styles.button,
              { minHeight: height },
              primary
                ? { backgroundColor: meta.tint, borderColor: meta.color }
                : styles.buttonSecondary,
            ]}
            hitSlop={hitSlop}
            onPress={() => onChange(b.target)}
            accessibilityRole="button"
            accessibilityState={{ disabled: false }}
            accessibilityLabel={
              accessibilityPrefix
                ? `${accessibilityPrefix}: ${statusActionLabel(b.target, locale)}`
                : statusActionLabel(b.target, locale)
            }
          >
            {gated ? (
              <Ionicons name="lock-closed" size={Math.round(fontSize)} color={brand.inkFaint} />
            ) : (
              <Ionicons
                name={ICON[b.verb]}
                size={Math.round(fontSize * 1.25)}
                color={primary ? meta.color : brand.inkSoft}
              />
            )}
            <Text
              numberOfLines={1}
              style={[
                styles.label,
                { fontSize, color: primary ? meta.color : brand.inkSoft },
                primary && styles.labelPrimary,
              ]}
            >
              {statusVerbLabel(b.verb, locale)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    borderWidth: 1,
  },
  buttonSecondary: {
    backgroundColor: brand.panel,
    borderColor: brand.border,
  },
  label: {
    fontWeight: fonts.weights.semibold,
  },
  labelPrimary: {
    fontWeight: fonts.weights.bold,
  },
});
