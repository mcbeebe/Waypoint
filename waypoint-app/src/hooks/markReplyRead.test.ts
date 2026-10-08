/**
 * The read-state write (062). Its filters are the safety: only an incoming
 * row, and only the FIRST open — so a re-open never moves the time and an
 * outgoing letter can never be stamped.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as [string, ...unknown[]][],
  error: null as { message: string } | null,
  throws: false,
}));

vi.mock('@/lib/supabase', () => {
  const chain: any = {
    update: (v: unknown) => (h.calls.push(['update', v]), chain),
    eq: (c: string, v: unknown) => (h.calls.push(['eq', c, v]), chain),
    is: (c: string, v: unknown) => (h.calls.push(['is', c, v]), chain),
    then: (resolve: (v: unknown) => unknown) => Promise.resolve({ error: h.error }).then(resolve),
  };
  return {
    supabase: {
      from: (t: string) => {
        if (h.throws) throw new Error('offline');
        h.calls.push(['from', t]);
        return chain;
      },
    },
  };
});

import { markReplyRead } from './useCommunications';

beforeEach(() => {
  h.calls = [];
  h.error = null;
  h.throws = false;
});

describe('markReplyRead', () => {
  it('stamps read_at on that incoming row only, and only if it was unread', async () => {
    expect(await markReplyRead('r1')).toBe(true);
    expect(h.calls[0]).toEqual(['from', 'communications']);
    const update = h.calls.find((c) => c[0] === 'update')![1] as { read_at: string };
    expect(Object.keys(update)).toEqual(['read_at']);
    expect(Number.isNaN(Date.parse(update.read_at))).toBe(false);
    expect(h.calls).toContainEqual(['eq', 'id', 'r1']);
    expect(h.calls).toContainEqual(['eq', 'direction', 'incoming']);
    expect(h.calls).toContainEqual(['is', 'read_at', null]);
  });

  it('reports a failed write — e.g. 062 not applied — without throwing', async () => {
    h.error = { message: 'column "read_at" of relation "communications" does not exist' };
    expect(await markReplyRead('r1')).toBe(false);
    h.throws = true;
    expect(await markReplyRead('r1')).toBe(false);
  });
});
