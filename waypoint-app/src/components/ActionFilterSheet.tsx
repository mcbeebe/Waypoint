/**
 * "Show me only…" — the Action Plan's priority / deadline / date-added filters.
 *
 * These live in a sheet rather than inline because the plan already carries two
 * rows of chrome above the first card (the progress dashboard and the status
 * pills). Three more always-on chip rows would push the actual next step below
 * the fold on a phone, which is the opposite of what the focus view is for.
 *
 * Changes apply immediately — there is no Apply button to forget to press, and
 * the count on the button that opened the sheet is the parent's receipt that
 * the list is showing a subset.
 */

import React from 'react';
import { Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import type { ActionPriority } from '@/types/database';
import {
  PRIORITY_META,
  PRIORITY_ORDER,
  metaHeading,
  priorityLabel,
  type ActionLocale,
} from '@/lib/actionMeta';
import {
  activeFilterCount,
  createdFilterLabel,
  dueFilterLabel,
  sortUiLabel,
  NO_FILTERS,
  type ActionFilters,
  type CreatedFilter,
  type DueFilter,
} from '@/lib/actionSort';
import { MIN_TOUCH_TARGET } from '@/lib/accessibility';
import { brand, fonts, radii, spacing } from '@/lib/theme';

const DUE_OPTIONS: DueFilter[] = ['any', 'overdue', 'next7', 'has_date', 'no_date'];
const CREATED_OPTIONS: CreatedFilter[] = ['any', 'last7', 'last30', 'older'];

interface ActionFilterSheetProps {
  visible: boolean;
  filters: ActionFilters;
  onChange: (next: ActionFilters) => void;
  onClose: () => void;
  locale?: ActionLocale;
  /** How many steps the current filters match, shown on the close button. */
  matchCount: number;
}

/**
 * The Action Plan's filter sheet.
 *
 * @param visible - whether the sheet is open
 * @param filters - the filters currently applied to the list
 * @param onChange - called with the next filter set on every tap
 * @param onClose - dismiss the sheet
 * @param locale - en (default), es or vi
 * @param matchCount - how many steps the current filters match
 */
export default function ActionFilterSheet({
  visible,
  filters,
  onChange,
  onClose,
  locale = 'en',
  matchCount,
}: ActionFilterSheetProps) {
  // Render nothing at all when closed. `Modal` already hides its children, but
  // the list's tests query the whole document for text like /Added/ and
  // "Priority", and a sheet that leaves strings in the tree makes every one of
  // those queries ambiguous.
  if (!visible) return null;

  const togglePriority = (p: ActionPriority) => {
    const has = filters.priorities.includes(p);
    onChange({
      ...filters,
      priorities: has ? filters.priorities.filter((x) => x !== p) : [...filters.priorities, p],
    });
  };

  const count = activeFilterCount(filters);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{sortUiLabel('filters', locale)}</Text>
            <TouchableOpacity
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={closeLabel(locale)}
              style={styles.closeHit}
            >
              <Text style={styles.closeX}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>{metaHeading('priority', locale)}</Text>
            <View style={styles.chipRow}>
              {PRIORITY_ORDER.map((p) => {
                const on = filters.priorities.includes(p);
                const meta = PRIORITY_META[p];
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.chip, on && { backgroundColor: meta.bg, borderColor: meta.color }]}
                    onPress={() => togglePriority(p)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    aria-pressed={on}
                    accessibilityLabel={`${sortUiLabel('filters', locale)}: ${priorityLabel(p, locale)}`}
                  >
                    <Text style={[styles.chipText, on && { color: meta.color, fontWeight: fonts.weights.bold }]}>
                      {priorityLabel(p, locale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{dueHeading(locale)}</Text>
            <View style={styles.chipRow}>
              {DUE_OPTIONS.map((d) => {
                const on = filters.due === d;
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => onChange({ ...filters, due: d })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    aria-pressed={on}
                    accessibilityLabel={`${dueHeading(locale)}: ${dueFilterLabel(d, locale)}`}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {dueFilterLabel(d, locale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.label}>{sortUiLabel('dateAdded', locale)}</Text>
            <View style={styles.chipRow}>
              {CREATED_OPTIONS.map((c) => {
                const on = filters.created === c;
                return (
                  <TouchableOpacity
                    key={c}
                    style={[styles.chip, on && styles.chipOn]}
                    onPress={() => onChange({ ...filters, created: c })}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    aria-pressed={on}
                    accessibilityLabel={`${sortUiLabel('dateAdded', locale)}: ${createdFilterLabel(c, locale)}`}
                  >
                    <Text style={[styles.chipText, on && styles.chipTextOn]}>
                      {createdFilterLabel(c, locale)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>

          <View style={styles.footer}>
            {count > 0 && (
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={() => onChange({ ...NO_FILTERS, priorities: [] })}
                accessibilityRole="button"
                accessibilityLabel={sortUiLabel('clear', locale)}
              >
                <Text style={styles.clearText}>{sortUiLabel('clear', locale)}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={showLabel(locale, matchCount)}
            >
              <Text style={styles.doneText}>{showLabel(locale, matchCount)}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function dueHeading(locale: ActionLocale): string {
  if (locale === 'es') return 'Fecha límite';
  if (locale === 'vi') return 'Hạn chót';
  return 'Deadline';
}

function closeLabel(locale: ActionLocale): string {
  if (locale === 'es') return 'Cerrar filtros';
  if (locale === 'vi') return 'Đóng bộ lọc';
  return 'Close filters';
}

function showLabel(locale: ActionLocale, n: number): string {
  if (locale === 'es') return n === 1 ? 'Ver 1 paso' : `Ver ${n} pasos`;
  if (locale === 'vi') return `Xem ${n} bước`;
  return n === 1 ? 'Show 1 step' : `Show ${n} steps`;
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: brand.panel,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: brand.ink,
  },
  closeHit: {
    minWidth: MIN_TOUCH_TARGET,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  closeX: {
    fontSize: fonts.sizes.lg,
    color: brand.inkFaint,
  },
  label: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.bold,
    color: brand.inkSoft,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
    backgroundColor: brand.paper,
  },
  chipOn: {
    backgroundColor: brand.pineTint,
    borderColor: brand.pine,
  },
  chipText: {
    fontSize: fonts.sizes.sm,
    color: brand.inkSoft,
    fontWeight: fonts.weights.medium,
  },
  chipTextOn: {
    color: brand.pine,
    fontWeight: fonts.weights.bold,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  clearBtn: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: brand.border,
  },
  clearText: {
    fontSize: fonts.sizes.md,
    color: brand.inkSoft,
    fontWeight: fonts.weights.semibold,
  },
  doneBtn: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: brand.pine,
  },
  doneText: {
    fontSize: fonts.sizes.md,
    color: '#FFFFFF',
    fontWeight: fonts.weights.bold,
  },
});
