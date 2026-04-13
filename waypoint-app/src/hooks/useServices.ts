/**
 * Services hook — CRUD with authorization tracking and provider/child linking
 * Tracks therapy services, authorized hours, and expiration dates
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import type { Service, ServiceType, ServiceStatus, FundingSource } from '@/types/database';

interface UseServicesOptions {
  familyId: string;
  childId?: string;
  providerId?: string;
  statusFilter?: ServiceStatus;
}

interface CreateServiceInput {
  child_id: string;
  service_type: ServiceType;
  provider_id?: string;
  funding_source?: FundingSource;
  authorized_hours?: number;
  frequency?: string;
  start_date?: string;
  end_date?: string;
  authorization_number?: string;
  status?: ServiceStatus;
  notes?: string;
}

export interface ServiceWithMeta extends Service {
  isExpiringSoon: boolean;
  daysUntilExpiry: number | null;
}

interface UseServicesReturn {
  services: ServiceWithMeta[];
  loading: boolean;
  error: string | null;
  expiringCount: number;
  createService: (data: CreateServiceInput) => Promise<Service | null>;
  updateService: (id: string, data: Partial<Service>) => Promise<void>;
  deleteService: (id: string) => Promise<void>;
  refetch: () => Promise<void>;
}

export function useServices(options: UseServicesOptions): UseServicesReturn {
  const { familyId, childId, providerId, statusFilter } = options;

  const [rawServices, setRawServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchServices = useCallback(async () => {
    if (!familyId) return;
    try {
      let query = supabase
        .from('services')
        .select('*')
        .eq('family_id', familyId)
        .order('start_date', { ascending: false });

      if (childId) query = query.eq('child_id', childId);
      if (providerId) query = query.eq('provider_id', providerId);
      if (statusFilter) query = query.eq('status', statusFilter);

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setRawServices((data as Service[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [familyId, childId, providerId, statusFilter]);

  useEffect(() => {
    setLoading(true);
    fetchServices().finally(() => setLoading(false));
  }, [fetchServices]);

  /** Enrich services with expiry metadata */
  const services = useMemo((): ServiceWithMeta[] => {
    const now = new Date();
    return rawServices.map((s) => {
      let daysUntilExpiry: number | null = null;
      let isExpiringSoon = false;

      if (s.end_date && s.status === 'active') {
        const expiry = new Date(s.end_date + 'T00:00:00');
        daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
        isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
      }

      return { ...s, isExpiringSoon, daysUntilExpiry };
    });
  }, [rawServices]);

  const expiringCount = useMemo(
    () => services.filter((s) => s.isExpiringSoon).length,
    [services]
  );

  const createService = useCallback(async (data: CreateServiceInput): Promise<Service | null> => {
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('services')
        .insert({
          family_id: familyId,
          child_id: data.child_id,
          service_type: data.service_type,
          provider_id: data.provider_id ?? null,
          funding_source: data.funding_source ?? null,
          authorized_hours: data.authorized_hours ?? null,
          frequency: data.frequency ?? null,
          start_date: data.start_date ?? null,
          end_date: data.end_date ?? null,
          authorization_number: data.authorization_number ?? null,
          status: data.status ?? 'active',
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const service = created as Service;
      setRawServices((prev) => [service, ...prev]);
      return service;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

  const updateService = useCallback(async (id: string, data: Partial<Service>) => {
    setError(null);
    setRawServices((prev) => prev.map((s) => (s.id === id ? { ...s, ...data } : s)));
    try {
      const { error: dbError } = await supabase.from('services').update(data).eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchServices();
    }
  }, [fetchServices]);

  const deleteService = useCallback(async (id: string) => {
    setError(null);
    setRawServices((prev) => prev.filter((s) => s.id !== id));
    try {
      const { error: dbError } = await supabase.from('services').delete().eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchServices();
    }
  }, [fetchServices]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchServices();
    setLoading(false);
  }, [fetchServices]);

  return { services, loading, error, expiringCount, createService, updateService, deleteService, refetch };
}
