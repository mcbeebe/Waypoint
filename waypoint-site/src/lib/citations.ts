/**
 * Citation chip ↔ sources[] matching (STYLE-GUIDE §3).
 *
 * The style guide has always said a chip "renders as a link to that URL", but
 * Cite.astro shipped as a bare <span> and nothing rendered sources[] at all —
 * so every statute URL on the site was schema-validated, link-rot-checked, and
 * invisible to the reader it exists for.
 *
 * These helpers are the pairing rule, kept pure so the build-time transform,
 * the Sources list, and the guard script all agree on what "matching" means.
 * A chip with no match stays plain text, the way the app's Citation component
 * degrades on a citation the provenance registry doesn't cover: never a dead
 * link, never a promise of a receipt we cannot produce.
 */

export interface SourceEntry {
  label: string;
  url: string;
  accessed: Date | string;
}

/**
 * The citation at the head of a sources[] label, dropping the parenthetical
 * gloss: `WIC §4643 (assessment within 120 days)` → `WIC §4643`.
 *
 * Labels that are not statutes (`DDS — Family Fee Programs Ended`) fall
 * through harmlessly; they simply never match a chip.
 */
export function leadCitation(label: string): string {
  return label.split(/\s+\(|\s+[—–]\s+/)[0].trim();
}

/**
 * Comparison key for a chip or a lead citation, normalising the three ways the
 * same authority is spelled across prose and frontmatter:
 *
 * - `et seq.` — a `WIC §4500 et seq.` chip names the same statute as a
 *   `WIC §4500` source.
 * - a `CA ` / `California ` prefix — labels say `CA Ed Code §56321` where the
 *   style guide's own chip format (§3) says `Ed Code §56321`. Left
 *   unnormalised this orphaned every Ed Code chip on the site's most
 *   statute-dense pages, which had the verified source sitting right there.
 * - a trailing subdivision — `WIC §4646(f)(1)` lives inside the section a
 *   `WIC §4646` source points at, so the receipt is the right one. A DECIMAL
 *   is never stripped: §4646.5 is a different section from §4646, not a part
 *   of it, and collapsing them would hand a parent the wrong statute.
 */
export function citeKey(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*et\s+seq\.?\s*$/i, '')
    .replace(/^(?:CA|California)\s+/i, '')
    .replace(/(§\s*\d+(?:\.\d+)*)(?:\([^)]*\))+\s*$/, '$1')
    .trim()
    .toLowerCase();
}

/** DOM id for a source entry, so a chip can link straight to its receipt. */
export function sourceAnchorId(text: string): string {
  const slug = citeKey(text)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `src-${slug}`;
}

/**
 * The sources[] entry backing a chip — or null when the page lists none, AND
 * null when it lists more than one that answers to the same key.
 *
 * The ambiguous case is not theoretical: several pages cite `DHCS — …` three
 * or four times, and every one of those labels reduces to `DHCS`. Taking the
 * first would hand a parent a confidently-wrong receipt, and would also mint
 * duplicate DOM ids. No link is the honest answer.
 */
export function findSource<T extends SourceEntry>(chip: string, sources: T[]): T | null {
  const key = citeKey(chip);
  const hits = sources.filter((s) => citeKey(leadCitation(s.label)) === key);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * Keys a page can safely anchor: those exactly one source answers to. The
 * Sources list ids only these, so a page can never render the same id twice.
 */
export function anchorableKeys(sources: SourceEntry[]): Set<string> {
  const counts = new Map<string, number>();
  for (const s of sources) {
    const k = citeKey(leadCitation(s.label));
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return new Set([...counts].filter(([, n]) => n === 1).map(([k]) => k));
}
