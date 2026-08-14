/**
 * WebFrame — responsive shell for the web build.
 *
 * On native (iOS/Android) this is a transparent pass-through.
 * On web, when the viewport is wider than a phone, it centers the app
 * inside a fixed-width "device" column on a soft backdrop — so the
 * mobile-first screens read as an intentional app rather than a
 * full-bleed stretched layout. On narrow/mobile web it fills the screen.
 */

import React from 'react';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

// Below this width we treat the browser as a phone and fill the screen.
const PHONE_BREAKPOINT = 600;
// Width of the centered app column on desktop (matches common phone width).
const FRAME_WIDTH = 440;

export default function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width < PHONE_BREAKPOINT) {
    return <>{children}</>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.navy,
    padding: 24,
  },
  frame: {
    width: '100%',
    maxWidth: FRAME_WIDTH,
    height: '100%',
    maxHeight: 920,
    backgroundColor: colors.white,
    borderRadius: 28,
    overflow: 'hidden',
    // Web-only shadow (RN shadow props don't apply to the web frame the same way)
    ...Platform.select({
      web: {
        boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
      },
      default: {},
    }),
  },
});
