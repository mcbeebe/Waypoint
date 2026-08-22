/**
 * Appointments hook — CRUD for calendar appointments
 * Uses existing `appointments` table from migration 001
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { friendlyErrorMessage } from '@/lib/netRetry';
import type { Appointment, AppointmentType, AppointmentStatus } from '@/types/database';

/**
 * Recurrence (migration 029) may not be applied against this project yet.
 * Without this guard a missing column fails EVERY appointment read and
 * write, which surfaces as a permanently empty calendar — so detect it
 * once and fall back to the pre-029 behaviour for the rest of the session.
 */
let recurrenceColumnAvailable = true;

export function isRecurrenceSupported(): boolean {
  return recurrenceColumnAvailable;
}

/** True (and latches the fallback) when an error is the missing column. */
export function noteIfRecurrenceMissing(message: string | undefined): boolean {
  if (!message) return false;
  const missing =
    /recurrence/i.test(message) && /does not exist|schema cache|could not find/i.test(message);
  if (missing) recurrenceColumnAvailable = false;
  return missing;
}

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
  /** Repeat rule (029) — the series is expanded client-side */
  recurrence?: 'weekly' | 'biweekly' | 'monthly';
  recurrence_until?: string;
}

export function useAppointments(options: UseAppointmentsOptions) {
  const { familyId, dateRange } = options;

  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAppointments = useCallback(async () => {
    const runQuery = (withRecurrence: boolean) => {
      let query = supabase
        .from('appointments')
        .select('*')
        .eq('family_id', familyId)
        .order('start_time', { ascending: true });

      if (dateRange) {
        if (withRecurrence) {
          // Recurring bases must load regardless of when their first
          // occurrence was — their virtual occurrences may fall in range
          query = query.or(
            `and(start_time.gte.${dateRange.start},start_time.lte.${dateRange.end}),recurrence.not.is.null`
          );
        } else {
          query = query.gte('start_time', dateRange.start).lte('start_time', dateRange.end);
        }
      }
      return query;
    };

    try {
      let { data, error: dbError } = await runQuery(recurrenceColumnAvailable);

      // Pre-029 database: retry without the recurrence filter so the
      // calendar still shows this week's appointments
      if (dbError && noteIfRecurrenceMissing(dbError.message)) {
        ({ data, error: dbError } = await runQuery(false));
      }

      if (dbError) throw new Error(dbError.message);
      setError(null);
      setAppointments((data as Appointment[]) ?? []);
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your appointments."));
    }
  }, [familyId, dateRange?.start, dateRange?.end]);

  useEffect(() => {
    if (!familyId) return;
    setLoading(true);
    fetchAppointments().finally(() => setLoading(false));
  }, [familyId, fetchAppointments]);

  const createAppointment = useCallback(async (data: CreateAppointmentInput): Promise<Appointment | null> => {
    setError(null);
    const baseRow = {
      family_id: familyId,
      title: data.title,
      appointment_type: data.appointment_type ?? null,
      start_time: data.start_time,
      end_time: data.end_time ?? null,
      child_id: data.child_id ?? null,
      provider_id: data.provider_id ?? null,
      location: data.location ?? null,
      notes: data.notes ?? null,
    };
    const insert = (withRecurrence: boolean) =>
      supabase
        .from('appointments')
        .insert(
          withRecurrence
            ? {
                ...baseRow,
                recurrence: data.recurrence ?? null,
                recurrence_until: data.recurrence_until ?? null,
              }
            : baseRow
        )
        .select()
        .single();

    try {
      let { data: created, error: dbError } = await insert(recurrenceColumnAvailable);

      // Pre-029 database: save the appointment without its repeat rule
      // rather than losing it entirely
      if (dbError && noteIfRecurrenceMissing(dbError.message)) {
        ({ data: created, error: dbError } = await insert(false));
      }

      if (dbError) throw new Error(dbError.message);
      const appointment = created as Appointment;
      setAppointments((prev) => [...prev, appointment].sort(
        (a, b) => a.start_time.localeCompare(b.start_time)
      ));
      return appointment;
    } catch (err) {
      setError(friendlyErrorMessage(err, "Couldn't load your appointments."));
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
      setError(friendlyErrorMessage(err, "Couldn't load your appointments."));
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
