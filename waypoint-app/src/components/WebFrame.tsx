/**
 * WebFrame — responsive shell for the web build.
 *
 * On native (iOS/Android) this is a transparent pass-through.
 * On web:
 *   <600px  — phone-sized browser, fill the screen (pass-through).
 *   600–899 — tablet band, centered phone column on a soft backdrop.
 *   ≥900px  — desktop: full-screen web app (no frame). MainTabs renders a
 *             left nav rail and screens fill the viewport edge-to-edge.
 */

import React from 'react';
import { View, Platform, useWindowDimensions, StyleSheet } from 'react-native';
import { colors } from '@/lib/theme';

// Below this width we treat the browser as a phone and fill the screen.
const PHONE_BREAKPOINT = 600;
// Tablet band (600–899) keeps the centered phone column.
const DESKTOP_BREAKPOINT = 900;
// Width of the centered app column on tablet (matches common phone width).
const FRAME_WIDTH = 440;

/** Breakpoint shared with MainTabs (left nav rail on desktop). */
export function useIsDesktopWeb(): boolean {
  const { width } = useWindowDimensions();
  return Platform.OS === 'web' && width >= DESKTOP_BREAKPOINT;
}

export default function WebFrame({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();

  if (Platform.OS !== 'web' || width < PHONE_BREAKPOINT) {
    return <>{children}</>;
  }

  // Desktop: full-screen web app — no frame, no backdrop. The left nav
  // rail (see MainTabs) anchors the layout at the viewport edge.
  if (width >= DESKTOP_BREAKPOINT) {
    return <View style={styles.desktopRoot}>{children}</View>;
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopRoot: {
    flex: 1,
    backgroundColor: colors.white,
  },
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
