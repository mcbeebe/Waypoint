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
  if (opened.size === 0) return rows;
  return rows.map((c) => {
    const at = opened.get(c.id);
    return at && 'read_at' in c && c.read_at == null ? { ...c, read_at: at } : c;
  });
}

/** Clear on sign-out (and between tests). */
export function resetSessionReads(): void {
  opened.clear();
}
