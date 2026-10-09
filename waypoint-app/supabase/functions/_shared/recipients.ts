/**
 * Who else was on an email — for the paper trail's Cc (migration 064).
 *
 * PURE, like mime.ts and threadOrg.ts, so `src/lib/recipients.test.ts` can
 * cover it: the Edge Functions that use it have no tests of their own.
 */

/** Most addresses stored for one email: enough for any real thread, bounded for a mass mailing. */
export const MAX_RECORDED = 20;

// One address, found anywhere in a header once display names and comments
// are gone. Printable ASCII only, like mime.ts: a header is not decoded here.
const ADDRESS_FIND_RE = /[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"']+\.[^\s@,;:<>()[\]\\"'.]{2,}/g;

/**
 * Every value of a header, joined — some mail servers emit To or Cc twice,
 * and reading only the first would drop whoever is on the second.
 */
export function headerValues(
  headers: readonly { name?: string; value?: string }[] | null | undefined,
  name: string
): string {
  const wanted = name.toLowerCase();
  return (headers ?? [])
    .filter((h) => (h.name ?? '').toLowerCase() === wanted && h.value)
    .map((h) => h.value as string)
    .join(', ');
}

/**
 * The plain addresses in an address-list header (`To`, `Cc`, `From`),
 * lowercased, in order, without duplicates.
 *
 * It finds addresses rather than parsing the grammar, because a reply that
 * silently loses a recipient is worse than one that stores none: quoted
 * display names (escaped quotes and commas included) and (comments) are
 * removed first, so an address-shaped display name is never counted, and
 * then every address left is kept — inside or outside <…>, in a group
 * (`Team: a@x.org, b@x.org;`), or after an unclosed bracket.
 */
export function addressesIn(header: string | null | undefined): string[] {
  if (!header) return [];
  const stripped = header
    .replace(/"(?:[^"\\]|\\.)*"?/g, ' ')
    .replace(/\((?:[^()\\]|\\.)*\)/g, ' ');
  const out: string[] = [];
  for (const match of stripped.match(ADDRESS_FIND_RE) ?? []) {
    const address = match.toLowerCase();
    if (!out.includes(address)) out.push(address);
  }
  return out;
}

/**
 * The form two addresses compare in. Gmail ignores dots and anything after a
 * `+` in the local part, and googlemail.com is gmail.com, so the family's
 * own `j.doe+school@gmail.com` is still the family. Other domains compare
 * exactly — their aliasing rules are their own.
 */
export function mailboxKey(address: string): string {
  const lower = address.trim().toLowerCase();
  const at = lower.lastIndexOf('@');
  if (at < 0) return lower;
  const domain = lower.slice(at + 1);
  if (domain !== 'gmail.com' && domain !== 'googlemail.com') return lower;
  const local = lower.slice(0, at).split('+')[0].replace(/\./g, '');
  return `${local}@gmail.com`;
}

/**
 * Everyone else on a synced reply: its To and Cc, minus the family's own
 * address and minus the sender — exactly who a reply-all would copy. Null
 * when there is nobody, so the column reads "nobody recorded" rather than an
 * empty list.
 */
export function otherRecipients(input: {
  to: string | null | undefined;
  cc: string | null | undefined;
  from: string | null | undefined;
  self: string | null | undefined;
}): string[] | null {
  const exclude = new Set([...addressesIn(input.from), ...addressesIn(input.self)].map(mailboxKey));
  const out: string[] = [];
  for (const address of [...addressesIn(input.to), ...addressesIn(input.cc)]) {
    const key = mailboxKey(address);
    if (exclude.has(key)) continue;
    exclude.add(key); // a second spelling of someone already listed
    out.push(address);
  }
  return out.length > 0 ? out.slice(0, MAX_RECORDED) : null;
}

/**
 * A chosen Cc list for storage: lowercased like the synced side, so one
 * column holds one convention, and null for none.
 */
export function ccForStorage(cc: readonly string[] | null | undefined): string[] | null {
  return cc && cc.length > 0 ? cc.map((e) => e.trim().toLowerCase()) : null;
}

/**
 * Whether a write failed only because migration 064 is not applied yet.
 * PostgREST reports an unknown insert/update column as PGRST204 ("Could not
 * find the 'cc' column of 'communications' in the schema cache"); Postgres
 * itself as 42703 ("column \"cc\" ... does not exist"). The caller retries
 * without `cc`, so a late migration costs the Cc and never the email.
 */
export function isMissingCcColumn(
  error: { code?: string | null; message?: string | null } | null | undefined
): boolean {
  if (!error) return false;
  const message = error.message ?? '';
  const codeMatches = error.code === 'PGRST204' || error.code === '42703';
  const textMatches = /schema cache|does not exist|could not find/i.test(message);
  return (codeMatches || textMatches) && /['"]cc['"]|\bcc\b/.test(message);
}
