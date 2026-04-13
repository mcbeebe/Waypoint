/**
 * Tax Deduction Report — Annual summary of tax-deductible expenses
 * Phase 2: Sprint S23
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useExpenses } from '@/hooks/useExpenses';
import type { ExpenseCategory } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  therapy: 'Therapy',
  equipment: 'Equipment & Supplies',
  transportation: 'Transportation',
  copay: 'Medical Copays',
  medication: 'Medications',
  other: 'Other Medical Expenses',
};

export default function TaxReportScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const dateRange = useMemo(() => ({
    start: `${selectedYear}-01-01`,
    end: `${selectedYear}-12-31`,
  }), [selectedYear]);

  const { expenses, loading } = useExpenses({ familyId, dateRange });

  /** Only tax-deductible expenses */
  const deductibleExpenses = useMemo(
    () => expenses.filter((e) => e.is_tax_deductible),
    [expenses]
  );

  /** Group by category with totals */
  const categoryBreakdown = useMemo(() => {
    const groups: Record<string, { total: number; count: number }> = {};
    for (const exp of deductibleExpenses) {
      if (!groups[exp.category]) groups[exp.category] = { total: 0, count: 0 };
      groups[exp.category].total += exp.amount;
      groups[exp.category].count++;
    }
    return Object.entries(groups)
      .sort(([, a], [, b]) => b.total - a.total)
      .map(([category, data]) => ({
        category: category as ExpenseCategory,
        label: CATEGORY_LABELS[category as ExpenseCategory] ?? category,
        ...data,
      }));
  }, [deductibleExpenses]);

  const grandTotal = deductibleExpenses.reduce((sum, e) => sum + e.amount, 0);

  /** Quarterly breakdown */
  const quarterlyTotals = useMemo(() => {
    const quarters = [0, 0, 0, 0];
    for (const exp of deductibleExpenses) {
      const month = parseInt(exp.expense_date.split('-')[1], 10);
      quarters[Math.floor((month - 1) / 3)] += exp.amount;
    }
    return quarters;
  }, [deductibleExpenses]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tax Deduction Report</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Year Selector */}
        <View style={styles.yearRow}>
          <TouchableOpacity onPress={() => setSelectedYear(selectedYear - 1)}>
            <Text style={styles.yearArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.yearLabel}>{selectedYear}</Text>
          <TouchableOpacity
            onPress={() => setSelectedYear(Math.min(selectedYear + 1, currentYear))}
            disabled={selectedYear >= currentYear}
          >
            <Text style={[styles.yearArrow, selectedYear >= currentYear && { opacity: 0.3 }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Grand Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Total Tax-Deductible Expenses</Text>
          <Text style={styles.totalAmount}>${grandTotal.toFixed(2)}</Text>
          <Text style={styles.totalCount}>{deductibleExpenses.length} items</Text>
        </View>

        {/* Quarterly Breakdown */}
        <Text style={styles.sectionTitle}>Quarterly Breakdown</Text>
        <View style={styles.quarterRow}>
          {['Q1', 'Q2', 'Q3', 'Q4'].map((q, i) => (
            <View key={q} style={styles.quarterCard}>
              <Text style={styles.quarterLabel}>{q}</Text>
              <Text style={styles.quarterAmount}>${quarterlyTotals[i].toFixed(0)}</Text>
            </View>
          ))}
        </View>

        {/* Category Breakdown */}
        <Text style={styles.sectionTitle}>By Category</Text>
        {categoryBreakdown.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              No tax-deductible expenses for {selectedYear}
            </Text>
          </View>
        ) : (
          categoryBreakdown.map((cat) => (
            <View key={cat.category} style={styles.categoryRow}>
              <View style={styles.categoryInfo}>
                <Text style={styles.categoryLabel}>{cat.label}</Text>
                <Text style={styles.categoryCount}>{cat.count} items</Text>
              </View>
              <Text style={styles.categoryTotal}>${cat.total.toFixed(2)}</Text>
            </View>
          ))
        )}

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Text style={styles.disclaimerText}>
            This report is for informational purposes only. Consult a tax professional
            to determine which expenses qualify as deductions under current tax law.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xl },
  yearRow: {
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.lg,
  },
  yearArrow: { fontSize: 24, color: colors.teal, fontWeight: '700' },
  yearLabel: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  totalCard: {
    backgroundColor: colors.white, borderRadius: radii.lg, padding: spacing.lg,
    alignItems: 'center', marginBottom: spacing.lg,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2,
  },
  totalLabel: { fontSize: fonts.sizes.xs, color: colors.mid, marginBottom: spacing.sm },
  totalAmount: { fontSize: 32, fontWeight: '700', color: '#10B981' },
  totalCount: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 4 },
  sectionTitle: {
    fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy,
    marginBottom: spacing.sm, marginTop: spacing.sm,
  },
  quarterRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  quarterCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md,
    alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  quarterLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500' },
  quarterAmount: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginTop: 4 },
  categoryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radii.md, padding: spacing.md,
    marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  categoryInfo: { flex: 1 },
  categoryLabel: { fontSize: fonts.sizes.sm, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  categoryCount: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  categoryTotal: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptyState: { padding: spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center' },
  disclaimer: {
    marginTop: spacing.xl, padding: spacing.md, backgroundColor: '#FEF3C7', borderRadius: radii.md,
  },
  disclaimerText: { fontSize: fonts.sizes.xs, color: '#92400E', lineHeight: 16 },
});
