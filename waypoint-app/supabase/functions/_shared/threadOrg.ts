/**
 * Which organization a synced Gmail reply belongs to.
 *
 * A reply carries no organization of its own — Gmail only knows a From
 * address — so it takes the label of the message that STARTED the thread:
 * the letter or tracked email the family filed under School, Regional Center,
 * and so on. Until 2026-10 every synced reply was stamped 'regional_center',
 * which put "Regional Center" on a provider's reply to a School letter.
 *
 * The founder, not the newest message: until the same fix, a reply sent from
 * the paper trail was ALSO stamped 'regional_center', as an outgoing row. On
 * any thread the family answered, the newest outgoing row is one of those —
 * "newest wins" would copy the bad label onto every later reply. A founder is
 * never such a row: the paper-trail composer only ever replies on an existing
 * thread.
 *
 * Incoming rows never count (their label was stamped, not chosen). An
 * unlabelled founder gives null rather than falling through to a later row,
 * because the next outgoing row on such a thread is exactly the kind of
 * stamped reply above. Unlabelled is honest; wrong is not.
 *
 * Migration 063 applies the same rule to rows written before the fix.
 *
 * Plain TypeScript with no Deno APIs, so vitest loads it directly
 * (src/lib/threadOrg.test.ts).
 */

export interface ThreadRow {
  direction: string | null;
  organization: string | null;
  sent_at?: string | null;
  occurred_at?: string | null;
}

/** The organization of the thread's founding (earliest outgoing) row, or null. */
export function threadOrganization(rows: ThreadRow[]): string | null {
  let founder: { at: string; org: string | null } | null = null;
  for (const r of rows) {
    if (r.direction !== 'outgoing') continue;
    // occurred_at is NOT NULL, so an undated row should not exist; it never founds.
    const at = r.sent_at ?? r.occurred_at ?? '\uffff';
    if (!founder || at < founder.at) founder = { at, org: r.organization || null };
  }
  return founder?.org ?? null;
}
