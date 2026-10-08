/**
 * The in-place draft revision is the only thing standing between a client
 * whose idea of "is this sent?" is wrong and a sent letter's record being
 * rewritten. So the guard lives in the query, and the query is what is
 * pinned here: every filter, and the three outcomes the caller tells apart.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const q = vi.hoisted(() => ({
  calls: [] as Array<[string, ...unknown[]]>,
  result: { data: [{ id: 'row-1' }] as unknown[] | null, error: null as unknown },
  throws: false,
}));

vi.mock('@/lib/supabase', () => {
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  for (const method of ['from', 'update', 'eq', 'is', 'select']) {
    builder[method] = (...args: unknown[]) => {
      if (q.throws) throw new Error('offline');
      q.calls.push([method, ...args]);
      return method === 'select' ? Promise.resolve(q.result) : builder;
    };
  }
  return { supabase: builder };
});

import { updateCommunicationDraft } from './useCommunications';

const FIELDS = { subject: 'Written recommendation', body: 'Hi Pat,', contact: 'Pat', organization: 'regional_center' as const };

beforeEach(() => {
  q.calls = [];
  q.result = { data: [{ id: 'row-1' }], error: null };
  q.throws = false;
});

describe('updateCommunicationDraft', () => {
  it('rewrites only a plain draft — never a sent row, never one tied to a Gmail thread', async () => {
    await updateCommunicationDraft('row-1', FIELDS);
    expect(q.calls).toContainEqual(['eq', 'id', 'row-1']);
    expect(q.calls).toContainEqual(['eq', 'status', 'draft']);
    expect(q.calls).toContainEqual(['is', 'gmail_thread_id', null]);
    expect(q.calls).toContainEqual([
      'update',
      { subject: 'Written recommendation', body: 'Hi Pat,', contact: 'Pat', organization: 'regional_center' },
    ]);
  });

  it('says whether the row was revised, or there was no draft to revise', async () => {
    expect(await updateCommunicationDraft('row-1', FIELDS)).toBe('updated');
    q.result = { data: [], error: null };
    expect(await updateCommunicationDraft('row-1', FIELDS)).toBe('not_draft');
  });

  it('keeps a failure apart from "no draft", so a blip is never read as licence to log a second row', async () => {
    q.result = { data: null, error: { message: 'timeout' } };
    expect(await updateCommunicationDraft('row-1', FIELDS)).toBe('error');
    q.throws = true;
    expect(await updateCommunicationDraft('row-1', FIELDS)).toBe('error');
  });
});
