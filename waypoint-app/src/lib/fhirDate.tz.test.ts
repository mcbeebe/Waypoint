/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on — every assertion states
 * what must hold on ANY device clock.
 *
 * The instants below are built from LOCAL parts on purpose. That keeps the
 * expected day one fixed string in both suites while the UTC text underneath
 * differs, which is exactly what the old `.split('T')[0]` got wrong: the
 * late-evening case fails it west of Greenwich, the after-midnight case east
 * of it.
 *
 * They sit 30 minutes from midnight rather than at 06:00/18:00 so the pair
 * stays sensitive at ANY non-UTC offset. At 06:00/18:00 they only disagree
 * with the naive slice beyond ±6 hours, which would quietly turn this whole
 * file decorative if the tz projects were ever repointed at, say, Berlin.
 */
import { describe, it, expect } from 'vitest';
import { fhirDisplayDay } from './fhirDate';

describe('fhirDisplayDay', () => {
  it('puts a late-evening instant on the day the family lived it', () => {
    // 23:30 local is already tomorrow in UTC anywhere west of Greenwich, so
    // the naive split dated an evening lab result to the following morning.
    const evening = new Date(2026, 7, 1, 23, 30, 0);
    expect(fhirDisplayDay(evening.toISOString())).toBe('2026-08-01');
  });

  it('puts an after-midnight instant on the day the family lived it', () => {
    // 00:30 local is still yesterday in UTC anywhere east of it — the same
    // bug pointing the other way.
    const morning = new Date(2026, 7, 1, 0, 30, 0);
    expect(fhirDisplayDay(morning.toISOString())).toBe('2026-08-01');
  });

  it('resolves an offset-bearing instant onto the local calendar', () => {
    // FHIR servers often send a zone offset rather than Z. Computed here from
    // Date's own local getters, so the expectation is derived independently of
    // the module under test and holds in either suite.
    const raw = '2026-08-01T18:30:00-07:00';
    const d = new Date(raw);
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    expect(fhirDisplayDay(raw)).toBe(expected);
  });

  it('passes a zone-free calendar day through untouched', () => {
    // `2026-08-01` names a day and no instant. Converting it would invent a
    // shift that the record never had.
    expect(fhirDisplayDay('2026-08-01')).toBe('2026-08-01');
  });

  it('keeps FHIR partial dates rather than inventing a day', () => {
    // The spec allows both. Feeding either to `new Date()` and formatting the
    // result would claim a precision the record does not have.
    expect(fhirDisplayDay('2026')).toBe('2026');
    expect(fhirDisplayDay('2026-08')).toBe('2026-08');
  });

  it('tolerates surrounding whitespace', () => {
    expect(fhirDisplayDay('  2026-08  ')).toBe('2026-08');
  });

  it('returns null for a missing or blank value, leaving the label to the caller', () => {
    expect(fhirDisplayDay(null)).toBeNull();
    expect(fhirDisplayDay(undefined)).toBeNull();
    expect(fhirDisplayDay('   ')).toBeNull();
  });

  it('shows the raw string rather than NaN when a value will not parse', () => {
    expect(fhirDisplayDay('not-a-date')).toBe('not-a-date');
  });

  it('will not roll a nonexistent day forward into a date the record lacks', () => {
    // `new Date('2026-02-30T10:00:00Z')` is March 2nd in V8. Showing a family
    // a day their record does not mention is worse than showing the odd day
    // it does — and it must agree with the bare `2026-02-30` form.
    expect(fhirDisplayDay('2026-02-30T10:00:00Z')).toBe('2026-02-30');
    expect(fhirDisplayDay('2026-02-30')).toBe('2026-02-30');
    expect(fhirDisplayDay('2026-13-01T00:00:00Z')).toBe('2026-13-01');
  });

  it('falls back to the stated day when the time is unusable', () => {
    // The day is real and the record states it plainly; only the clock part
    // is junk. The old split showed the day here, and so should we.
    expect(fhirDisplayDay('2026-08-01T25:00:00Z')).toBe('2026-08-01');
    expect(fhirDisplayDay('2026-08-01T')).toBe('2026-08-01');
  });
});
