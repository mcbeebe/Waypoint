import React from 'react';
import {
  Pressable,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { brand, colors, fonts, radii } from '../lib/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}

/**
 * The shared button, on the warm brand system (initiative 006): pine fill for
 * the primary action (pineDeep pressed), ink fill for secondary, pine outline
 * for tertiary (pineTint pressed). White text on pine and on ink both clear
 * WCAG AA — the palette is pinned in theme.test.ts.
 */
export default function Button({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      // The label is explicit so the button keeps its name while `loading`
      // swaps the title text for the spinner
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      // Caller `style` sits below the pressed/disabled layers so an override
      // (width, margin, even a custom fill) can never erase press feedback
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        style,
        pressed && styles[`${variant}Pressed`],
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variant === 'outline' ? brand.pine : colors.white}
        />
      ) : (
        <Text style={[styles.text, variant === 'outline' && styles.outlineText]}>
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  primary: {
    backgroundColor: brand.pine,
  },
  primaryPressed: {
    backgroundColor: brand.pineDeep,
  },
  secondary: {
    backgroundColor: brand.ink,
  },
  // No darker step exists for an ink fill, so pressed feedback is opacity
  secondaryPressed: {
    opacity: 0.85,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: brand.pine,
  },
  outlinePressed: {
    backgroundColor: brand.pineTint,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    color: colors.white,
    fontSize: fonts.sizes.md,
    fontWeight: fonts.weights.bold,
  },
  outlineText: {
    color: brand.pine,
  },
});
