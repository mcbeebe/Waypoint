/**
 * The sensor line (Caseboard graft, owner-approved) — what Waypoint actually
 * checked, and when. A promise to watch the clocks is only believable if the
 * app says when it last looked, so an honest "couldn't check" is marked
 * rather than hidden.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { SensorLine as SensorLineModel } from '@/lib/homeTriage';
import { useTextScale } from '@/lib/textSize';
import { brand, fonts, semantic, spacing } from '@/lib/theme';

interface SensorLineProps {
  sensor: SensorLineModel;
}

export default function SensorLine({ sensor }: SensorLineProps) {
  const { scale } = useTextScale();
  return (
    <View style={styles.row} accessible accessibilityRole="text" accessibilityLabel={sensor.text}>
      <View style={[styles.dot, !sensor.ok && styles.dotWarn]} />
      <Text
        style={[
          styles.text,
          { fontSize: Math.round(11.5 * scale), lineHeight: Math.round(16 * scale) },
          !sensor.ok && styles.textWarn,
        ]}
      >
        {sensor.text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.xs,
    marginBottom: spacing.base,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: semantic.success,
  },
  dotWarn: { backgroundColor: semantic.warning },
  text: {
    flex: 1,
    color: brand.inkFaint,
    fontWeight: fonts.weights.medium,
  },
  textWarn: { color: semantic.warning },
});
