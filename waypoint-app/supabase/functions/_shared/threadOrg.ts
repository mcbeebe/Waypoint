/**
 * Which organization a synced Gmail reply belongs to.
 *
 * A reply carries no organization of its own — Gmail only knows a From
 * address — so it takes the label the family gave their own message on the
 * same thread. Until 2026-10 every synced reply was stamped
 * 'regional_center', which put "Regional Center" on a provider's reply to a
 * letter the family had filed under School.
 *
 * Only OUTGOING rows count: incoming rows written before this fix carry the
 * old hard-coded value, which says nothing about the thread. With no labelled
 * outgoing row the answer is null — an unlabelled entry is honest, a wrong
 * one is not.
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

/** The newest labelled outgoing row's organization, or null. */
export function threadOrganization(rows: ThreadRow[]): string | null {
  let best: { at: string; org: string } | null = null;
  for (const r of rows) {
    if (r.direction !== 'outgoing' || !r.organization) continue;
    const at = r.sent_at ?? r.occurred_at ?? '';
    if (!best || at > best.at) best = { at, org: r.organization };
  }
  return best?.org ?? null;
}
