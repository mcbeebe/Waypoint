/**
 * The "all 21 Regional Centers" link list, derived from the data spine (D11)
 * like the finder's county routing — never a hand-typed list. Kept free of
 * `astro:content` so it can be unit-tested on plain records.
 */

/** The fields of an RcRecord the list needs. */
export interface RcListInput {
  rcId: string;
  rcName: string;
  counties: string[];
  /** Our field guide, or null while it is still in review. */
  url: string | null;
}

export interface RcListItem {
  rcId: string;
  rcName: string;
  url: string | null;
  /** e.g. "Alameda and Contra Costa counties" or "Part of Los Angeles County". */
  area: string;
}

/** "A", "A and B", "A, B and C". */
function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/**
 * The part of a center's name a parent scans for: "Regional Center of the
 * East Bay" files under E and "Frank D. Lanterman" under L, not both under R/F.
 */
export function rcSortKey(rcName: string): string {
  return rcName
    .replace(/^Regional Center of (the )?/i, '')
    .replace(/^Frank D\. /, '')
    .toLowerCase();
}

/**
 * One list item per center, sorted by `rcSortKey`, counties alphabetical. A county served by more than one
 * center (Los Angeles has seven) is described as "part of", so no item claims
 * a whole county another center shares.
 */
export function rcListItems(records: RcListInput[]): RcListItem[] {
  const servedBy = new Map<string, number>();
  for (const r of records) for (const c of r.counties) servedBy.set(c, (servedBy.get(c) ?? 0) + 1);

  return [...records]
    .sort((a, b) => rcSortKey(a.rcName).localeCompare(rcSortKey(b.rcName)))
    .map((r) => {
      const counties = [...r.counties].sort((a, b) => a.localeCompare(b));
      const whole = counties.filter((c) => servedBy.get(c) === 1);
      const shared = counties.filter((c) => (servedBy.get(c) ?? 0) > 1);
      const parts: string[] = [];
      if (whole.length) parts.push(`${joinNames(whole)} ${whole.length === 1 ? 'County' : 'counties'}`);
      for (const c of shared) parts.push(`part of ${c} County`);
      const area = parts.join('; ');
      return { rcId: r.rcId, rcName: r.rcName, url: r.url, area: area.charAt(0).toUpperCase() + area.slice(1) };
    });
}
