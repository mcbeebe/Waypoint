/**
 * Caseload — who needs attention today and why (PRD W-C: C1).
 *
 * Every row is ranked by the explainable score in caseloadRanking and
 * states its top reason inline; "How is this ranked?" shows the exact
 * factors and weights. RLS (036) scopes the list to the consented
 * caseload — revocation empties it immediately.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCaseload } from '@/hooks/useFacilitation';
import { RANKING_EXPLANATION } from '@/lib/caseloadRanking';
import { SDP_PIPELINE } from '@/lib/sdpStages';
import type { StaffStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'StaffHome'>;

function stageLabel(stage: string): string {
  return SDP_PIPELINE.find((s) => s.stage === stage)?.label ?? 'Intake';
}

export default function StaffHomeScreen() {
  const navigation = useNavigation<Nav>();
  const { rows, loading, error, refetch } = useCaseload();
  const [showExplanation, setShowExplanation] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>My caseload</Text>
        <View style={styles.headerRow}>
          <Text style={styles.subtitle}>
            {rows.length} {rows.length === 1 ? 'family' : 'families'}
          </Text>
          <Pressable onPress={() => setShowExplanation((v) => !v)} hitSlop={8}>
            <Text style={styles.explainLink}>How is this ranked?</Text>
          </Pressable>
        </View>
        {showExplanation && (
          <View style={styles.explainBox}>
            <Text style={styles.explainText}>{RANKING_EXPLANATION}</Text>
          </View>
        )}
      </View>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={refetch} style={styles.retryButton}>
            <Text style={styles.retryText}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.caseId}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            loading ? null : (
              <View style={styles.empty}>
                <Text style={styles.emptyTitle}>No families assigned yet</Text>
                <Text style={styles.emptyBody}>
                  Families appear here once they consent to working with you.
                  Assignments are created by an admin and can be revoked by the
                  family at any time.
                </Text>
              </View>
            )
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.card, item.score >= 60 && styles.cardUrgent]}
              onPress={() =>
                navigation.navigate('CaseDetail', {
                  familyId: item.familyId,
                  caseId: item.hasCase ? item.caseId : undefined,
                })
              }
            >
              <View style={styles.cardHead}>
                <Text style={styles.cardName}>{item.familyName}</Text>
                <View
                  style={[
                    styles.scoreBadge,
                    item.score >= 60
                      ? styles.scoreHigh
                      : item.score >= 30
                        ? styles.scoreMid
                        : styles.scoreLow,
                  ]}
                >
                  <Text style={styles.scoreText}>{item.score}</Text>
                </View>
              </View>
              <Text style={styles.cardReason}>{item.reasons[0]}</Text>
              <Text style={styles.cardMeta}>
                {item.hasCase ? stageLabel(item.stage) : 'No case yet — tap to start'}
                {item.regionalCenter ? ` · ${item.regionalCenter}` : ''}
              </Text>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  header: {
    paddingHorizontal: spacing.base,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: fonts.sizes['2xl'],
    fontWeight: fonts.weights.extrabold,
    color: colors.navy,
  },
  headerRow: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtitle: { fontSize: fonts.sizes.sm, color: colors.mid },
  explainLink: {
    fontSize: fonts.sizes.sm,
    color: colors.teal,
    fontWeight: fonts.weights.semibold,
  },
  explainBox: {
    marginTop: spacing.sm,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  explainText: { fontSize: fonts.sizes.sm, color: colors.dark, lineHeight: 18 },
  list: { paddingHorizontal: spacing.base, paddingBottom: spacing['2xl'] },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  cardUrgent: { borderColor: semantic.warning, borderWidth: 2 },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardName: {
    flex: 1,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  scoreBadge: {
    minWidth: 36,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  scoreHigh: { backgroundColor: semantic.warningBg },
  scoreMid: { backgroundColor: semantic.infoBg },
  scoreLow: { backgroundColor: colors.light },
  scoreText: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.sm },
  cardReason: {
    marginTop: spacing.sm,
    fontSize: fonts.sizes.md,
    color: colors.dark,
    fontWeight: fonts.weights.semibold,
  },
  cardMeta: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.mid },
  empty: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.xl,
    marginTop: spacing.lg,
  },
  emptyTitle: {
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  emptyBody: { marginTop: spacing.sm, fontSize: fonts.sizes.md, color: colors.mid },
  errorBox: { margin: spacing.base, padding: spacing.base },
  errorText: { color: colors.error, fontSize: fonts.sizes.md },
  retryButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    alignSelf: 'flex-start',
  },
  retryText: { color: colors.white, fontWeight: fonts.weights.bold },
});
