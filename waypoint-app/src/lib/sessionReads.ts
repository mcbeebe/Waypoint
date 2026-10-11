/**
 * Replies opened in THIS session, id → when (migration 062).
 *
 * Home and the paper trail each hold their own copy of the trail, so without
 * this a quick Back could beat the write: Home's refetch reads the row before
 * the UPDATE lands and the strip announces a reply the parent just read.
 * Every useCommunications instance overlays it on what it fetches.
 *
 * An entry is held only while its write is in flight or has landed — a
 * failed write removes it, so the reply shows as new again on the next
 * load — and sign-out clears it (lib/auth.ts), so a co-parent signing in on
 * the same device never inherits the last person's opens.
 */
import type { Communication } from '@/hooks/useCommunications';

const opened = new Map<string, string>();
/**
 * "Nothing to answer" choices made THIS session, id → settled_at (or null for
 * "needs an answer after all"), 065. Same race as opens: a refetch that reads
 * the row before the UPDATE lands must not put a settled reply back on Home.
 */
const settles = new Map<string, string | null>();

/** Remember a settle or unsettle, before its write lands. */
export function noteSessionSettle(id: string, at: string | null): void {
  settles.set(id, at);
}

/** Forget a settle whose write failed. */
export function forgetSessionSettle(id: string): void {
  settles.delete(id);
}

/** Remember an open, before its write lands. */
export function noteSessionRead(id: string, at: string): void {
  opened.set(id, at);
}

/** Forget an open whose write failed. */
export function forgetSessionRead(id: string): void {
  opened.delete(id);
}

export function hasSessionRead(id: string): boolean {
  return opened.has(id);
}

/** Overlay this session's opens onto fetched rows (pre-062 rows have no key and are left alone). */
export function withSessionReads(rows: Communication[]): Communication[] {
  if (opened.size === 0 && settles.size === 0) return rows;
  return rows.map((c) => {
    let row = c;
    const at = opened.get(c.id);
    if (at && 'read_at' in row && row.read_at == null) row = { ...row, read_at: at };
    if (settles.has(c.id) && 'settled_at' in row) row = { ...row, settled_at: settles.get(c.id) ?? null };
    return row;
  });
}

/** Clear on sign-out (and between tests). */
export function resetSessionReads(): void {
  opened.clear();
  settles.clear();
}
