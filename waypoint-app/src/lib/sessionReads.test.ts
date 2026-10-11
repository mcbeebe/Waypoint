/**
 * This session's opens (062) and "Nothing to answer" choices (065), overlaid
 * on every fetch so a refetch racing a write cannot undo it on screen.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  noteSessionRead,
  forgetSessionRead,
  noteSessionSettle,
  forgetSessionSettle,
  withSessionReads,
  resetSessionReads,
} from './sessionReads';
import type { Communication } from '@/hooks/useCommunications';

const row = (over: Partial<Communication>) =>
  ({ id: 'r1', direction: 'incoming', read_at: null, settled_at: null, ...over }) as Communication;

beforeEach(() => resetSessionReads());

describe('withSessionReads', () => {
  it('a settle in flight survives a refetch that read the row before the write landed', () => {
    noteSessionSettle('r1', '2026-10-11T07:00:00Z');
    expect(withSessionReads([row({})])[0].settled_at).toBe('2026-10-11T07:00:00Z');
  });

  it('"needs an answer after all" survives too, and a failed write is forgotten', () => {
    noteSessionSettle('r1', null);
    expect(withSessionReads([row({ settled_at: '2026-10-10T00:00:00Z' })])[0].settled_at).toBeNull();
    forgetSessionSettle('r1');
    expect(withSessionReads([row({ settled_at: '2026-10-10T00:00:00Z' })])[0].settled_at).toBe('2026-10-10T00:00:00Z');
  });

  it('a database without 065 gets no settled_at key from the overlay', () => {
    noteSessionSettle('r1', '2026-10-11T07:00:00Z');
    const { settled_at: _s, ...pre065 } = row({});
    expect('settled_at' in withSessionReads([pre065 as Communication])[0]).toBe(false);
  });

  it('opens still overlay as before, and sign-out clears both', () => {
    noteSessionRead('r1', '2026-10-11T06:00:00Z');
    noteSessionSettle('r1', '2026-10-11T07:00:00Z');
    expect(withSessionReads([row({})])[0]).toMatchObject({ read_at: '2026-10-11T06:00:00Z', settled_at: '2026-10-11T07:00:00Z' });
    forgetSessionRead('r1');
    resetSessionReads();
    expect(withSessionReads([row({})])[0]).toMatchObject({ read_at: null, settled_at: null });
  });
});
