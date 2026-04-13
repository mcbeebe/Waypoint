/**
 * Providers hook — CRUD with type filtering and search
 * Manages the family's care team (therapists, doctors, attorneys, etc.)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Provider, ProviderType } from '@/types/database';

interface UseProvidersOptions {
  familyId: string;
  typeFilter?: ProviderType;
  showInactive?: boolean;
}

interface CreateProviderInput {
  name: string;
  provider_type: ProviderType;
  specialty?: string;
  organization?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

interface UseProvidersReturn {
  providers: Provider[];
  loading: boolean;
  error: string | null;
  createProvider: (data: CreateProviderInput) => Promise<Provider | null>;
  updateProvider: (id: string, data: Partial<Provider>) => Promise<void>;
  deactivateProvider: (id: string) => Promise<void>;
  searchProviders: (query: string) => Provider[];
  refetch: () => Promise<void>;
}

export function useProviders(options: UseProvidersOptions): UseProvidersReturn {
  const { familyId, typeFilter, showInactive = false } = options;

  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    if (!familyId) return;
    try {
      let query = supabase
        .from('providers')
        .select('*')
        .eq('family_id', familyId)
        .order('name', { ascending: true });

      if (typeFilter) {
        query = query.eq('provider_type', typeFilter);
      }
      if (!showInactive) {
        query = query.eq('is_active', true);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setProviders((data as Provider[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [familyId, typeFilter, showInactive]);

  useEffect(() => {
    setLoading(true);
    fetchProviders().finally(() => setLoading(false));
  }, [fetchProviders]);

  const createProvider = useCallback(async (data: CreateProviderInput): Promise<Provider | null> => {
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('providers')
        .insert({
          family_id: familyId,
          name: data.name,
          provider_type: data.provider_type,
          specialty: data.specialty ?? null,
          organization: data.organization ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          address: data.address ?? null,
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const provider = created as Provider;
      setProviders((prev) => [...prev, provider].sort((a, b) => a.name.localeCompare(b.name)));
      return provider;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

  const updateProvider = useCallback(async (id: string, data: Partial<Provider>) => {
    setError(null);
    setProviders((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    try {
      const { error: dbError } = await supabase
        .from('providers')
        .update(data)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchProviders();
    }
  }, [fetchProviders]);

  const deactivateProvider = useCallback(async (id: string) => {
    await updateProvider(id, { is_active: false });
  }, [updateProvider]);

  const searchProviders = useCallback((query: string): Provider[] => {
    if (!query.trim()) return providers;
    const lower = query.toLowerCase();
    return providers.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        p.organization?.toLowerCase().includes(lower) ||
        p.specialty?.toLowerCase().includes(lower)
    );
  }, [providers]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchProviders();
    setLoading(false);
  }, [fetchProviders]);

  return { providers, loading, error, createProvider, updateProvider, deactivateProvider, searchProviders, refetch };
}
