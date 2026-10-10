/**
 * Building the RFC 822 message Gmail actually sends.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 *
 * The gmail function built its message inline, and it had three bugs. The first
 * one meant EVERY email the app has ever sent through Gmail arrived with an
 * empty body — the Navigator's "email this answer" and LettersScreen's "Send
 * now with Gmail" alike. Reported by the owner on 2026-09-05 with a screenshot
 * of a blank email in their own inbox.
 *
 *   1. THE HEADER/BODY SEPARATOR WAS FILTERED OUT.
 *      The builder assembled an array where the optional In-Reply-To and
 *      References lines were `''` when absent, then ran
 *      `.filter((l) => l !== '')` to drop them — which also dropped the
 *      deliberate `''` that separates headers from body. Without that blank
 *      line the base64 body is parsed as another header, and the message has
 *      no content at all. The subject arrives; nothing else does.
 *
 *   2. THE BODY'S BASE64 WAS UNPADDED. `b64url()` strips `=` padding for the
 *      Gmail `raw` field (correct there — it is base64url). Reusing it for the
 *      MIME body left a body whose length is not a multiple of 4.
 *
 *   3. SO WERE NON-ASCII SUBJECT LINES. `encodeHeader` wrapped the same
 *      unpadded output in an RFC 2047 `=?UTF-8?B?…?=` encoded-word. Any
 *      subject containing an em-dash — which is most subjects this app
 *      generates — produced a malformed encoded-word.
 *
 * It lives in `_shared/` and is PURE — no Deno globals, no fetch, no network —
 * specifically so it can be imported by a vitest test under `src/`. The seven
 * Edge Functions are excluded from tsconfig and have no tests, yet they deploy
 * to production on merge (`deploy-edge-functions.yml`). This is the part of
 * that surface it is possible to actually cover, so it is covered: see
 * `src/lib/gmailMime.test.ts`.
 */

/** UTF-8 → standard base64, WITH padding. */
export function b64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let bin = '';
  for (const byte of bytes) bin += String.fromCharCode(byte);
  return btoa(bin);
}

/** UTF-8 → base64url, unpadded. Correct for Gmail's `raw` field, and ONLY that. */
export function b64url(input: string): string {
  return b64(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * RFC 2045 says a base64 body is at most 76 characters per line. Gmail is
 * lenient, but plenty of downstream mail servers — including ones a Regional
 * Center runs — are not.
 */
function wrap76(value: string): string {
  return (value.match(/.{1,76}/g) ?? []).join('\r\n');
}

/**
 * Longest subject the gmail function accepts. Well under RFC 5322's 998-char
 * line limit (a plain-ASCII subject is sent unfolded), and it bounds how many
 * encoded-words a non-ASCII one becomes.
 */
export const MAX_SUBJECT_CHARS = 250;

/**
 * A header value as ONE line: every control character (tab, CR, LF, NUL…),
 * DEL, C1 control, and Unicode line or paragraph separator becomes a space. A
 * line break in a header value would start a header of the sender's choosing;
 * the rest have no business in a subject either. The gmail function applies
 * this on the way IN, so the subject it stores is the subject it sends.
 */
export function oneHeaderLine(value: string): string {
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\x00-\x1F\x7F-\x9F\u2028\u2029]+/g, ' ').trim();
}

/**
 * UTF-8 bytes per encoded-word: 39 bytes is 52 base64 characters, so a word
 * ("=?UTF-8?B?" + 52 + "?=") is 64 characters — inside RFC 2047's 75 — and
 * even the first line, "Subject: " + a word, is 73: inside its 76.
 */
const WORD_BYTES = 39;

const encodedWord = (text: string) => `=?UTF-8?B?${b64(text)}?=`;

/**
 * A header value, RFC 2047 encoded only when it needs to be. Padded, because
 * an encoded-word is standard base64, not base64url.
 *
 * A long non-ASCII value is split into several encoded-words, folded onto
 * continuation lines (CRLF + space). One word of any length used to be sent:
 * Gmail is lenient, but a stricter server (a Regional Center's, a district's)
 * may show the raw "=?UTF-8?B?…" or mangle it — and the subjects this app
 * writes, with an em-dash and a child's name, routinely run past one word.
 *
 * Each word holds whole characters (never half a UTF-8 sequence) and, where
 * it can, ends just after a space. A conforming decoder drops the whitespace
 * BETWEEN adjacent words (RFC 2047 §6.2) and shows the original text; one that
 * wrongly keeps it then shows a double space, not a word broken in two.
 */
export function encodeHeader(value: string): string {
  const flat = oneHeaderLine(value);
  // eslint-disable-next-line no-control-regex
  if (!/[^\x00-\x7F]/.test(flat)) return flat;

  const encoder = new TextEncoder();
  const bytes = (text: string) => encoder.encode(text).length;
  const words: string[] = [];
  let chunk = '';
  for (const char of flat) {
    // Iterating a string yields whole code points.
    if (chunk && bytes(chunk) + bytes(char) > WORD_BYTES) {
      const cut = chunk.lastIndexOf(' ') + 1;
      const tail = cut > 0 ? chunk.slice(cut) : '';
      // Break after the last space — unless what follows it would not fit
      // the next word either; then break between characters.
      if (cut > 0 && bytes(tail) + bytes(char) <= WORD_BYTES) {
        words.push(encodedWord(chunk.slice(0, cut)));
        chunk = tail;
      } else {
        words.push(encodedWord(chunk));
        chunk = '';
      }
    }
    chunk += char;
  }
  if (chunk) words.push(encodedWord(chunk));
  return words.join('\r\n ');
}

export interface RawMessageInput {
  to: string;
  /** Copied recipients — already validated by `parseCc`. Empty → no header. */
  cc?: string[];
  subject: string;
  body: string;
  /** Threading, when replying. Omitted headers are dropped, not blanked. */
  inReplyTo?: string;
  references?: string;
}

/**
 * The full RFC 822 message, ready for base64url encoding into Gmail's `raw`.
 *
 * The separator is added AFTER the optional headers are filtered, which is the
 * whole point — filtering a list that contains both "absent optional header"
 * and "the separator", both represented as `''`, is what broke it.
 */
export function buildRawMessage(input: RawMessageInput): string {
  const headers = [
    `To: ${input.to}`,
    input.cc && input.cc.length > 0 ? `Cc: ${input.cc.join(', ')}` : '',
    `Subject: ${encodeHeader(input.subject || '(no subject)')}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : '',
    input.references ? `References: ${input.references}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ].filter((line) => line !== '');

  return [...headers, '', wrap76(b64(input.body))].join('\r\n');
}

/** Most people a letter may copy: a spouse, an advocate, a supervisor — not a list. */
export const MAX_CC = 5;

/**
 * One plain address, nothing else. Cc addresses are joined into one header,
 * so a comma, an angle bracket or a line break inside one would smuggle in a
 * second recipient — or a second header (Bcc:, say).
 */
// The local part may hold an apostrophe (o'brien@district.org); the whole
// address must be printable ASCII, since it goes into a raw header unencoded.
const EMAIL_RE = /^[^\s@,;:<>()[\]\\"]+@[^\s@,;:<>()[\]\\"']+\.[^\s@,;:<>()[\]\\"'.]{2,}$/;
const PRINTABLE_ASCII = /^[\x21-\x7e]+$/;

/** Whether `value` is one plain email address. */
export function isEmailAddress(value: string): boolean {
  const v = value.trim();
  return PRINTABLE_ASCII.test(v) && EMAIL_RE.test(v);
}

/**
 * The Cc list a send request carries, or null when it must be refused: not an
 * array of strings, an entry that is not one plain address, or more than
 * MAX_CC. Duplicates (and the To address itself) are dropped, case-insensitively,
 * because mail servers compare that way.
 */
export function parseCc(raw: unknown, to: string): string[] | null {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) return null;
  const seen = new Set([to.trim().toLowerCase()]);
  const out: string[] = [];
  for (const entry of raw) {
    if (typeof entry !== 'string' || !isEmailAddress(entry)) return null;
    const email = entry.trim();
    if (seen.has(email.toLowerCase())) continue;
    seen.add(email.toLowerCase());
    out.push(email);
  }
  return out.length > MAX_CC ? null : out;
}
