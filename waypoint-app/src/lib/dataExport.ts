/**
 * Full family data export (quality thread — data portability).
 *
 * Pulls every family-scoped table into one JSON object the family owns.
 * Documents are exported as metadata only (the files themselves stay in
 * storage — they can be downloaded individually from Documents).
 */

import { Platform, Share } from 'react-native';
import { supabase } from './supabase';

export interface ExportResult {
  ok: boolean;
  error?: string;
}

/** Family-scoped tables exported wholesale, keyed by family_id. */
const FAMILY_TABLES = [
  'children',
  'actions',
  'appointments',
  'deadlines',
  'expenses',
  'documents',
  'communications',
  'family_memories',
  'family_contacts',
  'insurance_authorizations',
  'providers',
  'services',
  'chat_sessions',
] as const;

async function fetchTable(table: string, familyId: string): Promise<unknown[]> {
  try {
    const { data } = await supabase.from(table).select('*').eq('family_id', familyId);
    return data ?? [];
  } catch {
    // A table that doesn't exist yet (unapplied migration) shouldn't sink
    // the whole export
    return [];
  }
}

/** Assemble the complete export object. */
export async function buildFamilyExport(familyId: string): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = {
    app: 'Waypoint',
    format_version: 1,
    exported_at: new Date().toISOString(),
  };

  const { data: family } = await supabase.from('families').select('*').eq('id', familyId).maybeSingle();
  out.family = family ?? null;

  const results = await Promise.all(FAMILY_TABLES.map((t) => fetchTable(t, familyId)));
  FAMILY_TABLES.forEach((t, i) => { out[t] = results[i]; });

  // Child-scoped: diagnoses hang off children, not the family
  const childIds = ((out.children as Array<{ id: string }>) ?? []).map((c) => c.id);
  if (childIds.length > 0) {
    const { data: dx } = await supabase.from('diagnoses').select('*').in('child_id', childIds);
    out.diagnoses = dx ?? [];
  } else {
    out.diagnoses = [];
  }

  // Chat messages hang off sessions
  const sessionIds = ((out.chat_sessions as Array<{ id: string }>) ?? []).map((s) => s.id);
  if (sessionIds.length > 0) {
    const { data: msgs } = await supabase
      .from('chat_messages')
      .select('*')
      .in('session_id', sessionIds)
      .order('created_at', { ascending: true });
    out.chat_messages = msgs ?? [];
  } else {
    out.chat_messages = [];
  }

  return out;
}

/**
 * Export and deliver the data: a .json download on web, the native share
 * sheet elsewhere.
 */
export async function exportFamilyData(familyId: string): Promise<ExportResult> {
  try {
    const payload = await buildFamilyExport(familyId);
    const json = JSON.stringify(payload, null, 2);
    const filename = `waypoint-export-${new Date().toISOString().split('T')[0]}.json`;

    if (Platform.OS === 'web') {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return { ok: true };
    }

    await Share.share({ message: json, title: filename });
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Export failed' };
  }
}
