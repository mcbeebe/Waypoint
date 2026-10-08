/**
 * Home's "New reply" strip (Roadmap/mockups/reply-alert, option A).
 *
 * Sits directly under the One Thing card and announces replies the family has
 * not opened, without changing what Home leads with. One tap opens the reply
 * in the paper trail; opening it there clears the strip. The model — copy,
 * count, destination — is built by lib/replyStrip.ts.
 */
import React from 'react';
import { Pressable, View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ReplyStripModel } from '@/lib/replyStrip';
import { useTextScale } from '@/lib/textSize';
import { brand, fonts, radii, spacing } from '@/lib/theme';

interface ReplyStripProps {
  model: ReplyStripModel;
  onOpen: (model: ReplyStripModel) => void;
}

export default function ReplyStrip({ model, onOpen }: ReplyStripProps) {
  const { scale } = useTextScale();
  return (
    <Pressable
      style={({ pressed }) => [styles.strip, pressed && styles.pressed]}
      onPress={() => onOpen(model)}
      accessibilityRole="button"
      accessibilityLabel={model.accessibilityLabel}
      testID="reply-strip"
    >
      <View style={styles.icon}>
        <Ionicons name="mail-outline" size={20} color={brand.pine} />
        <View style={styles.dot} />
      </View>
      <View style={styles.body}>
        <Text style={[styles.kicker, { fontSize: Math.round(10.5 * scale) }]}>{model.kicker}</Text>
        <Text style={[styles.title, { fontSize: Math.round(15 * scale) }]} numberOfLines={2}>
          {model.title}
        </Text>
        <Text style={[styles.detail, { fontSize: Math.round(12.5 * scale) }]} numberOfLines={1}>
          {model.detail}
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={[styles.ctaText, { fontSize: Math.round(14 * scale) }]}>{model.cta}</Text>
        <Ionicons name="chevron-forward" size={16} color={brand.pine} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md + 2,
    minHeight: 64,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: brand.pine,
    backgroundColor: brand.pineTint,
  },
  pressed: { backgroundColor: brand.pineTintPressed },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: brand.panel,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    position: 'absolute',
    top: 1,
    right: 1,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: brand.urgent,
    borderWidth: 2,
    borderColor: brand.pineTint,
  },
  body: { flex: 1, minWidth: 0 },
  kicker: { color: brand.pine, fontWeight: fonts.weights.extrabold, letterSpacing: 0.9 },
  title: { color: brand.ink, fontWeight: fonts.weights.bold, marginTop: 1 },
  detail: { color: brand.inkSoft, marginTop: 1 },
  cta: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ctaText: { color: brand.pine, fontWeight: fonts.weights.bold },
});
