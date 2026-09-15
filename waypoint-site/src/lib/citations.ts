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
 * Comparison key for a chip or a lead citation. `et seq.` is dropped so a
 * `WIC §4500 et seq.` chip pairs with a `WIC §4500` source and vice versa —
 * they name the same authority, and requiring the suffix to match on both
 * sides would orphan chips over punctuation.
 */
export function citeKey(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s*et\s+seq\.?\s*$/i, '')
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

/** The sources[] entry backing a chip, or null when the page lists none. */
export function findSource<T extends SourceEntry>(chip: string, sources: T[]): T | null {
  const key = citeKey(chip);
  return sources.find((s) => citeKey(leadCitation(s.label)) === key) ?? null;
}
