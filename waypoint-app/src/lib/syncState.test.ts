import { describe, it, expect } from 'vitest';
import {
  activeUntil,
  classifyWrite,
  isMissingSchema,
  reconcile,
} from './syncState';

const row = (returnsOn: string, title: string | null = null) => ({ returnsOn, title });

describe('a missing migration is not the same as a denied write', () => {
  it('recognises both shapes PostgREST produces for a missing object', () => {
    expect(isMissingSchema('relation "public.home_deferrals" does not exist', 'home_deferrals')).toBe(true);
    expect(
      isMissingSchema("Could not find the 'tool_pins' column of 'families' in the schema cache", 'tool_pins')
    ).toBe(true);
  });

  it('never reads a permission failure as a missing table', () => {
    // This is the one that matters: an RLS denial classified as "not
    // migrated" would silently switch the app to device storage forever.
    expect(
      isMissingSchema(
        'new row violates row-level security policy for table "home_deferrals"',
        'home_deferrals'
      )
    ).toBe(false);
    expect(isMissingSchema('permission denied for table home_deferrals', 'home_deferrals')).toBe(false);
    expect(isMissingSchema('TypeError: Network request failed', 'home_deferrals')).toBe(false);
    expect(isMissingSchema(undefined, 'home_deferrals')).toBe(false);
  });

  it('does not match a different object with a similar error', () => {
    expect(isMissingSchema('relation "public.communications" does not exist', 'home_deferrals')).toBe(false);
  });
});

describe('a failed read is not proof of an empty list', () => {
  it('falls back to the device copy and says the scope is local', () => {
    const result = reconcile({
      remote: null,
      local: { a: row('2026-09-05') },
      schemaMissing: false,
    });
    expect(result.backend).toBe('device');
    expect(result.rows).toEqual({ a: row('2026-09-05') });
    // Nothing was superseded, so nothing may be cleared.
    expect(result.clearLocal).toBe(false);
  });

  it('does not invent an empty list when the device has nothing either', () => {
    const result = reconcile({ remote: null, local: {}, schemaMissing: true });
    expect(result.rows).toEqual({});
    expect(result.backend).toBe('device');
  });
});

describe('the day the migration lands, nothing silently disappears', () => {
  it('hoists device rows into the table rather than dropping them', () => {
    const result = reconcile({
      remote: { server: row('2026-09-10') },
      local: { phone: row('2026-09-05') },
      schemaMissing: false,
    });
    expect(result.backend).toBe('family');
    // Both survive; the device row is queued to be written up.
    expect(Object.keys(result.rows).sort()).toEqual(['phone', 'server']);
    expect(result.hoist).toEqual({ phone: row('2026-09-05') });
    expect(result.clearLocal).toBe(true);
  });

  it('lets the table win when both know the same item', () => {
    const result = reconcile({
      remote: { a: row('2026-09-10', 'from the table') },
      local: { a: row('2026-09-05', 'from the phone') },
      schemaMissing: false,
    });
    expect(result.rows.a.title).toBe('from the table');
    expect(result.hoist).toEqual({});
  });

  it('clears nothing when the device had nothing to give', () => {
    const result = reconcile({ remote: { a: row('2026-09-10') }, local: {}, schemaMissing: false });
    expect(result.clearLocal).toBe(false);
    expect(result.hoist).toEqual({});
  });
});

describe('a write that saved nowhere says so', () => {
  const attempt = (over: Partial<Parameters<typeof classifyWrite>[0]> = {}) =>
    classifyWrite({
      remoteAttempted: true,
      remoteError: null,
      localSaved: false,
      object: 'home_deferrals',
      ...over,
    });

  it('reports the family store on success', () => {
    expect(attempt().result).toEqual({ kind: 'family' });
  });

  it('reports the device when the table is not there yet', () => {
    const { result, schemaMissing } = attempt({
      remoteError: 'relation "public.home_deferrals" does not exist',
      localSaved: true,
    });
    expect(result).toEqual({ kind: 'device' });
    // Latching this stops the app retrying a table it knows is absent.
    expect(schemaMissing).toBe(true);
  });

  it('reports the device — not the family — after an RLS denial', () => {
    const { result, schemaMissing } = attempt({
      remoteError: 'new row violates row-level security policy',
      localSaved: true,
    });
    expect(result).toEqual({ kind: 'device' });
    // And it does NOT latch: the table exists, this write was refused.
    expect(schemaMissing).toBe(false);
  });

  it('reports failure when neither store took it', () => {
    // The optimistic update has to be reverted here. Reporting success was
    // the defect: a tile that appeared, survived the session, and vanished.
    expect(attempt({ remoteError: 'Network request failed', localSaved: false }).result).toEqual({
      kind: 'failed',
    });
  });

  it('reports the device when no table write was even attempted', () => {
    expect(attempt({ remoteAttempted: false, remoteError: null, localSaved: true }).result).toEqual({
      kind: 'device',
    });
  });

  it('reports failure when there was no table and no device write', () => {
    expect(attempt({ remoteAttempted: false, remoteError: null, localSaved: false }).result).toEqual({
      kind: 'failed',
    });
  });
});

describe('a set-aside item comes back on its day', () => {
  it('drops rows whose day has arrived or passed', () => {
    const rows = {
      past: row('2026-08-20'),
      today: row('2026-08-29'),
      future: row('2026-09-05'),
    };
    expect(Object.keys(activeUntil(rows, '2026-08-29'))).toEqual(['future']);
  });

  it('keeps nothing when everything has returned', () => {
    expect(activeUntil({ a: row('2026-01-01') }, '2026-08-29')).toEqual({});
  });
});
