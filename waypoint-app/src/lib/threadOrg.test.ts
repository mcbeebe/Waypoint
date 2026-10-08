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
        { direction: 'outgoing', organization: 'school', occurred_at: '2026-10-08T03:12:53Z' },
        { direction: 'incoming', organization: 'regional_center', occurred_at: '2026-10-08T17:01:09Z' },
      ])
    ).toBe('school');
  });

  it('ignores incoming rows — their label was stamped, not chosen', () => {
    expect(
      threadOrganization([{ direction: 'incoming', organization: 'regional_center' }])
    ).toBeNull();
  });

  it('the newest labelled outgoing row wins, by send time over log time', () => {
    expect(
      threadOrganization([
        { direction: 'outgoing', organization: 'school', sent_at: '2026-10-01T00:00:00Z', occurred_at: '2026-10-09T00:00:00Z' },
        { direction: 'outgoing', organization: 'insurance', sent_at: '2026-10-05T00:00:00Z' },
      ])
    ).toBe('insurance');
  });

  it('skips an unlabelled outgoing row rather than returning null over a labelled one', () => {
    expect(
      threadOrganization([
        { direction: 'outgoing', organization: 'medical', occurred_at: '2026-10-01T00:00:00Z' },
        { direction: 'outgoing', organization: null, occurred_at: '2026-10-05T00:00:00Z' },
      ])
    ).toBe('medical');
  });

  it('an empty or unlabelled thread is null', () => {
    expect(threadOrganization([])).toBeNull();
    expect(threadOrganization([{ direction: 'outgoing', organization: null }])).toBeNull();
  });
});
