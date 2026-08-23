/**
 * Billing — the right invoice to the right payer (PRD W-D: D2).
 *
 * Regional Center path: 024 PCP fee (once, on completion) + 099 hours at
 * the org rate, gated on vendorization with the gate stated, never silent.
 * FMS path: the family's agreed annual facilitation price. Aged
 * receivables live on the same screen. Every 099 line traces to a logged
 * service event; the unique constraint in 040 makes double-billing
 * impossible.
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useBilling } from '@/hooks/useBilling';
import { draftRcInvoice, draftFmsInvoice, agedReceivables } from '@/lib/invoicing';
import { formatCents } from '@/lib/spendingPlan';
import { useToast } from '@/components/Toast';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

export default function BillingScreen() {
  const navigation = useNavigation();
  const {
    invoices, cases, rate099Cents, vendorStatus099,
    loading, error, setRate099, createInvoice, advanceInvoice,
  } = useBilling();
  const { showToast } = useToast();
  const [rateInput, setRateInput] = useState('');

  const buckets = agedReceivables(invoices);
  const vendored = vendorStatus099 === 'vendored';

  const draftRc = async (caseIndex: number) => {
    const bc = cases[caseIndex];
    if (!rate099Cents) {
      showToast('Set the 099 hourly rate first', 'error');
      return;
    }
    const draft = draftRcInvoice({
      events: bc.uninvoiced099,
      hourlyRate099Cents: rate099Cents,
      includePcpFee: !!bc.sdpCase.pcp_completed_at && !bc.pcpInvoiced,
      vendorStatus099,
    });
    if (draft.lines.length === 0) {
      showToast(draft.skipped[0]?.reason ?? 'Nothing to bill yet', 'error');
      return;
    }
    const ok = await createInvoice(draft, {
      payerName: 'Regional Center',
      familyId: bc.sdpCase.family_id,
      caseId: bc.sdpCase.id,
    });
    showToast(
      ok
        ? `RC invoice drafted — ${formatCents(draft.totalCents)}${draft.skipped.length ? ` (${draft.skipped.length} skipped)` : ''}`
        : 'Could not create the invoice',
      ok ? 'success' : 'error'
    );
  };

  const draftFms = async (caseIndex: number) => {
    const bc = cases[caseIndex];
    const year = new Date().getFullYear();
    const draft = draftFmsInvoice(bc.sdpCase.agreed_annual_price_cents, `${year}–${year + 1}`);
    if (draft.lines.length === 0) {
      showToast(draft.skipped[0]?.reason ?? 'Nothing to bill', 'error');
      return;
    }
    const ok = await createInvoice(draft, {
      payerName: 'FMS (on file)',
      familyId: bc.sdpCase.family_id,
      caseId: bc.sdpCase.id,
    });
    showToast(
      ok ? `FMS invoice drafted — ${formatCents(draft.totalCents)}` : 'Could not create the invoice',
      ok ? 'success' : 'error'
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>← Caseload</Text>
        </Pressable>
        <Text style={styles.title}>Billing</Text>

        {!vendored && (
          <View style={styles.banner}>
            <Text style={styles.bannerText}>
              099 billing is locked until vendorization completes
              {vendorStatus099 ? ` (packet: ${vendorStatus099})` : ' (no packet on file)'} —
              024 and FMS invoicing still work.
            </Text>
          </View>
        )}

        {/* Aged receivables (D2) */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            Outstanding · {formatCents(buckets.totalOutstanding)}
          </Text>
          <View style={styles.bucketRow}>
            {[
              ['0–30', buckets.current],
              ['31–60', buckets.d31to60],
              ['61–90', buckets.d61to90],
              ['90+', buckets.over90],
            ].map(([label, cents]) => (
              <View key={label as string} style={styles.bucket}>
                <Text style={styles.bucketLabel}>{label}</Text>
                <Text
                  style={[
                    styles.bucketValue,
                    label === '90+' && (cents as number) > 0 && styles.bucketDanger,
                  ]}
                >
                  {formatCents(cents as number)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* 099 rate */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>099 hourly rate</Text>
          {rate099Cents ? (
            <Text style={styles.rateValue}>{formatCents(rate099Cents)}/hour</Text>
          ) : (
            <View style={styles.inlineEdit}>
              <TextInput
                style={styles.input}
                placeholder="$ / hour"
                keyboardType="numeric"
                value={rateInput}
                onChangeText={setRateInput}
              />
              <Pressable
                style={styles.miniButton}
                onPress={async () => {
                  const n = Number(rateInput.replace(/[$,\s]/g, ''));
                  if (!Number.isFinite(n) || n <= 0) return showToast('Enter a rate', 'error');
                  const ok = await setRate099(Math.round(n * 100));
                  showToast(ok ? 'Rate set' : 'Could not save (admin only)', ok ? 'success' : 'error');
                }}
              >
                <Text style={styles.miniButtonText}>Set</Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* Draftable work per case */}
        <Text style={styles.section}>Ready to bill</Text>
        {cases.filter(
          (c) =>
            c.uninvoiced099.length > 0 ||
            (c.sdpCase.pcp_completed_at && !c.pcpInvoiced) ||
            (c.sdpCase.stage === 'active' && c.sdpCase.agreed_annual_price_cents)
        ).length === 0 && !loading ? (
          <Text style={styles.emptyText}>Nothing uninvoiced right now.</Text>
        ) : null}
        {cases.map((bc, i) => {
          const min099 = bc.uninvoiced099.reduce((s, e) => s + e.minutes, 0);
          const pcpReady = !!bc.sdpCase.pcp_completed_at && !bc.pcpInvoiced;
          const fmsReady = bc.sdpCase.stage === 'active' && !!bc.sdpCase.agreed_annual_price_cents;
          if (min099 === 0 && !pcpReady && !fmsReady) return null;
          return (
            <View key={bc.sdpCase.id} style={styles.card}>
              <Text style={styles.cardTitle}>{bc.familyName}</Text>
              {(min099 > 0 || pcpReady) && (
                <>
                  <Text style={styles.meta}>
                    {pcpReady ? 'PCP complete (024 unbilled)' : ''}
                    {pcpReady && min099 > 0 ? ' · ' : ''}
                    {min099 > 0 ? `${Math.round((min099 / 60) * 10) / 10}h of 099 unbilled` : ''}
                  </Text>
                  <Pressable style={styles.secondary} onPress={() => draftRc(i)}>
                    <Text style={styles.secondaryText}>Draft Regional Center invoice</Text>
                  </Pressable>
                </>
              )}
              {fmsReady && (
                <Pressable style={styles.secondary} onPress={() => draftFms(i)}>
                  <Text style={styles.secondaryText}>
                    Draft FMS facilitation invoice ·{' '}
                    {formatCents(bc.sdpCase.agreed_annual_price_cents!)}/yr
                  </Text>
                </Pressable>
              )}
            </View>
          );
        })}

        {/* Invoice list */}
        <Text style={styles.section}>Invoices</Text>
        {invoices.length === 0 && !loading ? (
          <Text style={styles.emptyText}>No invoices yet.</Text>
        ) : null}
        {invoices.map((inv) => (
          <View key={inv.id} style={styles.invoiceRow}>
            <View style={styles.invoiceText}>
              <Text style={styles.invoiceNumber}>{inv.invoice_number}</Text>
              <Text style={styles.meta}>
                {inv.payer_type === 'regional_center' ? 'Regional Center' : 'FMS'} ·{' '}
                {formatCents(inv.total_cents)} · {inv.status}
              </Text>
            </View>
            {(inv.status === 'draft' || inv.status === 'submitted') && (
              <Pressable
                style={styles.miniButton}
                onPress={async () => {
                  const ok = await advanceInvoice(inv);
                  if (!ok) showToast('Could not update (billing role required)', 'error');
                }}
              >
                <Text style={styles.miniButtonText}>
                  {inv.status === 'draft' ? 'Submit' : 'Mark paid'}
                </Text>
              </Pressable>
            )}
          </View>
        ))}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  banner: {
    marginTop: spacing.md,
    backgroundColor: semantic.warningBg,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  bannerText: { color: semantic.warning, fontSize: fonts.sizes.sm, lineHeight: 19 },
  card: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  cardTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  bucketRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  bucket: { flex: 1, alignItems: 'center' },
  bucketLabel: { fontSize: fonts.sizes.xs, color: colors.mid },
  bucketValue: { marginTop: 2, fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.sm },
  bucketDanger: { color: semantic.danger },
  rateValue: { marginTop: spacing.sm, fontSize: fonts.sizes.xl, fontWeight: fonts.weights.extrabold, color: colors.navy },
  inlineEdit: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.sm },
  input: {
    flex: 1,
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.light,
    color: colors.dark,
  },
  miniButton: {
    minHeight: 44,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  miniButtonText: { color: colors.white, fontWeight: fonts.weights.bold },
  section: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
    fontSize: fonts.sizes.lg,
    fontWeight: fonts.weights.bold,
    color: colors.navy,
  },
  emptyText: { marginTop: spacing.sm, color: colors.mid, fontSize: fonts.sizes.sm },
  meta: { marginTop: spacing.xs, fontSize: fonts.sizes.sm, color: colors.mid },
  secondary: {
    marginTop: spacing.md,
    minHeight: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.base,
  },
  secondaryText: { color: colors.dark, fontWeight: fonts.weights.semibold, fontSize: fonts.sizes.sm },
  invoiceRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  invoiceText: { flex: 1 },
  invoiceNumber: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.md },
  errorText: { marginTop: spacing.md, color: colors.error, fontSize: fonts.sizes.sm },
});
