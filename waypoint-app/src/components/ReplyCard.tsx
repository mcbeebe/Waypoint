/**
 * "They replied" — Home card for an unanswered agency reply (owner
 * decision #2, Aug 27). The most time-sensitive thing on Home: an agency
 * answered and the ball is in the family's court. Disappears on its own
 * once a reply goes out on the thread.
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { UnansweredReply } from '@/lib/replyInbox';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

interface ReplyCardProps {
  unanswered: UnansweredReply;
  onDraft: () => void;
  onLater?: () => void;
}

export default function ReplyCard({ unanswered, onDraft, onLater }: ReplyCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.eyebrow}>✉️ REPLY RECEIVED</Text>
      <Text style={styles.title}>{unanswered.senderName} replied</Text>
      {!!unanswered.snippet && (
        <Text style={styles.snippet} numberOfLines={3}>
          “{unanswered.snippet}…”
        </Text>
      )}
      <Pressable
        style={({ pressed }) => [styles.cta, pressed && styles.dim]}
        onPress={onDraft}
        accessibilityRole="button"
        accessibilityLabel={`Draft your response to ${unanswered.senderName}`}
      >
        <Text style={styles.ctaText}>✨ Draft your response →</Text>
      </Pressable>
      {onLater && (
        <Pressable
          style={({ pressed }) => [styles.later, pressed && styles.dim]}
          onPress={onLater}
          accessibilityRole="button"
          accessibilityLabel="Remind me later"
        >
          <Text style={styles.laterText}>Remind me later</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: semantic.info,
    borderRadius: radii.lg,
    padding: spacing.base,
    marginBottom: spacing.base,
    gap: spacing.sm,
  },
  eyebrow: {
    fontSize: fonts.sizes.xs,
    fontWeight: fonts.weights.bold,
    letterSpacing: 1,
    color: semantic.info,
  },
  title: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.extrabold, color: colors.navy },
  snippet: { fontSize: fonts.sizes.md, color: colors.mid, lineHeight: 20, fontStyle: 'italic' },
  cta: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontSize: fonts.sizes.base, fontWeight: fonts.weights.bold },
  later: { minHeight: 28, justifyContent: 'center', alignSelf: 'flex-start' },
  laterText: {
    color: colors.mid,
    fontSize: fonts.sizes.sm,
    fontWeight: fonts.weights.semibold,
    textDecorationLine: 'underline',
  },
  dim: { opacity: 0.6 },
});
