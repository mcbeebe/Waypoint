/**
 * Swipe a row sideways to reveal quick actions.
 *
 * Built on PanResponder + Animated rather than a gesture library: the app
 * has no GestureHandlerRootView, and this way the same code works on iOS,
 * Android, and the web build (mouse drag) with nothing extra to configure.
 *
 * Vertical intent always wins — a swipe only engages once horizontal
 * movement clearly outpaces vertical, so list scrolling still feels normal.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  Text,
  Animated,
  PanResponder,
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radii } from '@/lib/theme';

export interface SwipeAction {
  label: string;
  /** Single glyph shown above the label */
  icon: string;
  color: string;
  onPress: () => void;
  /**
   * What a screen reader says, when the visible label is too terse to stand
   * alone. The buttons read "Start", "Done", "Cancel" — which name an action
   * but not the step it applies to, and in a list of eight rows that is eight
   * identical "Done" buttons. Pass the step's title here.
   */
  accessibilityLabel?: string;
}

interface SwipeableRowProps {
  actions: SwipeAction[];
  children: React.ReactNode;
  /** Set false to pin the row shut (e.g. a locked action) */
  enabled?: boolean;
  /**
   * Outer spacing. Keep row margins HERE rather than on the child: the
   * action buttons stretch to this wrapper's height, so a margin on the
   * child would leave them taller than the card they belong to.
   */
  style?: StyleProp<ViewStyle>;
}

const ACTION_WIDTH = 84;
/** Horizontal travel before we claim the gesture from the scroll view */
const CLAIM_THRESHOLD = 12;

export default function SwipeableRow({ actions, children, enabled = true, style }: SwipeableRowProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const maxReveal = ACTION_WIDTH * actions.length;

  const settle = useCallback(
    (toOpen: boolean) => {
      openRef.current = toOpen;
      Animated.spring(translateX, {
        toValue: toOpen ? -maxReveal : 0,
        useNativeDriver: true,
        bounciness: 0,
        speed: 18,
      }).start();
    },
    [maxReveal, translateX]
  );

  const close = useCallback(() => settle(false), [settle]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        if (!enabled || actions.length === 0) return false;
        return Math.abs(gesture.dx) > CLAIM_THRESHOLD && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5;
      },
      onPanResponderMove: (_evt, gesture) => {
        const base = openRef.current ? -maxReveal : 0;
        const next = Math.min(0, Math.max(-maxReveal, base + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const base = openRef.current ? -maxReveal : 0;
        const finalX = base + gesture.dx;
        // Past halfway, or a decisive flick, decides the direction
        if (gesture.vx < -0.5) return settle(true);
        if (gesture.vx > 0.5) return settle(false);
        settle(finalX < -maxReveal / 2);
      },
      onPanResponderTerminate: () => settle(openRef.current),
    })
  ).current;

  if (actions.length === 0) return <View style={style}>{children}</View>;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Action buttons sit underneath, revealed as the row slides away */}
      <View style={[styles.actionsLayer, { width: maxReveal }]} pointerEvents="box-none">
        {actions.map((a) => (
          <TouchableOpacity
            key={a.label}
            style={[styles.actionButton, { backgroundColor: a.color }]}
            onPress={() => {
              close();
              a.onPress();
            }}
            accessibilityRole="button"
            accessibilityLabel={a.accessibilityLabel ?? a.label}
          >
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLabel} numberOfLines={1}>
              {a.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: radii.md,
  },
  actionsLayer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
  },
  actionButton: {
    width: ACTION_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionIcon: { fontSize: 18, color: colors.white },
  actionLabel: {
    fontSize: fonts.sizes.xs,
    color: colors.white,
    fontWeight: fonts.weights.semibold as '600',
  },
});
