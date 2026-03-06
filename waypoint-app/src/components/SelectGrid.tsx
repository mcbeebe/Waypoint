/**
 * Reusable single-select and multi-select button grid
 * Ported from GAS MVP selectOption() pattern
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, fonts, spacing, radii } from '@/lib/theme';

interface SelectOption {
  value: string;
  label: string;
  emoji?: string;
  description?: string;
}

interface SelectGridProps {
  options: SelectOption[];
  selected: string | string[];
  onSelect: (value: string) => void;
  multiSelect?: boolean;
  columns?: number;
}

export default function SelectGrid({
  options,
  selected,
  onSelect,
  multiSelect = false,
  columns = 2,
}: SelectGridProps) {
  const isSelected = (value: string): boolean => {
    if (multiSelect && Array.isArray(selected)) {
      return selected.includes(value);
    }
    return selected === value;
  };

  return (
    <View style={[styles.grid, { flexWrap: 'wrap' }]}>
      {options.map((option) => {
        const active = isSelected(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.option,
              { width: `${Math.floor(100 / columns) - 2}%` as unknown as number },
              active && styles.optionSelected,
            ]}
            onPress={() => onSelect(option.value)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={option.label}
          >
            {option.emoji && <Text style={styles.emoji}>{option.emoji}</Text>}
            <Text style={[styles.label, active && styles.labelSelected]}>
              {option.label}
            </Text>
            {option.description && (
              <Text style={[styles.description, active && styles.descriptionSelected]}>
                {option.description}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  option: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
    minHeight: 56,
  },
  optionSelected: {
    borderColor: colors.teal,
    backgroundColor: '#E6F7F5',
  },
  emoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  label: {
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold as '600',
    color: colors.dark,
    textAlign: 'center',
  },
  labelSelected: {
    color: colors.teal,
  },
  description: {
    fontSize: fonts.sizes.xs,
    color: colors.mid,
    textAlign: 'center',
    marginTop: 2,
  },
  descriptionSelected: {
    color: colors.teal,
  },
});
