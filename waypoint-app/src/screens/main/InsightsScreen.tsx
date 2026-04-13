/**
 * Insights screen — Personalized community insights and trending strategies
 * Phase 8: Sprint S62
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { getInsightsForRC, getTrendingStrategies, type AggregateInsight } from '@/lib/analytics';
import { colors, fonts, spacing, radii } from '@/lib/theme';

export default function InsightsScreen() {
  const { family } = useFamily();
  const rc = family?.regional_center;

  const [rcInsights, setRcInsights] = useState<AggregateInsight[]>([]);
  const [trending, setTrending] = useState<AggregateInsight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInsights = async () => {
    setLoading(true);
    const [rcData, trendData] = await Promise.all([
      rc ? getInsightsForRC(rc) : Promise.resolve([]),
      getTrendingStrategies(),
    ]);
    setRcInsights(rcData);
    setTrending(trendData);
    setLoading(false);
  };

  useEffect(() => { fetchInsights(); }, [rc]);

  const successInsights = rcInsights.filter((i) => i.insightType === 'rc_success_rate');
  const actionInsights = rcInsights.filter((i) => i.insightType === 'action_type_success');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Community Insights</Text>
        <Text style={styles.headerSubtitle}>
          {rc ? `Personalized for ${rc}` : 'Connect your Regional Center for personalized insights'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchInsights} />}
      >
        {loading ? (
          <ActivityIndicator style={{ padding: spacing.xl }} />
        ) : (
          <>
            {/* RC Success Rates */}
            {successInsights.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>What's Working at {rc}</Text>
                {successInsights.map((insight, i) => (
                  <View key={i} style={styles.insightCard}>
                    <View style={styles.insightHeader}>
                      <Text style={styles.insightMetric}>{Math.round(insight.metricValue)}%</Text>
                      <Text style={styles.insightLabel}>success rate</Text>
                    </View>
                    <Text style={styles.insightDimension}>{insight.dimension}</Text>
                    <Text style={styles.insightSample}>
                      Based on {insight.sampleSize} families · Updated {new Date(insight.periodEnd).toLocaleDateString()}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Action Success by Type */}
            {actionInsights.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Success by Action Type</Text>
                {actionInsights.map((insight, i) => (
                  <View key={i} style={styles.barRow}>
                    <Text style={styles.barLabel}>{formatDimension(insight.dimension)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${Math.min(insight.metricValue, 100)}%` }]} />
                    </View>
                    <Text style={styles.barValue}>{Math.round(insight.metricValue)}%</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Trending Strategies */}
            {trending.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Trending Strategies</Text>
                {trending.map((insight, i) => (
                  <View key={i} style={styles.trendCard}>
                    <Text style={styles.trendRank}>#{i + 1}</Text>
                    <View style={styles.trendInfo}>
                      <Text style={styles.trendTitle}>{formatDimension(insight.dimension)}</Text>
                      <Text style={styles.trendMeta}>
                        {insight.sampleSize} families · {Math.round(insight.metricValue)}% success
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Empty state */}
            {successInsights.length === 0 && trending.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📊</Text>
                <Text style={styles.emptyTitle}>Insights coming soon</Text>
                <Text style={styles.emptySubtitle}>
                  As more families use Waypoint, we'll surface anonymized insights about what strategies work best at your Regional Center.
                </Text>
              </View>
            )}

            {/* Privacy note */}
            <View style={styles.privacyNote}>
              <Text style={styles.privacyText}>
                All insights are anonymized and aggregated. No individual family data is ever shared. Minimum 10 families required for any insight to be displayed.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDimension(dim: string): string {
  return dim.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  section: { marginBottom: spacing.xl },
  sectionTitle: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  insightCard: {
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md, marginBottom: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  insightHeader: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  insightMetric: { fontSize: 28, fontWeight: '700', color: '#059669' },
  insightLabel: { fontSize: fonts.sizes.sm, color: colors.mid },
  insightDimension: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.navy, marginTop: 4 },
  insightSample: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 4 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  barLabel: { width: 100, fontSize: fonts.sizes.xs, color: colors.dark },
  barTrack: { flex: 1, height: 8, backgroundColor: colors.light, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: colors.teal, borderRadius: 4 },
  barValue: { width: 36, fontSize: fonts.sizes.xs, color: colors.navy, fontWeight: fonts.weights.medium as '500', textAlign: 'right' },
  trendCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radii.md,
    padding: spacing.md, marginBottom: 6, gap: spacing.md,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  trendRank: { fontSize: fonts.sizes.lg, fontWeight: '700', color: colors.teal, width: 32 },
  trendInfo: { flex: 1 },
  trendTitle: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.navy },
  trendMeta: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, paddingHorizontal: spacing.lg },
  privacyNote: { backgroundColor: '#EFF6FF', borderRadius: radii.md, padding: spacing.md, marginTop: spacing.lg },
  privacyText: { fontSize: fonts.sizes.xs, color: '#1E40AF', lineHeight: 16 },
});
