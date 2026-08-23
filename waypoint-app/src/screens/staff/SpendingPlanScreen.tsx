/**
 * Spending plan builder (PRD W-C: C5) — every line the family directs,
 * validated live against the certified budget with money-denominated
 * errors, and the conflict-of-interest block rendered as an explanation
 * (the DB trigger in 039 is the backstop).
 */
import React, { useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { useSdpCase, useStaffSelf } from '@/hooks/useFacilitation';
import { validateSpendingPlan, formatCents } from '@/lib/spendingPlan';
import { useToast } from '@/components/Toast';
import type { StaffStackParamList } from '@/types/navigation';
import { colors, semantic, fonts, spacing, radii } from '@/lib/theme';

type Nav = NativeStackNavigationProp<StaffStackParamList, 'SpendingPlan'>;
type Route = RouteProp<StaffStackParamList, 'SpendingPlan'>;

export default function SpendingPlanScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const { sdpCase, planLines, addPlanLine, removePlanLine } = useSdpCase({
    caseId: params.caseId,
    familyId: params.familyId,
  });
  const { orgName } = useStaffSelf();
  const { showToast } = useToast();

  const [category, setCategory] = useState('');
  const [provider, setProvider] = useState('');
  const [amount, setAmount] = useState('');
  const [adding, setAdding] = useState(false);

  const validation = validateSpendingPlan(
    planLines,
    sdpCase?.certified_budget_cents,
    orgName
  );

  const add = async () => {
    const cents = Math.round(Number(amount.replace(/[$,\s]/g, '')) * 100);
    if (!category.trim() || !provider.trim() || !Number.isFinite(cents) || cents <= 0) {
      showToast('Category, provider, and a dollar amount are required', 'error');
      return;
    }
    // The COI rule, explained before the DB trigger would reject it.
    if (provider.trim().toLowerCase() === orgName.trim().toLowerCase()) {
      showToast(
        `${orgName} facilitates this plan and can't also be a provider on it (W&I §4685.8).`,
        'error'
      );
      return;
    }
    setAdding(true);
    try {
      const ok = await addPlanLine({
        category: category.trim(),
        providerName: provider.trim(),
        annualAmountCents: cents,
      });
      if (ok) {
        setCategory(''); setProvider(''); setAmount('');
      } else {
        showToast('Could not add the line', 'error');
      }
    } finally {
      setAdding(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.back}>← Case</Text>
        </Pressable>
        <Text style={styles.title}>Spending plan</Text>
        <Text style={styles.subtitle}>
          {formatCents(validation.totalCents)}
          {validation.budgetCents !== null
            ? ` of ${formatCents(validation.budgetCents)} certified`
            : ' — no certified budget yet'}
        </Text>

        {/* Validation panel — money-denominated, remedy included */}
        {validation.issues.map((issue, i) => (
          <View
            key={`${issue.code}-${i}`}
            style={[styles.issue, issue.severity === 'error' ? styles.issueError : styles.issueWarn]}
          >
            <Text
              style={issue.severity === 'error' ? styles.issueErrorText : styles.issueWarnText}
            >
              {issue.message}
            </Text>
          </View>
        ))}
        {validation.ready && (
          <View style={[styles.issue, styles.issueReady]}>
            <Text style={styles.issueReadyText}>
              Plan sums to the certified budget — ready to submit to the FMS.
            </Text>
          </View>
        )}

        {/* Lines */}
        {planLines.map((l) => (
          <View key={l.id} style={styles.line}>
            <View style={styles.lineText}>
              <Text style={styles.lineCategory}>{l.category}</Text>
              <Text style={styles.lineProvider}>{l.provider_name}</Text>
            </View>
            <Text style={styles.lineAmount}>{formatCents(l.annual_amount_cents)}</Text>
            <Pressable
              hitSlop={8}
              onPress={async () => {
                const ok = await removePlanLine(l.id);
                if (!ok) showToast('Could not remove the line', 'error');
              }}
            >
              <Text style={styles.lineRemove}>✕</Text>
            </Pressable>
          </View>
        ))}

        {/* Add line */}
        <View style={styles.addCard}>
          <Text style={styles.addTitle}>Add a line</Text>
          <TextInput
            style={styles.input}
            placeholder="Category (e.g. Respite)"
            value={category}
            onChangeText={setCategory}
          />
          <TextInput
            style={styles.input}
            placeholder="Provider"
            value={provider}
            onChangeText={setProvider}
          />
          <TextInput
            style={styles.input}
            placeholder="$ per year"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />
          <Pressable style={[styles.cta, adding && styles.disabled]} onPress={add}>
            <Text style={styles.ctaText}>{adding ? 'Adding…' : 'Add line'}</Text>
          </Pressable>
        </View>

        <View style={styles.coiNote}>
          <Text style={styles.coiText}>
            {orgName} never appears as a provider on this plan — state law
            (W&I §4685.8) keeps your facilitator independent of the services
            in the budget.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.light },
  content: { padding: spacing.base, paddingBottom: spacing['2xl'] },
  back: { color: colors.teal, fontWeight: fonts.weights.semibold, marginBottom: spacing.sm },
  title: { fontSize: fonts.sizes['2xl'], fontWeight: fonts.weights.extrabold, color: colors.navy },
  subtitle: { marginTop: spacing.xs, marginBottom: spacing.base, fontSize: fonts.sizes.md, color: colors.mid },
  issue: { borderRadius: radii.md, padding: spacing.md, marginBottom: spacing.sm },
  issueError: { backgroundColor: semantic.dangerBg },
  issueErrorText: { color: semantic.danger, fontSize: fonts.sizes.sm, lineHeight: 19 },
  issueWarn: { backgroundColor: semantic.warningBg },
  issueWarnText: { color: semantic.warning, fontSize: fonts.sizes.sm, lineHeight: 19 },
  issueReady: { backgroundColor: semantic.successBg },
  issueReadyText: { color: semantic.success, fontSize: fonts.sizes.sm, fontWeight: fonts.weights.semibold },
  line: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    marginBottom: spacing.sm,
  },
  lineText: { flex: 1 },
  lineCategory: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.md },
  lineProvider: { marginTop: 2, color: colors.mid, fontSize: fonts.sizes.sm },
  lineAmount: { fontWeight: fonts.weights.bold, color: colors.navy, fontSize: fonts.sizes.md },
  lineRemove: { color: colors.error, fontSize: fonts.sizes.lg, padding: spacing.xs },
  addCard: {
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.base,
    gap: spacing.sm,
  },
  addTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold, color: colors.navy },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.light,
    paddingHorizontal: spacing.md,
    color: colors.dark,
  },
  cta: {
    minHeight: 48,
    borderRadius: radii.md,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: { color: colors.white, fontWeight: fonts.weights.bold, fontSize: fonts.sizes.base },
  disabled: { opacity: 0.5 },
  coiNote: {
    marginTop: spacing.base,
    backgroundColor: semantic.infoBg,
    borderRadius: radii.md,
    padding: spacing.base,
  },
  coiText: { color: colors.dark, fontSize: fonts.sizes.sm, lineHeight: 19 },
});
