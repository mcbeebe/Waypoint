/**
 * Provider Portal hook — profile management, family connections, messaging
 * Phase 7: Sprints S53-S58
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type {
  ProviderProfile,
  ProviderFamilyConnection,
  ProviderMessage,
  ProviderType,
  ConnectionStatus,
} from '@/types/database';

// ─── useProviderProfile ─────────────────────────────────────────────────────

export function useProviderProfile() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error: dbError } = await supabase
        .from('provider_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (dbError) throw new Error(dbError.message);
      setProfile(data as ProviderProfile | null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchProfile().finally(() => setLoading(false));
  }, [fetchProfile]);

  const createProfile = useCallback(async (data: {
    name: string;
    provider_type: ProviderType;
    specialty?: string;
    organization?: string;
    npi_number?: string;
    credentials?: string;
    phone?: string;
    email?: string;
    address?: string;
    bio?: string;
    insurance_accepted?: string[];
  }): Promise<ProviderProfile | null> => {
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('provider_profiles')
        .insert({ user_id: user.id, ...data })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const p = created as ProviderProfile;
      setProfile(p);
      return p;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<ProviderProfile>) => {
    if (!profile) return;
    setProfile((prev) => prev ? { ...prev, ...data } : null);
    try {
      const { error: dbError } = await supabase
        .from('provider_profiles')
        .update(data)
        .eq('id', profile.id);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchProfile();
    }
  }, [profile, fetchProfile]);

  return { profile, loading, error, createProfile, updateProfile, refetch: fetchProfile };
}

// ─── useProviderConnections ─────────────────────────────────────────────────

export function useProviderConnections(profileId: string | undefined) {
  const [connections, setConnections] = useState<ProviderFamilyConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!profileId) return;
    try {
      const { data, error: dbError } = await supabase
        .from('provider_family_connections')
        .select('*')
        .eq('provider_profile_id', profileId)
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);
      setConnections((data as ProviderFamilyConnection[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [profileId]);

  useEffect(() => {
    setLoading(true);
    fetchConnections().finally(() => setLoading(false));
  }, [fetchConnections]);

  const requestConnection = useCallback(async (familyId: string): Promise<ProviderFamilyConnection | null> => {
    if (!profileId) return null;
    setError(null);
    try {
      const { data: created, error: dbError } = await supabase
        .from('provider_family_connections')
        .insert({
          provider_profile_id: profileId,
          family_id: familyId,
          requested_by: 'provider',
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const conn = created as ProviderFamilyConnection;
      setConnections((prev) => [conn, ...prev]);
      return conn;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [profileId]);

  const updateConnectionStatus = useCallback(async (connectionId: string, status: ConnectionStatus) => {
    setConnections((prev) => prev.map((c) => (c.id === connectionId ? { ...c, status, responded_at: new Date().toISOString() } : c)));
    try {
      const { error: dbError } = await supabase
        .from('provider_family_connections')
        .update({ status, responded_at: new Date().toISOString() })
        .eq('id', connectionId);
      if (dbError) throw new Error(dbError.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      fetchConnections();
    }
  }, [fetchConnections]);

  return { connections, loading, error, requestConnection, updateConnectionStatus, refetch: fetchConnections };
}

// ─── useProviderMessages ────────────────────────────────────────────────────

export function useProviderMessages(connectionId: string | undefined) {
  const [messages, setMessages] = useState<ProviderMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMessages = useCallback(async () => {
    if (!connectionId) return;
    try {
      const { data, error: dbError } = await supabase
        .from('provider_messages')
        .select('*')
        .eq('connection_id', connectionId)
        .order('created_at', { ascending: true });

      if (dbError) throw new Error(dbError.message);
      setMessages((data as ProviderMessage[]) ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [connectionId]);

  useEffect(() => {
    setLoading(true);
    fetchMessages().finally(() => setLoading(false));
  }, [fetchMessages]);

  const sendMessage = useCallback(async (body: string, senderType: 'provider' | 'family'): Promise<ProviderMessage | null> => {
    if (!connectionId) return null;
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: created, error: dbError } = await supabase
        .from('provider_messages')
        .insert({
          connection_id: connectionId,
          sender_type: senderType,
          sender_id: user.id,
          body,
        })
        .select()
        .single();

      if (dbError) throw new Error(dbError.message);
      const msg = created as ProviderMessage;
      setMessages((prev) => [...prev, msg]);
      return msg;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    }
  }, [connectionId]);

  return { messages, loading, error, sendMessage, refetch: fetchMessages };
}

// ─── useProviderDirectory ───────────────────────────────────────────────────

interface DirectoryFilters {
  providerType?: ProviderType;
  specialty?: string;
  acceptsInsurance?: string;
  isAcceptingPatients?: boolean;
}

export function useProviderDirectory(filters: DirectoryFilters = {}) {
  const [providers, setProviders] = useState<ProviderProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    try {
      let query = supabase
        .from('provider_profiles')
        .select('*')
        .order('name', { ascending: true });

      if (filters.providerType) query = query.eq('provider_type', filters.providerType);
      if (filters.isAcceptingPatients !== undefined) query = query.eq('is_accepting_patients', filters.isAcceptingPatients);
      if (filters.acceptsInsurance) query = query.contains('insurance_accepted', [filters.acceptsInsurance]);

      const { data, error: dbError } = await query;
      if (dbError) throw new Error(dbError.message);

      let results = (data as ProviderProfile[]) ?? [];
      if (filters.specialty) {
        const lower = filters.specialty.toLowerCase();
        results = results.filter((p) => p.specialty?.toLowerCase().includes(lower));
      }
      setProviders(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [filters.providerType, filters.specialty, filters.acceptsInsurance, filters.isAcceptingPatients]);

  useEffect(() => {
    setLoading(true);
    fetchProviders().finally(() => setLoading(false));
  }, [fetchProviders]);

  return { providers, loading, error, refetch: fetchProviders };
}
