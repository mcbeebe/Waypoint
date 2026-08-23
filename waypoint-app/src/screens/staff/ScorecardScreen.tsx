/**
 * Owner scorecard (PRD W-D: D4) — the four Phase-1 kill-criteria numbers
 * as first-class metrics with their targets shown, plus the funnel. The
 * go/no-go memo in W3 reads these same figures.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Platform, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useOwnerMetrics, fetchEvidenceInputs } from '@/hooks/useBilling';
import { buildEvidenceReport, renderEvidenceHtml } from '@/lib/evidenceReport';
import { FUNNEL_GATE, HOURS_PER_FAMILY_MODEL } from '@/lib/evidenceTargets';
import { formatCents } from '@/lib/spendingPlan';
import { useToast } from '@/components/Toast';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

const FUNNEL_ORDER: Array<[string, string]> = [
  ['registered', 'Registered'],
  ['eligibility_result_viewed', 'Saw their result'],
  ['funded_offer_viewed', 'Saw the offer'],
  ['booking_started', 'Started booking'],
  ['booking_completed', 'Booked'],
  ['became_client', 'Became a client'],
];

// Gates live in evidenceTargets so this screen and the exported readout
// can never disagree on what "pass" means.
const HOURS_PER_FAMILY_TARGET = HOURS_PER_FAMILY_MODEL;
const CONVERSION_TARGET = FUNNEL_GATE;

export default function ScorecardScreen() {
  const navigation = useNavigation();
  const { metrics, loading } = useOwnerMetrics();
  const { showToast } = useToast();
  const [exporting, setExporting] = useState(false);

  /**
   * W3: the go/no-go memo's data section, generated from live rows. Web
   * opens the printable document in a new tab; native shares the summary.
   */
  const exportReadout = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const report = buildEvidenceReport(await fetchEvidenceInputs());
      if (Platform.OS === 'web') {
        const blob = new Blob([renderEvidenceHtml(report)], { type: 'text/html' });
        window.open(URL.createObjectURL(blob), '_blank');
      } else {
        await Share.share({
          message:
            `Waypoint evidence readout ${report.generatedOn}\n` +
            `Pipeline: ${formatCents(report.pipelineValueCents)} · Invoiced: ${formatCents(report.invoicedCents)} (paid ${formatCents(report.paidCents)}, n=${report.paidInvoiceCount})\n` +
            `Hours/family: ${report.hoursPerFamily ?? '—'}h (n=${report.familiesWithTime}, model ≤${HOURS_PER_FAMILY_MODEL}h)\n` +
            `Free→booked: ${report.conversion === null ? '—' : `${Math.round(report.conversion * 1000) / 10}%`} (${report.booked}/${report.registered}, gate ≥${FUNNEL_GATE * 100}%)\n` +
            `Verdicts — funnel: ${report.funnelVerdict ?? 'insufficient data'} · hours: ${report.hoursVerdict ?? 'insufficient data'} · paid invoice: ${report.paidInvoiceVerdict}`,
        });
      }
    } catch {
      showToast("Couldn't build the readout — please try again.", 'error');
    } finally {
      setExporting(false);
    }
  };

  const conversionPct =
    metrics?.conversion !== null && metrics?.conversion !== undefined
      ? Math.round(metrics.conversion * 1000) / 10
      : null;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>← Caseload</Text>
        </Pressable>
        <Text style={styles.title}>Scorecard</Text>
        <Text style={styles.subtitle}>
          The four numbers the Phase-1 go/no-go decision reads. Targets shown
          against actuals — no vanity framing.
        </Text>
        <Pressable
          style={styles.exportButton}
          onPress={exportReadout}
          accessibilityRole="button"
          accessibilityLabel="Export the evidence readout"
        >
          <Text style={styles.exportButtonText}>
            {exporting ? 'Building…' : '📄 Export evidence readout'}
          </Text>
        </Pressable>

        {loading || !metrics ? (
          <Text style={styles.loadingText}>Loading…</Text>
        ) : (
          <>
            <View style={styles.grid}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Pipeline value</Text>
                <Text style={styles.metricValue}>{formatCents(metrics.pipelineValueCents)}</Text>
                <Text style={styles.metricMeta}>agreed prices, open cases</Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Invoiced vs paid</Text>
                <Text style={styles.metricValue}>
                  {formatCents(metrics.invoicedCents)}
                </Text>
                <Text style={styles.metricMeta}>
                  {formatCents(metrics.paidCents)} collected
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Hours / family</Text>
                <Text
                  style={[
                    styles.metricValue,
                    metrics.hoursPerFamily > HOURS_PER_FAMILY_TARGET && styles.metricBad,
                  ]}
                >
                  {metrics.familiesWithTime ? `${metrics.hoursPerFamily}h` : '—'}
                </Text>
                <Text style={styles.metricMeta}>
                  model ≤{HOURS_PER_FAMILY_TARGET}h · n={metrics.familiesWithTime}
                </Text>
              </View>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Free → booked</Text>
                <Text
                  style={[
                    styles.metricValue,
                    conversionPct !== null &&
                      conversionPct < CONVERSION_TARGET * 100 &&
                      styles.metricBad,
                  ]}
                >
                  {conversionPct !== null ? `${conversionPct}%` : '—'}
                </Text>
                <Text style={styles.metricMeta}>gate ≥{CONVERSION_TARGET * 100}%</Text>
              </View>
            </View>

            <Text style={styles.section}>Funnel (distinct families)</Text>
            <View style={styles.card}>
              {FUNNEL_ORDER.map(([key, label]) => {
                const count = metrics.funnel[key] ?? 0;
                const base = metrics.funnel.registered ?? 0;
                const pct = base > 0 ? Math.round((count / base) * 100) : 0;
                return (
                  <View key={key} style={styles.funnelRow}>
                    <Text style={styles.funnelLabel}>{label}</Text>
                    <View style={styles.funnelBarTrack}>
                      <View style={[styles.funnelBarFill, { width: `${Math.min(100, pct)}%` }]} />
                    </View>
                    <Text style={styles.funnelCount}>{count}</Text>
                  </View>
                );
              })}
              {(metrics.funnel.registered ?? 0) === 0 && (
                <Text style={styles.metricMeta}>
                  No funnel events yet — numbers appear as families register.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.mid, lineHeight: 18 },
  loadingText: { marginTop: spacing.lg, color: colors.mid },
  exportButton: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.teal,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exportButtonText: { color: colors.teal, fontWeight: fonts.weights.bold },
  grid: {
    marginTop: spacing.base,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metric: {
    width: '48%',
    flexGrow: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  metricLabel: { fontSize: fonts.sizes.xs, fontWeight: fonts.weights.bold, letterSpacing: 0.5, color: colors.mid, textTransform: 'uppercase' },
  metricValue: { marginTop: spacing.xs, fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  metricBad: { color: semantic.danger },
  metricMeta: { marginTop: 2, fontSize: fonts.sizes.xs, color: colors.mid },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  card: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: spacing.md,
  },
  funnelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  funnelLabel: { width: 120, fontSize: fonts.sizes.sm, color: colors.dark },
  funnelBarTrack: {
    flex: 1,
    height: 10,
    borderRadius: radii.full,
    backgroundColor: colors.light,
    overflow: 'hidden',
  },
  funnelBarFill: { height: 10, backgroundColor: colors.teal },
  funnelCount: { width: 36, textAlign: 'right', fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.sm },
});
