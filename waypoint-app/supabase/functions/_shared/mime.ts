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
 * A header value, RFC 2047 encoded only when it needs to be. Padded, because
 * an encoded-word is standard base64, not base64url.
 */
export function encodeHeader(value: string): string {
  // eslint-disable-next-line no-control-regex
  return /[^\x00-\x7F]/.test(value) ? `=?UTF-8?B?${b64(value)}?=` : value;
}

export interface RawMessageInput {
  to: string;
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
    `Subject: ${encodeHeader(input.subject || '(no subject)')}`,
    input.inReplyTo ? `In-Reply-To: ${input.inReplyTo}` : '',
    input.references ? `References: ${input.references}` : '',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: base64',
  ].filter((line) => line !== '');

  return [...headers, '', wrap76(b64(input.body))].join('\r\n');
}
