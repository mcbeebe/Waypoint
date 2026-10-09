/**
 * Who else was on an email — for the paper trail's Cc (migration 064).
 *
 * PURE, like mime.ts and threadOrg.ts, so `src/lib/recipients.test.ts` can
 * cover it: the Edge Functions that use it have no tests of their own.
 */

/** Most addresses stored for one email: enough for any real thread, bounded for a mass mailing. */
export const MAX_RECORDED = 20;

const ADDRESS_RE = /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"']+\.[^\s@,;:<>()[\]\\"'.]{2,}$/;

/** Split a header on commas that are not inside a quoted display name or <…>. */
function splitList(value: string): string[] {
  const parts: string[] = [];
  let current = '';
  let quoted = false;
  let angle = false;
  for (const ch of value) {
    if (ch === '"') quoted = !quoted;
    else if (!quoted && ch === '<') angle = true;
    else if (!quoted && ch === '>') angle = false;
    if (ch === ',' && !quoted && !angle) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

/**
 * The plain addresses in an address-list header (`To`, `Cc`, `From`),
 * lowercased, in order, without duplicates. `"Rivera, Ana" <ana@rc.org>` and
 * a bare `ana@rc.org` both yield `ana@rc.org`; anything that is not one plain
 * address (a group label, a garbled entry) is dropped rather than guessed at.
 */
export function addressesIn(header: string | null | undefined): string[] {
  if (!header) return [];
  const out: string[] = [];
  for (const part of splitList(header)) {
    const bracketed = part.match(/<([^<>]*)>/);
    const candidate = (bracketed ? bracketed[1] : part).trim().toLowerCase();
    if (ADDRESS_RE.test(candidate) && !out.includes(candidate)) out.push(candidate);
  }
  return out;
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
  const exclude = new Set([...addressesIn(input.from), ...addressesIn(input.self)]);
  const out: string[] = [];
  for (const address of [...addressesIn(input.to), ...addressesIn(input.cc)]) {
    if (!exclude.has(address) && !out.includes(address)) out.push(address);
  }
  return out.length > 0 ? out.slice(0, MAX_RECORDED) : null;
}

/** A Cc list for storage: null for none, so an email with no Cc stores nothing. */
export function ccForStorage(cc: readonly string[] | null | undefined): string[] | null {
  return cc && cc.length > 0 ? cc.slice(0, MAX_RECORDED) : null;
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
