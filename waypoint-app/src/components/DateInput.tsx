/**
 * Cross-platform date input. React Native's DateTimePicker has no web
 * implementation, so on web this renders the browser's built-in
 * <input type="date"> (or datetime-local) — a real picker instead of
 * hand-typing YYYY-MM-DD. Native falls back to a plain TextInput.
 */

import React from 'react';
import { Platform, StyleProp, TextInput, TextStyle } from 'react-native';
import { colors, fonts, radii, spacing } from '@/lib/theme';

interface DateInputProps {
  /** 'YYYY-MM-DD' for date mode, 'YYYY-MM-DD HH:MM' for datetime mode. */
  value: string;
  onChange: (v: string) => void;
  mode?: 'date' | 'datetime';
  accessibilityLabel?: string;
  /** Applied to the native TextInput fallback only. */
  style?: StyleProp<TextStyle>;
}

export default function DateInput({
  value,
  onChange,
  mode = 'date',
  accessibilityLabel,
  style,
}: DateInputProps) {
  if (Platform.OS === 'web') {
    const isDateTime = mode === 'datetime';
    // datetime-local uses 'YYYY-MM-DDTHH:MM'; the app stores a space.
    return React.createElement('input', {
      type: isDateTime ? 'datetime-local' : 'date',
      'aria-label': accessibilityLabel,
      value: isDateTime ? value.replace(' ', 'T') : value,
      onChange: (e: { target: { value: string } }) => {
        const v = e.target.value;
        onChange(isDateTime ? v.replace('T', ' ') : v);
      },
      style: {
        backgroundColor: colors.light,
        border: `1px solid ${colors.border}`,
        borderRadius: radii.md,
        padding: `${spacing.md}px`,
        fontSize: fonts.sizes.base,
        color: colors.dark,
        fontFamily: 'inherit',
        width: '100%',
        boxSizing: 'border-box',
        marginBottom: spacing.sm,
      },
    });
  }

  return (
    <TextInput
      style={style}
      value={value}
      onChangeText={onChange}
      placeholder={mode === 'datetime' ? 'YYYY-MM-DD HH:MM' : 'YYYY-MM-DD'}
      placeholderTextColor={colors.mid}
      autoCapitalize="none"
      accessibilityLabel={accessibilityLabel}
    />
  );
}
