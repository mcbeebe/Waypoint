/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on — every assertion states
 * what must hold on ANY device clock.
 *
 * The instants are built from LOCAL parts on purpose: that keeps the expected
 * day one fixed string in both suites while the UTC text underneath differs,
 * which is what the old `.slice(0, 10)` got wrong. The late-evening case
 * fails it west of Greenwich, the after-midnight case east of it.
 *
 * They sit 30 minutes from midnight rather than at 06:00/18:00 so the pair
 * stays sensitive at ANY non-UTC offset; at 06:00/18:00 this file would go
 * quietly decorative if the tz projects were ever repointed nearer Greenwich.
 */
import { describe, it, expect } from 'vitest';
import { formatThreadForDraft } from './replyInbox';
import type { Communication } from '@/hooks/useCommunications';

function comm(over: Partial<Communication>): Communication {
  return {
    id: Math.random().toString(36).slice(2),
    family_id: 'fam',
    child_id: null,
    kind: 'email',
    direction: 'outgoing',
    contact: null,
    organization: 'regional_center',
    subject: 'Subject',
    body: 'Body',
    template_key: null,
    status: 'sent',
    sent_at: '2026-08-26T10:00:00Z',
    occurred_at: '2026-08-26T10:00:00Z',
    gmail_thread_id: 't1',
    gmail_message_id: null,
    created_at: '2026-08-26T10:00:00Z',
    ...over,
  } as Communication;
}

describe('formatThreadForDraft', () => {
  it('dates a late-evening message on the day the parent sent it', () => {
    // 23:30 local is already tomorrow in UTC west of Greenwich, so the draft
    // context told the model the parent wrote on the 2nd.
    const evening = new Date(2026, 7, 1, 23, 30, 0).toISOString();
    const text = formatThreadForDraft([comm({ sent_at: evening })]);
    expect(text).toContain('· 2026-08-01 ---');
  });

  it('dates an after-midnight message on the day the parent sent it', () => {
    // 00:30 local is still yesterday in UTC east of Greenwich — the same bug
    // pointing the other way.
    const morning = new Date(2026, 7, 1, 0, 30, 0).toISOString();
    const text = formatThreadForDraft([comm({ sent_at: morning })]);
    expect(text).toContain('· 2026-08-01 ---');
  });

  it('falls back to occurred_at when the message was never marked sent', () => {
    const evening = new Date(2026, 7, 1, 23, 30, 0).toISOString();
    const text = formatThreadForDraft([comm({ sent_at: null, occurred_at: evening })]);
    expect(text).toContain('· 2026-08-01 ---');
  });

  it('labels who wrote each entry and keeps the thread order', () => {
    const day = new Date(2026, 7, 1, 12, 0, 0).toISOString();
    const text = formatThreadForDraft([
      comm({ direction: 'incoming', contact: 'Lilia Talavera <lilia@rceb.org>', sent_at: day }),
      comm({ direction: 'outgoing', sent_at: day }),
    ]);
    expect(text.indexOf('FROM Lilia Talavera <lilia@rceb.org>')).toBeLessThan(
      text.indexOf('FROM the parent')
    );
  });

  it('names the agency generically when the contact is missing', () => {
    const text = formatThreadForDraft([comm({ direction: 'incoming', contact: null })]);
    expect(text).toContain('FROM the agency');
  });

  it('renders an empty body as empty rather than "null"', () => {
    const text = formatThreadForDraft([comm({ body: null, subject: 'Records request' })]);
    expect(text).toContain('Records request');
    expect(text).not.toContain('null');
  });

  it('shows the raw value rather than NaN if a timestamp will not parse', () => {
    const text = formatThreadForDraft([comm({ sent_at: 'not-a-timestamp' })]);
    expect(text).toContain('· not-a-time ---');
    expect(text).not.toContain('NaN');
  });

  it('says "undated" rather than 1969 when both timestamps are missing', () => {
    // `occurred_at` is NOT NULL, so this is data that should not exist — but
    // `new Date(null)` is the EPOCH, not an Invalid Date, so an unguarded
    // parse would state a confident wrong date in a prompt that asks the
    // model to restate the dates it is given.
    const text = formatThreadForDraft([
      comm({ sent_at: null, occurred_at: null as unknown as string }),
    ]);
    expect(text).toContain('· undated ---');
    expect(text).not.toContain('1969');
    expect(text).not.toContain('1970');
  });

  it('is empty for an empty thread', () => {
    expect(formatThreadForDraft([])).toBe('');
  });
});
