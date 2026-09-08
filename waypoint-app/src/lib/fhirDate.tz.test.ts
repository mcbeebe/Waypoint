/**
 * Runs in BOTH timezone projects (UTC+7 and America/Los_Angeles), so nothing
 * here may assume which side of Greenwich it is on — every assertion states
 * what must hold on ANY device clock.
 *
 * The instants below are built from LOCAL parts on purpose. That keeps the
 * expected day one fixed string in both suites while the UTC text underneath
 * differs, which is exactly what the old `.split('T')[0]` got wrong: the
 * evening case fails it west of Greenwich, the morning case east of it.
 */
import { describe, it, expect } from 'vitest';
import { fhirDisplayDay } from './fhirDate';

describe('fhirDisplayDay', () => {
  it('puts an evening instant on the day the family lived it', () => {
    // 6pm local. West of Greenwich that is already tomorrow in UTC, so the
    // naive split dated a 6pm-Pacific lab result to the following morning.
    const evening = new Date(2026, 7, 1, 18, 0, 0);
    expect(fhirDisplayDay(evening.toISOString())).toBe('2026-08-01');
  });

  it('puts an early-morning instant on the day the family lived it', () => {
    // 6am local. East of Greenwich that is still yesterday in UTC, so the
    // naive split dated the same record a day early.
    const morning = new Date(2026, 7, 1, 6, 0, 0);
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
});
