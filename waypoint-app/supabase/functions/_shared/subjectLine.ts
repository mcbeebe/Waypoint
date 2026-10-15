/**
 * The subject line ai-proxy writes for a letter draft — cleaned into one safe
 * email header.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * The draft prompt never produced a subject, so every letter fell back to its
 * TEMPLATE's title. On 2026-10-07 the owner's note to a provider went out as
 * "IPP Meeting Request — <child>", because the Navigator had routed it through
 * the IPP template. So the draft action now makes a second, small model call
 * that reads the finished letter and returns its subject through a one-field
 * tool, sent back as `{ draft, subject }`.
 *
 * A separate call, not a "Subject:" first line in the draft itself: an
 * adversarial review found that line fights the draft prompt's own rules (the
 * warm tone's "start with Hi [Name]", the LANGUAGE line's "write the ENTIRE
 * draft in Spanish"), and any miss in parsing it left a literal "Subject: …"
 * inside the letter a family sends.
 *
 * Whatever the model returns is untrusted — the letter it read can carry text
 * a third party wrote — until it has been through `cleanSubject`: one line, no
 * control, invisible or direction-override characters, no pre-encoded MIME
 * words, a bounded length cut on a character boundary. Pure — no Deno globals —
 * so `src/lib/letterSubject.test.ts` covers it; the Edge Functions have no CI.
 */

/** Longer than any useful subject; a runaway reply is cut, not sent. */
export const MAX_SUBJECT_CHARS = 120;

/** A label the model may prefix despite being told not to. */
const LABEL_RE =
  /^\s*(?:\*\*)?\s*(?:subject(?:\s+line)?|asunto|ti[eê]u\s+đ[eề]|chủ\s+đ[eề]|v\/v)\s*(?:\*\*)?\s*[:\uFF1A]\s*(?:\*\*)?/iu;

/**
 * Controls, invisible characters, and the direction marks and overrides that
 * can make a subject display as something other than what it says.
 */
// eslint-disable-next-line no-control-regex
const UNSAFE_RE = /[\u0000-\u001F\u007F-\u009F\u061C\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\uFEFF]/g;

/**
 * An RFC 2047 encoded-word ("=?UTF-8?B?…?="). Passed through as ASCII it is
 * sent raw, shows as gibberish to the parent, and DECODES at the recipient
 * into text nobody reviewed.
 */
const ENCODED_WORD_RE = /=\?[^?\s]*\?[bq]\?[^?\s]*\?=/gi;

/** Opening → closing quote marks, stripped only as a matched pair. */
const QUOTE_PAIRS: Record<string, string> = {
  '"': '"',
  "'": "'",
  '\u201C': '\u201D',
  '\u2018': '\u2019',
  '\u00AB': '\u00BB',
};

function unquote(s: string): string {
  const close = QUOTE_PAIRS[s[0]];
  return close && s.length > 1 && s.endsWith(close) ? s.slice(1, -1).trim() : s;
}

function unlabel(s: string): string {
  // "Subject: Subject: X" — strip as many as the model stacked (bounded).
  for (let i = 0; i < 3 && LABEL_RE.test(s); i++) s = s.replace(LABEL_RE, '').trim();
  return s;
}

/**
 * The model's reply, as one clean subject line — or null when there is
 * nothing usable, so the app falls back to its own subject.
 */
export function cleanSubject(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // The first non-blank line only — a reply that runs on is not a subject.
  const line = raw.split(/\r\n|[\r\n\u2028\u2029]/).find((l) => l.trim()) ?? '';
  let cleaned = line
    .replace(ENCODED_WORD_RE, ' ')
    .replace(UNSAFE_RE, ' ')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = unquote(unlabel(unquote(cleaned)));
  // A lead-in ("Here's a subject line:") is not a subject.
  if (!cleaned || /[:\uFF1A]$/.test(cleaned)) return null;
  const chars = Array.from(cleaned); // code points, so an emoji is never halved
  return chars.length > MAX_SUBJECT_CHARS
    ? `${chars.slice(0, MAX_SUBJECT_CHARS - 1).join('').trimEnd()}…`
    : cleaned;
}
