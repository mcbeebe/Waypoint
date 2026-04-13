/**
 * Expenses screen — Financial tracker with expense list, add/edit modal,
 * and reimbursement status tracking.
 * Phase 2: Sprints S20–S22
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Switch,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFamily } from '@/hooks/useFamily';
import { useExpenses } from '@/hooks/useExpenses';
import { useToast } from '@/components/Toast';
import type { Expense, ExpenseCategory, ReimbursementStatus } from '@/types/database';
import { colors, fonts, spacing, radii } from '@/lib/theme';

// ─── Config ─────────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<ExpenseCategory, { label: string; emoji: string; color: string }> = {
  therapy: { label: 'Therapy', emoji: '🧠', color: '#7C3AED' },
  equipment: { label: 'Equipment', emoji: '🦽', color: '#2563EB' },
  transportation: { label: 'Transport', emoji: '🚗', color: '#0891B2' },
  copay: { label: 'Copay', emoji: '💊', color: '#DC2626' },
  medication: { label: 'Medication', emoji: '💉', color: '#EA580C' },
  other: { label: 'Other', emoji: '📋', color: '#64748B' },
};

const REIMBURSEMENT_CONFIG: Record<ReimbursementStatus, { label: string; color: string }> = {
  none: { label: 'N/A', color: '#94A3B8' },
  submitted: { label: 'Submitted', color: '#F59E0B' },
  approved: { label: 'Approved', color: '#10B981' },
  denied: { label: 'Denied', color: '#EF4444' },
  received: { label: 'Received', color: '#6366F1' },
};

type ViewMode = 'all' | 'reimbursements';

// ─── Main Screen ────────────────────────────────────────────────────────────

export default function ExpensesScreen() {
  const { family } = useFamily();
  const familyId = family?.id ?? '';
  const { showToast } = useToast();

  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | undefined>(undefined);
  const [reimbursementFilter, setReimbursementFilter] = useState<ReimbursementStatus | undefined>(undefined);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const {
    expenses,
    loading,
    summary,
    createExpense,
    updateExpense,
    deleteExpense,
    refetch,
  } = useExpenses({ familyId, categoryFilter });

  /** Group expenses by month */
  const groupedExpenses = useMemo(() => {
    let filtered = expenses;
    if (viewMode === 'reimbursements') {
      filtered = expenses.filter((e) => e.reimbursement_status !== 'none');
      if (reimbursementFilter) {
        filtered = filtered.filter((e) => e.reimbursement_status === reimbursementFilter);
      }
    }

    const groups: Record<string, Expense[]> = {};
    for (const exp of filtered) {
      const month = exp.expense_date.slice(0, 7); // YYYY-MM
      if (!groups[month]) groups[month] = [];
      groups[month].push(exp);
    }

    return Object.entries(groups)
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([month, items]) => ({
        month,
        label: formatMonthLabel(month),
        total: items.reduce((sum, e) => sum + e.amount, 0),
        items,
      }));
  }, [expenses, viewMode, reimbursementFilter]);

  const handleSave = useCallback(async (data: Parameters<typeof createExpense>[0], existingId?: string) => {
    if (existingId) {
      await updateExpense(existingId, data);
      showToast('Expense updated', 'success');
    } else {
      const result = await createExpense(data);
      showToast(result ? 'Expense added' : 'Saved offline', result ? 'success' : 'info');
    }
    setShowAddModal(false);
    setEditingExpense(null);
  }, [createExpense, updateExpense, showToast]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteExpense(id);
    showToast('Expense deleted', 'success');
  }, [deleteExpense, showToast]);

  const handleEdit = useCallback((expense: Expense) => {
    setEditingExpense(expense);
    setShowAddModal(true);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Expenses</Text>
          <Text style={styles.headerSubtitle}>
            This month: ${summary.monthlyTotal.toFixed(2)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => { setEditingExpense(null); setShowAddModal(true); }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Bar */}
      <View style={styles.summaryBar}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>${summary.totalAmount.toFixed(0)}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            ${summary.totalDeductible.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Deductible</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#F59E0B' }]}>
            ${summary.totalReimbursementPending.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#6366F1' }]}>
            ${summary.totalReimbursementReceived.toFixed(0)}
          </Text>
          <Text style={styles.summaryLabel}>Received</Text>
        </View>
      </View>

      {/* View Toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'all' && styles.togglePillActive]}
          onPress={() => setViewMode('all')}
        >
          <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleTextActive]}>
            All Expenses
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.togglePill, viewMode === 'reimbursements' && styles.togglePillActive]}
          onPress={() => setViewMode('reimbursements')}
        >
          <Text style={[styles.toggleText, viewMode === 'reimbursements' && styles.toggleTextActive]}>
            Reimbursements
          </Text>
        </TouchableOpacity>
      </View>

      {/* Category Filter (all view) */}
      {viewMode === 'all' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterPill, !categoryFilter && styles.filterPillActive]}
            onPress={() => setCategoryFilter(undefined)}
          >
            <Text style={[styles.filterText, !categoryFilter && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.filterPill, categoryFilter === cat && styles.filterPillActive]}
              onPress={() => setCategoryFilter(categoryFilter === cat ? undefined : cat)}
            >
              <Text style={[styles.filterText, categoryFilter === cat && styles.filterTextActive]}>
                {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Reimbursement Filter (reimbursement view) */}
      {viewMode === 'reimbursements' && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
          <TouchableOpacity
            style={[styles.filterPill, !reimbursementFilter && styles.filterPillActive]}
            onPress={() => setReimbursementFilter(undefined)}
          >
            <Text style={[styles.filterText, !reimbursementFilter && styles.filterTextActive]}>All</Text>
          </TouchableOpacity>
          {(['submitted', 'approved', 'denied', 'received'] as ReimbursementStatus[]).map((status) => (
            <TouchableOpacity
              key={status}
              style={[styles.filterPill, reimbursementFilter === status && styles.filterPillActive]}
              onPress={() => setReimbursementFilter(reimbursementFilter === status ? undefined : status)}
            >
              <Text style={[styles.filterText, reimbursementFilter === status && styles.filterTextActive]}>
                {REIMBURSEMENT_CONFIG[status].label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Expense List */}
      <FlatList
        data={groupedExpenses}
        keyExtractor={(item) => item.month}
        renderItem={({ item: group }) => (
          <View style={styles.monthGroup}>
            <View style={styles.monthHeader}>
              <Text style={styles.monthLabel}>{group.label}</Text>
              <Text style={styles.monthTotal}>${group.total.toFixed(2)}</Text>
            </View>
            {group.items.map((expense) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </View>
        )}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={refetch} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>💰</Text>
            <Text style={styles.emptyTitle}>No expenses yet</Text>
            <Text style={styles.emptySubtitle}>
              Track therapy costs, equipment, copays, and more
            </Text>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <ExpenseModal
        visible={showAddModal}
        expense={editingExpense}
        onSave={handleSave}
        onClose={() => { setShowAddModal(false); setEditingExpense(null); }}
      />
    </SafeAreaView>
  );
}

// ─── Expense Row ────────────────────────────────────────────────────────────

function ExpenseRow({
  expense,
  onEdit,
  onDelete,
}: {
  expense: Expense;
  onEdit: (e: Expense) => void;
  onDelete: (id: string) => void;
}) {
  const catConfig = CATEGORY_CONFIG[expense.category] ?? CATEGORY_CONFIG.other;
  const reimbConfig = REIMBURSEMENT_CONFIG[expense.reimbursement_status];

  return (
    <TouchableOpacity style={styles.expenseRow} onPress={() => onEdit(expense)} onLongPress={() => onDelete(expense.id)}>
      <View style={[styles.categoryDot, { backgroundColor: catConfig.color }]}>
        <Text style={styles.categoryEmoji}>{catConfig.emoji}</Text>
      </View>
      <View style={styles.expenseInfo}>
        <Text style={styles.expenseTitle} numberOfLines={1}>
          {expense.description || catConfig.label}
        </Text>
        <Text style={styles.expenseDate}>{formatDate(expense.expense_date)}</Text>
      </View>
      <View style={styles.expenseRight}>
        <Text style={styles.expenseAmount}>${expense.amount.toFixed(2)}</Text>
        {expense.reimbursement_status !== 'none' && (
          <View style={[styles.reimbBadge, { backgroundColor: reimbConfig.color + '20' }]}>
            <Text style={[styles.reimbBadgeText, { color: reimbConfig.color }]}>
              {reimbConfig.label}
            </Text>
          </View>
        )}
        {expense.is_tax_deductible && (
          <Text style={styles.taxBadge}>Tax</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Add/Edit Modal ─────────────────────────────────────────────────────────

function ExpenseModal({
  visible,
  expense,
  onSave,
  onClose,
}: {
  visible: boolean;
  expense: Expense | null;
  onSave: (data: Parameters<ReturnType<typeof useExpenses>['createExpense']>[0], existingId?: string) => void;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState<ExpenseCategory>('therapy');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fundingSource, setFundingSource] = useState('');
  const [isTaxDeductible, setIsTaxDeductible] = useState(false);
  const [reimbStatus, setReimbStatus] = useState<ReimbursementStatus>('none');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-fill on edit
  React.useEffect(() => {
    if (expense) {
      setAmount(expense.amount.toString());
      setCategory(expense.category);
      setDescription(expense.description ?? '');
      setDate(expense.expense_date);
      setFundingSource(expense.funding_source ?? '');
      setIsTaxDeductible(expense.is_tax_deductible);
      setReimbStatus(expense.reimbursement_status);
    } else {
      setAmount('');
      setCategory('therapy');
      setDescription('');
      setDate(new Date().toISOString().split('T')[0]);
      setFundingSource('');
      setIsTaxDeductible(false);
      setReimbStatus('none');
    }
  }, [expense, visible]);

  const handleSubmit = async () => {
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    setIsSaving(true);
    await onSave(
      {
        amount: parsedAmount,
        category,
        description: description || undefined,
        expense_date: date,
        funding_source: fundingSource || undefined,
        is_tax_deductible: isTaxDeductible,
        reimbursement_status: reimbStatus,
      },
      expense?.id
    );
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{expense ? 'Edit Expense' : 'Add Expense'}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Amount */}
            <Text style={styles.fieldLabel}>Amount *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="0.00"
              placeholderTextColor={colors.mid}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
            />

            {/* Category */}
            <Text style={styles.fieldLabel}>Category</Text>
            <View style={styles.categoryGrid}>
              {(Object.keys(CATEGORY_CONFIG) as ExpenseCategory[]).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryOption, category === cat && { backgroundColor: CATEGORY_CONFIG[cat].color + '20', borderColor: CATEGORY_CONFIG[cat].color }]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={styles.categoryOptionText}>
                    {CATEGORY_CONFIG[cat].emoji} {CATEGORY_CONFIG[cat].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Description */}
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., ABA therapy session"
              placeholderTextColor={colors.mid}
              value={description}
              onChangeText={setDescription}
            />

            {/* Date */}
            <Text style={styles.fieldLabel}>Date *</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={colors.mid}
              value={date}
              onChangeText={setDate}
            />

            {/* Funding Source */}
            <Text style={styles.fieldLabel}>Funding Source</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="e.g., Regional Center, Insurance, Out-of-pocket"
              placeholderTextColor={colors.mid}
              value={fundingSource}
              onChangeText={setFundingSource}
            />

            {/* Tax Deductible Toggle */}
            <View style={styles.switchRow}>
              <Text style={styles.fieldLabel}>Tax Deductible</Text>
              <Switch value={isTaxDeductible} onValueChange={setIsTaxDeductible} />
            </View>

            {/* Reimbursement Status */}
            <Text style={styles.fieldLabel}>Reimbursement</Text>
            <View style={styles.categoryGrid}>
              {(Object.keys(REIMBURSEMENT_CONFIG) as ReimbursementStatus[]).map((status) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.categoryOption, reimbStatus === status && { backgroundColor: REIMBURSEMENT_CONFIG[status].color + '20', borderColor: REIMBURSEMENT_CONFIG[status].color }]}
                  onPress={() => setReimbStatus(status)}
                >
                  <Text style={styles.categoryOptionText}>{REIMBURSEMENT_CONFIG[status].label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSaving || !amount}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveText}>{expense ? 'Update' : 'Add'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatMonthLabel(month: string): string {
  const [year, m] = month.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(m, 10) - 1]} ${year}`;
}

function formatDate(date: string): string {
  const d = new Date(date + 'T00:00:00');
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFB' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fonts.sizes.xl, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  headerSubtitle: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  addButton: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.teal, justifyContent: 'center', alignItems: 'center',
  },
  addButtonText: { fontSize: 20, color: colors.white, fontWeight: '700' },
  summaryBar: {
    flexDirection: 'row', backgroundColor: colors.white,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: fonts.sizes.md, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  summaryLabel: { fontSize: 10, color: colors.mid, marginTop: 2 },
  toggleRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 6,
  },
  togglePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.light },
  togglePillActive: { backgroundColor: colors.teal },
  toggleText: { fontSize: 12, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  toggleTextActive: { color: colors.white },
  filterRow: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  filterContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: 6 },
  filterPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.light },
  filterPillActive: { backgroundColor: colors.teal },
  filterText: { fontSize: 11, color: colors.dark },
  filterTextActive: { color: colors.white },
  listContent: { padding: spacing.md, paddingBottom: spacing.xl },
  monthGroup: { marginBottom: spacing.lg },
  monthHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  monthLabel: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  monthTotal: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.medium as '500', color: colors.mid },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white,
    borderRadius: radii.md, padding: spacing.md, marginBottom: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
    gap: spacing.sm,
  },
  categoryDot: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  categoryEmoji: { fontSize: 16 },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: fonts.sizes.sm, color: colors.dark, fontWeight: fonts.weights.medium as '500' },
  expenseDate: { fontSize: fonts.sizes.xs, color: colors.mid, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 3 },
  expenseAmount: { fontSize: fonts.sizes.sm, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  reimbBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: radii.sm },
  reimbBadgeText: { fontSize: 9, fontWeight: fonts.weights.medium as '500' },
  taxBadge: { fontSize: 9, color: '#10B981', fontWeight: fonts.weights.medium as '500' },
  emptyState: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: spacing.md },
  emptyTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy },
  emptySubtitle: { fontSize: fonts.sizes.sm, color: colors.mid, textAlign: 'center', marginTop: spacing.sm },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.white, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl,
    padding: spacing.lg, paddingBottom: spacing.xl, maxHeight: '85%',
  },
  modalTitle: { fontSize: fonts.sizes.lg, fontWeight: fonts.weights.bold as '700', color: colors.navy, marginBottom: spacing.md },
  fieldLabel: { fontSize: fonts.sizes.xs, color: colors.mid, fontWeight: fonts.weights.medium as '500', marginBottom: 4, marginTop: spacing.sm },
  modalInput: {
    backgroundColor: colors.light, borderRadius: radii.md, paddingHorizontal: spacing.md,
    paddingVertical: spacing.base, fontSize: fonts.sizes.sm, color: colors.dark,
  },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  categoryOption: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.light,
  },
  categoryOptionText: { fontSize: 11, color: colors.dark },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.sm },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.lg },
  cancelButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, borderWidth: 1, borderColor: colors.border },
  cancelText: { fontSize: fonts.sizes.sm, color: colors.mid },
  saveButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.base, borderRadius: radii.md, backgroundColor: colors.teal },
  saveButtonDisabled: { backgroundColor: colors.border },
  saveText: { fontSize: fonts.sizes.sm, color: colors.white, fontWeight: fonts.weights.medium as '500' },
});
