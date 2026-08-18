/**
 * Family memories (P2) — the AI's durable understanding of the family.
 *
 * extractMemoriesFromExchange() fires after each chat reply so the Navigator
 * learns facts, preferences, in-progress situations, and gaps. useMemories()
 * powers the Profile "What Waypoint knows" section — parents see and can
 * delete every memory (full control).
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

const EDGE_FN_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-proxy`;

export type MemoryKind = 'fact' | 'preference' | 'situation' | 'gap';

export interface FamilyMemory {
  id: string;
  family_id: string;
  kind: MemoryKind;
  content: string;
  source: 'chat' | 'behavior' | 'manual';
  archived: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Background memory extraction after a chat exchange. Fire-and-forget:
 * failures are silent — memory is enhancement, never a blocker.
 */
export async function extractMemoriesFromExchange(
  exchange: Array<{ role: string; content: string }>
): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch(EDGE_FN_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'extract-memories', exchange }),
    });
  } catch {
    // best-effort
  }
}

export function useMemories(familyId: string | undefined) {
  const [memories, setMemories] = useState<FamilyMemory[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!familyId) {
      setMemories([]);
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase
        .from('family_memories')
        .select('*')
        .eq('family_id', familyId)
        .eq('archived', false)
        .order('updated_at', { ascending: false })
        .limit(50);
      setMemories((data as FamilyMemory[]) ?? []);
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /** "Forget this" — hard delete, the parent's right */
  const forgetMemory = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error } = await supabase.from('family_memories').delete().eq('id', id);
      if (error) return false;
      setMemories((prev) => prev.filter((m) => m.id !== id));
      return true;
    } catch {
      return false;
    }
  }, []);

  const forgetAll = useCallback(async (): Promise<boolean> => {
    if (!familyId) return false;
    try {
      const { error } = await supabase.from('family_memories').delete().eq('family_id', familyId);
      if (error) return false;
      setMemories([]);
      return true;
    } catch {
      return false;
    }
  }, [familyId]);

  return { memories, loading, refetch, forgetMemory, forgetAll };
}
