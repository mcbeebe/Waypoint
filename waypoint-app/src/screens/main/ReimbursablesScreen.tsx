/**
 * RC Reimbursables (roadmap 1.3) — what Regional Centers can actually fund,
 * with POS billing codes, typical costs, and insider notes. One of the most
 * differentiated pieces of content in the product (ported from GAS MVP).
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RC_REIMBURSABLES } from '@/data/reimbursables';
import { Card, Chip } from '@/components/ui';
import { useTextScale } from '@/lib/textSize';
import { colors, fonts, spacing, semantic } from '@/lib/theme';

export default function ReimbursablesScreen() {
  const { scale } = useTextScale();
  const sz = (n: number) => Math.round(n * scale);

  return (
    <SafeAreaView style={styles.container} edges={[]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.intro, { fontSize: sz(14), lineHeight: sz(21) }]}>
          Services your Regional Center can fund once your child is a client. Ask your Service
          Coordinator about any of these by name — the POS code tells them exactly what you mean.
        </Text>

        {RC_REIMBURSABLES.map(item => (
          <Card key={item.name}>
            <View style={styles.head}>
              <Text style={[styles.name, { fontSize: sz(16) }]}>{item.name}</Text>
              <Chip label={`POS ${item.code}`} tone="info" textSize={sz(11)} />
            </View>
            <Text style={[styles.description, { fontSize: sz(14), lineHeight: sz(21) }]}>
              {item.description}
            </Text>
            <Text style={[styles.cost, { fontSize: sz(13) }]}>💰 {item.cost}</Text>
            <View style={styles.noteBox}>
              <Text style={[styles.note, { fontSize: sz(13), lineHeight: sz(19) }]}>
                💡 {item.note}
              </Text>
            </View>
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  intro: {
    color: colors.mid,
    marginBottom: spacing.md,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: 6,
  },
  name: {
    flex: 1,
    fontWeight: fonts.weights.bold as '700',
    color: colors.navy,
  },
  description: {
    color: colors.dark,
    marginBottom: 6,
  },
  cost: {
    color: semantic.success,
    fontWeight: fonts.weights.semibold as '600',
    marginBottom: 8,
  },
  noteBox: {
    backgroundColor: semantic.warningBg,
    borderRadius: 8,
    padding: spacing.md,
  },
  note: {
    color: colors.dark,
  },
});
