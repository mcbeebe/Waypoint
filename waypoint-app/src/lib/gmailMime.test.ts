/**
 * The Gmail message builder — the one part of the Edge Function surface that
 * can be covered by CI, so it is.
 *
 * The seven Edge Functions are excluded from tsconfig, have no tests, and
 * deploy to production on merge. That is how a bug that made EVERY Gmail send
 * arrive with an empty body shipped and stayed shipped: the Navigator's "email
 * this answer" and LettersScreen's "Send now with Gmail" both routed through
 * it, nothing failed loudly, and the sender's own copy looked fine in the
 * "Sent" list until you opened it.
 *
 * Reported by the owner (2026-09-05) with a screenshot of a blank email in
 * their own inbox. Reproduced here first, then fixed.
 */
import { describe, it, expect } from 'vitest';
import {
  buildRawMessage,
  parseCc,
  isEmailAddress,
  MAX_CC,
  encodeHeader,
  b64,
  b64url,
} from '../../supabase/functions/_shared/mime';

/** Decode a message the way a mail server would, to assert what ARRIVES. */
function readMessage(raw: string): { headers: Record<string, string>; body: string } {
  const split = raw.indexOf('\r\n\r\n');
  if (split === -1) throw new Error('no header/body separator — the body is not a body');
  const headers: Record<string, string> = {};
  for (const line of raw.slice(0, split).split('\r\n')) {
    const at = line.indexOf(': ');
    if (at > 0) headers[line.slice(0, at)] = line.slice(at + 2);
  }
  const encoded = raw.slice(split + 4).replace(/\r\n/g, '');
  return { headers, body: Buffer.from(encoded, 'base64').toString('utf8') };
}

const BODY = "Hi Lilia,\n\nThank you again for your ongoing support with Teddy's respite services.";

describe('the message that actually arrives', () => {
  it('HAS A BODY — the regression that shipped', () => {
    // The old builder ran .filter(l => l !== '') over a list that held both
    // the absent optional headers AND the header/body separator, so the
    // separator went with them and the base64 body was parsed as a header.
    const raw = buildRawMessage({ to: 'a@b.com', subject: 'Hello', body: BODY });
    expect(raw).toContain('\r\n\r\n');
    expect(readMessage(raw).body).toBe(BODY);
  });

  it('keeps the body intact with no threading headers at all', () => {
    // The exact shape of a first send — where both optional headers are
    // absent, which is when the old filter did the damage.
    const raw = buildRawMessage({ to: 'a@b.com', subject: 'Hello', body: BODY });
    expect(raw).not.toContain('In-Reply-To');
    expect(raw).not.toContain('References');
    expect(readMessage(raw).body).toBe(BODY);
  });

  it('keeps the body intact WITH threading headers', () => {
    const raw = buildRawMessage({
      to: 'a@b.com',
      subject: 'Re: Assessment',
      body: BODY,
      inReplyTo: '<abc@mail.gmail.com>',
      references: '<x@y> <abc@mail.gmail.com>',
    });
    const msg = readMessage(raw);
    expect(msg.headers['In-Reply-To']).toBe('<abc@mail.gmail.com>');
    expect(msg.headers['References']).toBe('<x@y> <abc@mail.gmail.com>');
    expect(msg.body).toBe(BODY);
  });

  it('survives the characters this app actually generates', () => {
    // Em-dashes, curly apostrophes and accented names are in almost every
    // generated letter; Vietnamese is a shipped locale.
    const body =
      "Xin chào — I'm Mateo's parent.\n\nCould you confirm Teddy's IPP addendum?\n— Dana Ruiz";
    const raw = buildRawMessage({ to: 'a@b.com', subject: 'Hi', body });
    expect(readMessage(raw).body).toBe(body);
  });

  it('preserves blank lines and trailing newlines in the body', () => {
    const body = 'Line one\n\nLine three\n';
    expect(readMessage(buildRawMessage({ to: 'a@b.com', subject: 'S', body })).body).toBe(body);
  });

  it('never emits a base64 body line longer than RFC 2045 allows', () => {
    const raw = buildRawMessage({ to: 'a@b.com', subject: 'S', body: 'x'.repeat(5000) });
    const bodyLines = raw.slice(raw.indexOf('\r\n\r\n') + 4).split('\r\n');
    for (const line of bodyLines) expect(line.length).toBeLessThanOrEqual(76);
  });

  it('falls back to a subject rather than sending a headerless one', () => {
    expect(readMessage(buildRawMessage({ to: 'a@b.com', subject: '', body: BODY })).headers.Subject)
      .toBe('(no subject)');
  });
});

describe('encodeHeader', () => {
  it('leaves a plain ASCII subject alone', () => {
    expect(encodeHeader('IPP Addendum Request')).toBe('IPP Addendum Request');
  });

  it('produces a PADDED encoded-word for the em-dash this app loves', () => {
    // The old version reused the unpadded base64url helper, so any subject
    // with an em-dash — which is most subjects the AI proposes — became a
    // malformed RFC 2047 word.
    const subject = 'IPP Addendum Request — Home-Based Life Skills OT';
    const encoded = encodeHeader(subject);
    expect(encoded.startsWith('=?UTF-8?B?')).toBe(true);
    const payload = encoded.slice('=?UTF-8?B?'.length, -'?='.length);
    expect(payload.length % 4).toBe(0);
    expect(payload).not.toMatch(/[-_]/); // standard base64, not base64url
    expect(Buffer.from(payload, 'base64').toString('utf8')).toBe(subject);
  });
});

describe('the two base64 flavours are not interchangeable', () => {
  it('b64 is padded standard base64 — for MIME', () => {
    expect(b64('hello!').length % 4).toBe(0);
  });

  it('b64url is unpadded and URL-safe — for Gmail\'s `raw` field only', () => {
    const v = b64url('ÿþýü');
    expect(v).not.toContain('=');
    expect(v).not.toMatch(/[+/]/);
  });

  it('round-trips a raw message through the transport encoding', () => {
    // What the function posts as `{ raw }` must decode back to the message.
    const raw = buildRawMessage({ to: 'a@b.com', subject: 'S', body: BODY });
    const transport = b64url(raw);
    const back = Buffer.from(
      transport.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(transport.length / 4) * 4, '='),
      'base64'
    ).toString('utf8');
    expect(back).toBe(raw);
    expect(readMessage(back).body).toBe(BODY);
  });
});

describe('Cc (owner ask, 2026-10-09)', () => {
  const headers = (raw: string) => raw.split('\r\n\r\n')[0].split('\r\n');

  it('adds one Cc header with every copied address — and none when nobody is copied', () => {
    const withCc = headers(buildRawMessage({ to: 'sc@rceb.org', cc: ['sam@example.org', 'adv@example.org'], subject: 'S', body: 'B' }));
    expect(withCc).toContain('Cc: sam@example.org, adv@example.org');
    expect(headers(buildRawMessage({ to: 'sc@rceb.org', cc: [], subject: 'S', body: 'B' })).some((h) => h.startsWith('Cc:'))).toBe(false);
    expect(headers(buildRawMessage({ to: 'sc@rceb.org', subject: 'S', body: 'B' })).some((h) => h.startsWith('Cc:'))).toBe(false);
  });

  it('parseCc accepts plain addresses, trims, and drops duplicates and the To address', () => {
    expect(parseCc(undefined, 'sc@rceb.org')).toEqual([]);
    expect(parseCc([' sam@example.org ', 'SAM@example.org', 'SC@rceb.org'], 'sc@rceb.org')).toEqual(['sam@example.org']);
  });

  it('parseCc refuses anything that could smuggle a recipient or a header', () => {
    for (const bad of [
      'a@x.com\r\nBcc: c@z.com',
      'a@x.com, b@y.com',
      'Sam <sam@example.org>',
      'not an email',
      '',
    ]) {
      expect(parseCc([bad], 'sc@rceb.org')).toBeNull();
      expect(isEmailAddress(bad)).toBe(false);
    }
    expect(parseCc('sam@example.org', 'sc@rceb.org')).toBeNull(); // not an array
    expect(parseCc([42], 'sc@rceb.org')).toBeNull();
  });

  it(`parseCc refuses more than ${MAX_CC} copied addresses`, () => {
    const many = Array.from({ length: MAX_CC + 1 }, (_, i) => `p${i}@example.org`);
    expect(parseCc(many.slice(0, MAX_CC), 'sc@rceb.org')).toHaveLength(MAX_CC);
    expect(parseCc(many, 'sc@rceb.org')).toBeNull();
  });
});
