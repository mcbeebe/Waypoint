/**
 * Expenses hook — CRUD with filtering and summaries
 * Follows the useActions pattern with optimistic updates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import type { Expense, ExpenseCategory, ReimbursementStatus } from '@/types/database';


interface UseExpensesOptions {
  familyId: string;
  categoryFilter?: ExpenseCategory;
  dateRange?: { start: string; end: string };
}

interface CreateExpenseInput {
  category: ExpenseCategory;
  amount: number;
  expense_date: string;
  description?: string;
  child_id?: string;
  provider_id?: string;
  funding_source?: string;
  is_tax_deductible?: boolean;
  reimbursement_status?: ReimbursementStatus;
  reimbursement_amount?: number;
  notes?: string;
  /** Attached receipt (documents table id); null clears it on edit */
  receipt_document_id?: string | null;
}

export interface ExpenseSummary {
  totalAmount: number;
  totalDeductible: number;
  totalReimbursementPending: number;
  totalReimbursementReceived: number;
  countByCategory: Partial<Record<ExpenseCategory, number>>;
  monthlyTotal: number;
}

interface UseExpensesReturn {
  expenses: Expense[];
  loading: boolean;
  error: string | null;
  summary: ExpenseSummary;
  createExpense: (data: CreateExpenseInput) => Promise<Expense | null>;
  updateExpense: (id: string, data: Partial<Expense>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useExpenses(options: UseExpensesOptions): UseExpensesReturn {
  const { familyId, categoryFilter, dateRange } = options;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!familyId) return;
    try {
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('family_id', familyId)
        .order('expense_date', { ascending: false });

      if (categoryFilter) {
        query = query.eq('category', categoryFilter);
      }
      if (dateRange) {
        query = query.gte('expense_date', dateRange.start).lte('expense_date', dateRange.end);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setExpenses((data as Expense[]) ?? []);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your expenses."));
    }
  }, [familyId, categoryFilter, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    setLoading(true);
    fetchExpenses().finally(() => setLoading(false));
  }, [fetchExpenses]);

  /** Computed summary */
  const summary = useMemo((): ExpenseSummary => {
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    let totalAmount = 0;
    let totalDeductible = 0;
    let totalReimbursementPending = 0;
    let totalReimbursementReceived = 0;
    let monthlyTotal = 0;
    const countByCategory: Partial<Record<ExpenseCategory, number>> = {};

    for (const exp of expenses) {
      totalAmount += exp.amount;
      if (exp.is_tax_deductible) totalDeductible += exp.amount;
      if (exp.reimbursement_status === 'submitted') {
        totalReimbursementPending += exp.reimbursement_amount ?? exp.amount;
      }
      if (exp.reimbursement_status === 'received') {
        totalReimbursementReceived += exp.reimbursement_amount ?? exp.amount;
      }
      if (exp.expense_date.startsWith(currentMonth)) {
        monthlyTotal += exp.amount;
      }
      countByCategory[exp.category] = (countByCategory[exp.category] ?? 0) + 1;
    }

    return {
      totalAmount,
      totalDeductible,
      totalReimbursementPending,
      totalReimbursementReceived,
      countByCategory,
      monthlyTotal,
    };
  }, [expenses]);

  /** Create a new expense */
  const createExpense = useCallback(async (data: CreateExpenseInput): Promise<Expense | null> => {
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('expenses')
        .insert({
          family_id: familyId,
          category: data.category,
          amount: data.amount,
          expense_date: data.expense_date,
          description: data.description ?? null,
          child_id: data.child_id ?? null,
          provider_id: data.provider_id ?? null,
          funding_source: data.funding_source ?? null,
          is_tax_deductible: data.is_tax_deductible ?? false,
          reimbursement_status: data.reimbursement_status ?? 'none',
          reimbursement_amount: data.reimbursement_amount ?? null,
          notes: data.notes ?? null,
          receipt_document_id: data.receipt_document_id ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const expense = created as Expense;
      setExpenses((prev) => [expense, ...prev]);
      return expense;
    } catch (err) {
      // Honest failure (Wave 1.6): the old path wrote to a queue nothing
      // ever drained. Surface the real error; true offline sync is 7.2.
      const message = err instanceof Error ? err.message : 'Unknown error';
      setError(`Couldn't save this expense: ${message}`);
      return null;
    }
  }, [familyId]);

  /** Update an expense (optimistic) */
  const updateExpense = useCallback(async (id: string, data: Partial<Expense>) => {
    setError(null);
    setExpenses((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)));
    try {
      const { error: dbError } = await supabase
        .from('expenses')
        .update(data)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your expenses."));
      fetchExpenses(); // Rollback
    }
  }, [fetchExpenses]);

  /** Delete an expense */
  const deleteExpense = useCallback(async (id: string) => {
    setError(null);
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    try {
      const { error: dbError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your expenses."));
      fetchExpenses(); // Rollback
    }
  }, [fetchExpenses]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchExpenses();
    setLoading(false);
  }, [fetchExpenses]);

  return { expenses, loading, error, summary, createExpense, updateExpense, deleteExpense, refetch };
}
