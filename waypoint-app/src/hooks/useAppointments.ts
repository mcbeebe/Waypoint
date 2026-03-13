/**
 * Appointments hook — CRUD for calendar appointments
 * Uses existing `appointments` table from migration 001
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { Appointment, AppointmentType, AppointmentStatus } from '@/types/database';

interface UseAppointmentsOptions {
  familyId: string;
  dateRange?: { start: string; end: string };
}

interface CreateAppointmentInput {
  title: string;
  appointment_type?: AppointmentType;
  start_time: string;
  end_time?: string;
  child_id?: string;
  provider_id?: string;
  location?: string;
  notes?: string;
}

export function useAppointments(options: UseAppointmentsOptions) {
  const { familyId, dateRange } = options;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    try {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('family_id', familyId)
        .order('start_time', { ascending: true });

      if (dateRange) {
        query = query
          .gte('start_time', dateRange.start)
          .lte('start_time', dateRange.end);
      }

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);
      setAppointments((data as Appointment[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [familyId, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));
  }, [familyId, fetchAppointments]);

  const createAppointment = useCallback(async (data: CreateAppointmentInput): Promise<Appointment | null> => {
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('appointments')
        .insert({
          family_id: familyId,
          title: data.title,
          appointment_type: data.appointment_type ?? null,
          start_time: data.start_time,
          end_time: data.end_time ?? null,
          child_id: data.child_id ?? null,
          provider_id: data.provider_id ?? null,
          location: data.location ?? null,
          notes: data.notes ?? null,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const appointment = created as Appointment;
      setAppointments((prev) => [...prev, appointment].sort(
        (a, b) => a.start_time.localeCompare(b.start_time)
      ));
      return appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [familyId]);

  const updateAppointment = useCallback(async (id: string, data: Partial<Appointment>) => {
    setError(null);
    // Optimistic
    setAppointments((prev) => prev.map((a) => (a.id === id ? { ...a, ...data } : a)));
    try {
      const { error: dbError } = await supabase
        .from('appointments')
        .update(data)
        .eq('id', id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchAppointments(); // Revert on failure
    }
  }, [fetchAppointments]);

  const updateStatus = useCallback(async (id: string, status: AppointmentStatus) => {
    await updateAppointment(id, { status });
  }, [updateAppointment]);

  const refetch = useCallback(async () => {
    setLoading(true);
    await fetchAppointments();
    setLoading(false);
  }, [fetchAppointments]);

  return { appointments, loading, error, createAppointment, updateAppointment, updateStatus, refetch };
}
