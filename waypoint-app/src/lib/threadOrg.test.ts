/**
 * The Edge Functions label each synced reply from its thread
 * (supabase/functions/_shared/threadOrg.ts). Deno code has no CI of its own,
 * so the pure rule is pinned here.
 */
import { describe, it, expect } from 'vitest';
import { threadOrganization } from '../../supabase/functions/_shared/threadOrg';

describe('threadOrganization', () => {
  it("takes the family's own label for the thread, not a hard-coded agency", () => {
    // The 2026-10-08 report: a letter filed under School, answered by a provider.
    expect(
      threadOrganization([
        { direction: 'outgoing', organization: 'school', created_at: '2026-10-08T03:12:53Z' },
        { direction: 'incoming', organization: 'regional_center', occurred_at: '2026-10-08T17:01:09Z' },
      ])
    ).toBe('school');
  });

  it('the founding letter wins over a later reply stamped by the old send path', () => {
    // Before the fix, a reply sent from the paper trail was an OUTGOING row
    // hard-coded 'regional_center' — always newer than the founder.
    expect(
      threadOrganization([
        { direction: 'outgoing', organization: 'regional_center', created_at: '2026-10-03T00:00:00Z' },
        { direction: 'outgoing', organization: 'school', created_at: '2026-10-01T00:00:00Z' },
      ])
    ).toBe('school');
  });

  it('an unlabelled founder is null — it never falls through to a stamped later row', () => {
    expect(
      threadOrganization([
        { direction: 'outgoing', organization: null, created_at: '2026-10-01T00:00:00Z' },
        { direction: 'outgoing', organization: 'regional_center', created_at: '2026-10-05T00:00:00Z' },
      ])
    ).toBeNull();
  });

  it('founds by insertion order — "Mark as sent" moving sent_at cannot hand the thread over', () => {
    // A Gmail-drafts letter marked sent AFTER a reply was written: its sent_at
    // is later, but it was inserted first, so it is still the founder.
    expect(
      threadOrganization([
        { id: 'p', direction: 'outgoing', organization: 'regional_center', created_at: '2026-10-03T00:00:00Z' },
        { id: 'r', direction: 'outgoing', organization: 'school', created_at: '2026-10-01T00:00:00Z' },
      ])
    ).toBe('school');
  });

  it('breaks an insertion-time tie by id, like the migration', () => {
    const at = '2026-10-01T00:00:00Z';
    const rows = [
      { id: 'b', direction: 'outgoing', organization: 'medical', created_at: at },
      { id: 'a', direction: 'outgoing', organization: 'insurance', created_at: at },
    ];
    expect(threadOrganization(rows)).toBe('insurance');
    expect(threadOrganization([...rows].reverse())).toBe('insurance');
  });

  it('ignores incoming rows, and an empty thread is null', () => {
    expect(threadOrganization([{ direction: 'incoming', organization: 'regional_center' }])).toBeNull();
    expect(threadOrganization([])).toBeNull();
  });
});
