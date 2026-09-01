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

/**
 * The pin fill for a tone — `ink` on a light ground, true white on a dark one.
 * `light` is a literal `#FFFFFF`, not the `panel` surface token: the mark's
 * white is the logo's white, independent of whatever a card surface becomes.
 */
export function pinFill(tone: 'ink' | 'light'): string {
  return tone === 'light' ? '#FFFFFF' : brand.ink;
}

interface BrandmarkProps {
  /** Bounding box in px — roughly the pin's visual height. Default 28. */
  size?: number;
  /** Pin fill: `ink` on a light ground, `light` (white) on a dark one. */
  tone?: 'ink' | 'light';
  /**
   * Draw the full logo mark: the pin PLUS the sage route line and next-point
   * dot trailing from its base ("a marked point on a route you're already
   * walking — progress, not disorientation"). Off by default — the small
   * inline header marks stay the compact pin, where a route line would be
   * illegible; the full mark is for logo moments (a hero, a splash). When on,
   * the mark is wider than tall (container width ≈ size × 1.62).
   */
  route?: boolean;
  /** Screen-reader label. Omit to keep the mark decorative (the default). */
  label?: string;
}

export function Brandmark({ size = 28, tone = 'ink', route = false, label }: BrandmarkProps) {
  const pin = size * 0.645;
  const pinRadius = pin / 2;
  const dot = size * 0.26;
  const decorative = label === undefined;

  // The sage route: a short horizontal line from the pin's base to a filled
  // next-point dot on the right. Only when `route` — it widens the box.
  const routeExtra = route ? size * 0.62 : 0;
  const width = size + routeExtra;
  const routeDot = size * 0.24;
  const lineH = size * 0.09;
  const lineY = size * 0.75; // vertical center of the route, near the pin's tip
  const routeStartX = size * 0.5; // emerges from under the pin
  const routeDotCx = width - routeDot / 2;

  return (
    <View
      testID="brandmark"
      style={{ width, height: size }}
      accessible={!decorative}
      accessibilityRole={decorative ? undefined : 'image'}
      accessibilityLabel={label}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      {route && (
        <>
          <View
            testID="brandmark-route-line"
            style={{
              position: 'absolute',
              left: routeStartX,
              top: lineY - lineH / 2,
              width: routeDotCx - routeStartX,
              height: lineH,
              borderRadius: lineH / 2,
              backgroundColor: brand.sage,
            }}
          />
          <View
            testID="brandmark-route-dot"
            style={{
              position: 'absolute',
              left: routeDotCx - routeDot / 2,
              top: lineY - routeDot / 2,
              width: routeDot,
              height: routeDot,
              borderRadius: routeDot / 2,
              backgroundColor: brand.sage,
            }}
          />
        </>
      )}
      <View
        testID="brandmark-pin"
        style={{
          position: 'absolute',
          width: pin,
          height: pin,
          left: (size - pin) / 2,
          // 0.135 (not 0.06) so the whole rotated pin — top lobe AND tip —
          // sits INSIDE the size×size box, instead of relying on
          // overflow:visible (unreliable for out-of-bounds children on
          // Android). Verified against a rendered screenshot.
          top: size * 0.135,
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
          top: size * 0.3275, // centered on the (lowered) pin head
          borderRadius: dot / 2,
          backgroundColor: brand.pine,
        }}
      />
    </View>
  );
}

export default Brandmark;
