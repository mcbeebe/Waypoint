/**
 * Brandmark — the Waypoint marker (initiative 006).
 *
 * A warm location marker: an ink teardrop pin with a pine-teal center. It
 * replaces the stock `Ionicons name="compass"` as the app's mark. "Waypoint"
 * means a marked point on a route you're already walking — the marker says
 * "you're on the path," where a compass subtly implied "you're lost" (the
 * audience critique that reshaped the brand).
 *
 * Drawn with Views, not SVG, on purpose: the app carries no vector runtime
 * (`react-native-svg`), and the pin is a rounded square rotated 45° — crisp at
 * every UI size on native AND web, and it renders in the jsdom ui suite with
 * no native module to stub. The proportions were tuned against a rendered
 * screenshot (see the PR), not guessed.
 *
 * Decorative by default (`accessible={false}`): a header pairs it with the
 * "Waypoint" wordmark, so the mark itself must not double-announce.
 */
import React from 'react';
import { View } from 'react-native';
import { brand } from '@/lib/theme';

/** The pin fill for a tone — `ink` on a light ground, white on a dark one. */
export function pinFill(tone: 'ink' | 'light'): string {
  return tone === 'light' ? brand.panel : brand.ink;
}

interface BrandmarkProps {
  /** Bounding box in px — roughly the pin's visual height. Default 28. */
  size?: number;
  /** Pin fill: `ink` on a light ground, `light` (white) on a dark one. */
  tone?: 'ink' | 'light';
  /** Screen-reader label. Omit to keep the mark decorative (the default). */
  label?: string;
}

export function Brandmark({ size = 28, tone = 'ink', label }: BrandmarkProps) {
  const pin = size * 0.645;
  const pinRadius = pin / 2;
  const dot = size * 0.26;
  const decorative = label === undefined;

  return (
    <View
      testID="brandmark"
      style={{ width: size, height: size }}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <View
        testID="brandmark-pin"
        style={{
          position: 'absolute',
          width: pin,
          height: pin,
          left: (size - pin) / 2,
          top: size * 0.06,
          backgroundColor: pinFill(tone),
          borderTopLeftRadius: pinRadius,
          borderTopRightRadius: pinRadius,
          borderBottomLeftRadius: pinRadius,
          borderBottomRightRadius: Math.max(2, size * 0.02), // the point
          transform: [{ rotate: '45deg' }],
        }}
      />
      <View
        testID="brandmark-dot"
        style={{
          position: 'absolute',
          width: dot,
          height: dot,
          left: (size - dot) / 2,
          top: size * 0.25,
          borderRadius: dot / 2,
          backgroundColor: brand.pine,
        }}
      />
    </View>
  );
}

export default Brandmark;
