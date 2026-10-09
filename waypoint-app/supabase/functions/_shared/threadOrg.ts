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
 * Incoming rows never count while the thread has an outgoing row (their
 * label was stamped, not chosen). An unlabelled founder gives null rather
 * than falling through to a later row, because the next outgoing row on such
 * a thread is exactly the kind of stamped reply above. Unlabelled is honest;
 * wrong is not.
 *
 * The one exception: a thread with NO outgoing row at all. Before initiative
 * 014 no such thread was ever followed, so none carries a stamped label; now
 * the family can add a thread the agency started (PR D), and its rows carry
 * the label the family picked when adding it. Its earliest row founds it.
 *
 *
 * Plain TypeScript with no Deno APIs, so vitest loads it directly
 * (src/lib/threadOrg.test.ts).
 */

export interface ThreadRow {
  id?: string | null;
  direction: string | null;
  organization: string | null;
  created_at?: string | null;
  occurred_at?: string | null;
}

/**
 * The organization of the thread's founding outgoing row — or, on a thread
 * with none, its earliest row — or null.
 *
 * "Founding" is by INSERTION order (created_at, then id), never by sent_at:
 * "Mark as sent" rewrites sent_at on a draft long after a later reply was
 * written, which would hand the thread to that reply. Migration 063 orders
 * the same way.
 */
export function threadOrganization(rows: ThreadRow[]): string | null {
  const outgoing = rows.filter((r) => r.direction === 'outgoing');
  let founder: { key: string; org: string | null } | null = null;
  for (const r of outgoing.length > 0 ? outgoing : rows) {
    // created_at is NOT NULL; an undated row should not exist and never founds.
    const key = `${r.created_at ?? r.occurred_at ?? '\uffff'}|${r.id ?? ''}`;
    if (!founder || key < founder.key) founder = { key, org: r.organization || null };
  }
  return founder?.org ?? null;
}
