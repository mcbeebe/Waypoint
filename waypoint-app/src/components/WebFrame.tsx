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
// Tablet band (600–899) keeps the centered phone column.
const DESKTOP_BREAKPOINT = 900;
// Width of the centered app column on tablet (matches common phone width).
const FRAME_WIDTH = 440;
// Max width of the desktop app window — reads as a web app, not a phone demo.
const DESKTOP_MAX_WIDTH = 1200;

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

  // Desktop: a full-height app window with a left nav rail (see MainTabs) —
  // adaptive website, not a phone preview
  if (width >= DESKTOP_BREAKPOINT) {
    return (
      <View style={styles.desktopBackdrop}>
        <View style={styles.desktopFrame}>{children}</View>
      </View>
    );
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.frame}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopBackdrop: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.navy,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  desktopFrame: {
    width: '100%',
    maxWidth: DESKTOP_MAX_WIDTH,
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    ...Platform.select({
      web: {
        boxShadow: '0 16px 48px rgba(0,0,0,0.3)',
      },
      default: {},
    }),
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
