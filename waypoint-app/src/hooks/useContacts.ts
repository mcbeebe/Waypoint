/**
 * Key contacts (D4) — the people around this family's case.
 * CRUD for Profile; read by Letters (auto-address), the Navigator email
 * modal (recipient chips), and the AI prompt (server-side).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export type ContactOrg = 'regional_center' | 'school' | 'insurance' | 'medical' | 'other';

export interface FamilyContact {
  id: string;
  family_id: string;
  name: string;
  role: string | null;
  organization: ContactOrg | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface ContactInput {
  name: string;
  role?: string;
  organization?: ContactOrg;
  email?: string;
  phone?: string;
  notes?: string;
}

export function useContacts(familyId: string | undefined) {
  const [contacts, setContacts] = useState<FamilyContact[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('family_contacts')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: true });
      setContacts((data as FamilyContact[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const addContact = useCallback(async (input: ContactInput): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const { data, error } = await supabase
        .from('family_contacts')
        .insert({
          family_id: familyId,
          name: input.name.trim(),
          role: input.role?.trim() || null,
          organization: input.organization ?? null,
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          notes: input.notes?.trim() || null,
        })
        .select()
        .single();
      if (error) return false;
      setContacts((prev) => [...prev, data as FamilyContact]);
      return true;
    } catch {
      return false;
    }
  }, [familyId]);

  const updateContact = useCallback(async (id: string, input: ContactInput): Promise<boolean> => {
    try {
      const patch = {
        name: input.name.trim(),
        role: input.role?.trim() || null,
        organization: input.organization ?? null,
        email: input.email?.trim() || null,
        phone: input.phone?.trim() || null,
        notes: input.notes?.trim() || null,
      };
      const { error } = await supabase.from('family_contacts').update(patch).eq('id', id);
      if (error) return false;
      setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
      return true;
    } catch {
      return false;
    }
  }, []);

  const deleteContact = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('family_contacts').delete().eq('id', id);
      if (error) return false;
      setContacts((prev) => prev.filter((c) => c.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  return { contacts, loading, refetch, addContact, updateContact, deleteContact };
}
