/**
 * The decisions the two family-state hooks make, as pure functions.
 *
 * `useDeferrals` and `useToolPins` both do the same awkward dance: read from a
 * table that may not exist yet (migrations here are applied by hand), fall
 * back to the device, write optimistically, and reconcile the two stores the
 * first time the database answers. Every one of the eighteen defects the pin
 * review found lived in that dance, and none of it was testable while it sat
 * inside a hook — the suite is node-only, so a hook that imports supabase
 * cannot even be imported.
 *
 * So the decisions live here and the hooks do the I/O. What store did we get?
 * What survives reconciliation? What does a failed write mean? Those are
 * answered by functions with no imports.
 */

/** Which store the state actually came from — the app says this out loud. */
export type Backend = 'family' | 'device';

/**
 * True when a Postgres/PostgREST error means "this migration is not applied",
 * as opposed to a permission or network failure. The distinction matters: a
 * missing table is a reason to fall back for the session, and an RLS denial
 * is a reason to tell the family the write did not happen.
 *
 * Matches both shapes PostgREST produces (42703 "column X does not exist",
 * PGRST204/205 "Could not find … in the schema cache"), and cannot match an
 * RLS or network error, which never name the object.
 */
export function isMissingSchema(message: string | undefined, object: string): boolean {
  if (!message) return false;
  return (
    message.includes(object) &&
    /does not exist|schema cache|could not find/i.test(message)
  );
}

export interface ReconcileInput<T> {
  /** Rows the table returned, keyed by id. Null when the read failed. */
  remote: Record<string, T> | null;
  /** What this device has stored. */
  local: Record<string, T>;
  /** True when the table itself is not there yet. */
  schemaMissing: boolean;
}

export interface ReconcileResult<T> {
  rows: Record<string, T>;
  backend: Backend;
  /**
   * Local rows to push up, because the table exists now and this device set
   * them aside before it did. Without this they vanish the first time the
   * read succeeds — silently, all at once.
   */
  hoist: Record<string, T>;
  /** True once the device copy has been superseded and can be cleared. */
  clearLocal: boolean;
}

/**
 * What the state should be after a read.
 *
 * The rule that matters: **a failed read is not proof of an empty list.** It
 * falls back to the device copy and reports `device`, so the UI cannot claim
 * a family-wide list it was unable to load.
 */
export function reconcile<T>(input: ReconcileInput<T>): ReconcileResult<T> {
  if (input.remote === null) {
    return {
      rows: input.local,
      backend: 'device',
      hoist: {},
      clearLocal: false,
    };
  }
  const rows = { ...input.remote };
  const hoist: Record<string, T> = {};
  for (const [id, value] of Object.entries(input.local)) {
    if (id in rows) continue;
    hoist[id] = value;
    rows[id] = value;
  }
  return {
    rows,
    backend: 'family',
    hoist,
    clearLocal: Object.keys(input.local).length > 0,
  };
}

/** Where a write landed, and what the family should be told about it. */
export type WriteResult =
  /** Saved to the family's row. */
  | { kind: 'family' }
  /** Saved to this device only — the UI says so. */
  | { kind: 'device' }
  /**
   * Saved nowhere. The optimistic update must be reverted and the family
   * told, or the screen shows a change that will not survive the session.
   */
  | { kind: 'failed' };

export interface WriteAttempt {
  /** Null when no write to the table was attempted at all. */
  remoteError: string | null;
  remoteAttempted: boolean;
  localSaved: boolean;
  /** The object name the missing-schema check looks for. */
  object: string;
}

/**
 * Classify a write. `schemaMissing` tells the caller to stop trying the table
 * for the rest of the session; the result tells it what to show.
 */
export function classifyWrite(attempt: WriteAttempt): {
  result: WriteResult;
  schemaMissing: boolean;
} {
  if (attempt.remoteAttempted && attempt.remoteError === null) {
    return { result: { kind: 'family' }, schemaMissing: false };
  }
  const schemaMissing =
    attempt.remoteAttempted && isMissingSchema(attempt.remoteError ?? undefined, attempt.object);
  return {
    result: attempt.localSaved ? { kind: 'device' } : { kind: 'failed' },
    schemaMissing,
  };
}

/**
 * Set-aside rows whose day has arrived are back on Home; they are not
 * "later" any more. The device fallback applies no date filter of its own,
 * so this is what keeps an expired skip from being listed for weeks.
 */
export function activeUntil<T extends { returnsOn: string }>(
  rows: Record<string, T>,
  today: string
): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [id, value] of Object.entries(rows)) {
    if (value.returnsOn > today) out[id] = value;
  }
  return out;
}
