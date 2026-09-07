import { describe, it, expect } from 'vitest';
import { expandOccurrences, findOverlaps, type RecurringSource } from './recurrence';

const baseAppt = (over: Partial<RecurringSource> = {}): RecurringSource => ({
  id: 'a1',
  start_time: '2026-08-03T16:00:00.000Z', // a Monday
  end_time: '2026-08-03T17:00:00.000Z',
  recurrence: null,
  recurrence_until: null,
  ...over,
});

/**
 * ISO instant at these LOCAL wall-clock components (month is 1-based).
 * Expansion reads the local calendar — day-of-month, occurrence-id date
 * keys, the until-date's local midnight — so any fixture those tests touch
 * must be built in local time: a UTC-fixed instant lands on a different
 * local day depending on the runner's ambient timezone.
 */
const localISO = (y: number, m: number, d: number, h = 0, min = 0) =>
  new Date(y, m - 1, d, h, min).toISOString();

/** The occurrence's LOCAL calendar day, for TZ-proof day assertions. */
const localDayOf = (iso: string) => {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

describe('expandOccurrences', () => {
  it('returns a non-recurring appointment only when in range', () => {
    const inRange = expandOccurrences(baseAppt(), '2026-08-02T00:00:00Z', '2026-08-08T23:59:59Z');
    expect(inRange).toHaveLength(1);
    expect(inRange[0].occurrenceId).toBe('a1');
    expect(inRange[0].isVirtual).toBe(false);

    const outOfRange = expandOccurrences(baseAppt(), '2026-08-10T00:00:00Z', '2026-08-16T23:59:59Z');
    expect(outOfRange).toHaveLength(0);
  });

  it('expands weekly occurrences into a later week, keeping duration', () => {
    const occ = expandOccurrences(
      baseAppt({ recurrence: 'weekly' }),
      '2026-08-16T00:00:00Z',
      '2026-08-22T23:59:59Z'
    );
    expect(occ).toHaveLength(1);
    expect(occ[0].start_time).toBe('2026-08-17T16:00:00.000Z');
    expect(occ[0].end_time).toBe('2026-08-17T17:00:00.000Z');
    expect(occ[0].isVirtual).toBe(true);
    expect(occ[0].sourceId).toBe('a1');
  });

  it('biweekly skips the off week', () => {
    const on = expandOccurrences(
      baseAppt({ recurrence: 'biweekly' }),
      '2026-08-16T00:00:00Z',
      '2026-08-22T23:59:59Z'
    );
    expect(on).toHaveLength(1); // Aug 17 is 14 days after Aug 3
    const off = expandOccurrences(
      baseAppt({ recurrence: 'biweekly' }),
      '2026-08-09T00:00:00Z',
      '2026-08-15T23:59:59Z'
    );
    expect(off).toHaveLength(0); // Aug 10 is the skipped week
  });

  it('respects recurrence_until (inclusive)', () => {
    // Local-time fixture: the until date closes at LOCAL 23:59:59, so a
    // UTC-fixed 16:00Z start slipped past it east of UTC+8.
    const occ = expandOccurrences(
      baseAppt({
        start_time: localISO(2026, 8, 3, 16, 0),
        end_time: localISO(2026, 8, 3, 17, 0),
        recurrence: 'weekly',
        recurrence_until: '2026-08-17',
      }),
      '2026-08-01T00:00:00Z',
      '2026-09-30T23:59:59Z'
    );
    expect(occ).toHaveLength(3); // Aug 3, 10, 17 — not 24
  });

  it('monthly keeps day-of-month and skips short months', () => {
    // "Day-of-month" means the LOCAL calendar day, so both the fixture and
    // the asserted days are read in local time — the UTC-fixed 18:00Z start
    // was already Feb 1 local east of UTC+6, and recurred on the 1st.
    const jan31 = baseAppt({
      start_time: localISO(2026, 1, 31, 18, 0),
      end_time: null,
      recurrence: 'monthly',
    });
    const occ = expandOccurrences(jan31, '2026-01-01T00:00:00Z', '2026-04-30T23:59:59Z');
    const days = occ.map((o) => localDayOf(o.start_time));
    expect(days).toEqual(['2026-01-31', '2026-03-31']); // no Feb — there is no Feb 31
  });

  it('virtual occurrences get date-suffixed ids; the base keeps its own', () => {
    // Local-time fixture: the id suffix is the occurrence's LOCAL date.
    const occ = expandOccurrences(
      baseAppt({
        start_time: localISO(2026, 8, 3, 16, 0),
        end_time: localISO(2026, 8, 3, 17, 0),
        recurrence: 'weekly',
      }),
      '2026-08-02T00:00:00Z',
      '2026-08-15T23:59:59Z'
    );
    expect(occ[0].occurrenceId).toBe('a1');
    expect(occ[1].occurrenceId).toMatch(/^a1::2026-08-10$/);
  });
});

describe('findOverlaps', () => {
  const events = [
    { title: 'Speech', start_time: '2026-08-03T16:00:00Z', end_time: '2026-08-03T17:00:00Z' },
    { title: 'OT', start_time: '2026-08-03T18:00:00Z', end_time: null }, // 60-min default
  ];

  it('detects a partial overlap', () => {
    const hits = findOverlaps(
      { start_time: '2026-08-03T16:30:00Z', end_time: '2026-08-03T17:30:00Z' },
      events
    );
    expect(hits.map((h) => h.title)).toEqual(['Speech']);
  });

  it('back-to-back is not an overlap', () => {
    const hits = findOverlaps(
      { start_time: '2026-08-03T17:00:00Z', end_time: '2026-08-03T18:00:00Z' },
      events
    );
    expect(hits).toHaveLength(0);
  });

  it('applies the default duration to open-ended events on both sides', () => {
    const hits = findOverlaps({ start_time: '2026-08-03T18:30:00Z' }, events);
    expect(hits.map((h) => h.title)).toEqual(['OT']);
  });

  it('finds nothing on a clear day', () => {
    expect(findOverlaps({ start_time: '2026-08-04T16:00:00Z' }, events)).toHaveLength(0);
  });
});
