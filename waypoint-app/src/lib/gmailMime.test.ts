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

/** The Subject header as sent: its first line and any folded continuations. */
function subjectLines(raw: string): string[] {
  const head = raw.slice(0, raw.indexOf('\r\n\r\n')).split('\r\n');
  const start = head.findIndex((l) => l.startsWith('Subject: '));
  const out = [head[start]];
  for (let i = start + 1; i < head.length && /^[ \t]/.test(head[i]); i++) out.push(head[i]);
  return out;
}

/** What a mail client shows: unfold, then decode adjacent encoded-words as one run (RFC 2047 §6.2). */
function decodeHeader(value: string): string {
  return value
    .replace(/\r\n[ \t]/g, ' ')
    .replace(/(=\?UTF-8\?B\?[^?]*\?=)\s+(?==\?UTF-8\?B\?)/gi, '$1')
    .replace(/=\?UTF-8\?B\?([^?]*)\?=/gi, (_, b64: string) => Buffer.from(b64, 'base64').toString('utf8'));
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

  it('produces PADDED encoded-words for the em-dash this app loves', () => {
    // The old version reused the unpadded base64url helper, so any subject
    // with an em-dash — which is most subjects the AI proposes — became a
    // malformed RFC 2047 word.
    const subject = 'IPP Addendum Request — Home-Based Life Skills OT';
    const words = encodeHeader(subject).split('\r\n ');
    for (const word of words) {
      expect(word.startsWith('=?UTF-8?B?')).toBe(true);
      const payload = word.slice('=?UTF-8?B?'.length, -'?='.length);
      expect(payload.length % 4).toBe(0);
      expect(payload).not.toMatch(/[-_]/); // standard base64, not base64url
    }
    expect(decodeHeader(encodeHeader(subject))).toBe(subject);
  });
});

/**
 * RFC 2047 caps an encoded-word at 75 characters, and a line holding them at
 * 76. One word of any length was sent: Gmail shrugs, but a stricter server — a
 * Regional Center's, a district's — may show "=?UTF-8?B?…" raw, or garble it.
 * The subjects this app writes (an em-dash, a child's name, Spanish or
 * Vietnamese) routinely run past the ~45 bytes one word can hold.
 */
describe('a long non-ASCII subject, folded', () => {
  const SUBJECTS = [
    'Written recommendation for 1:1 support — Maya Lopez',
    'Solicitud de reunión del IPP para María José Hernández — evaluación de servicios',
    'Yêu cầu họp IPP cho con của chúng tôi — đánh giá lại dịch vụ hỗ trợ',
    `IPP review ${String.fromCodePoint(0x1f389)} ${String.fromCodePoint(0x1f600).repeat(30)}`,
    `${'x'.repeat(200)} — ${'é'.repeat(100)}`,
  ];

  for (const subject of SUBJECTS) {
    it(JSON.stringify(subject.slice(0, 32)), () => {
      const raw = buildRawMessage({ to: 'a\b.com', subject, body: BODY });
      const lines = subjectLines(raw);
      // Every line within 76, every word within 75…
      for (const line of lines) expect(line.length).toBeLessThanOrEqual(76);
      const words = lines.join(' ').match(/=\?UTF-8\?B\?[^?]*\?=/g) ?? [];
      expect(words.length).toBeGreaterThan(1);
      for (const word of words) {
        expect(word.length).toBeLessThanOrEqual(75);
        // …each holding whole characters: it decodes on its own, strictly.
        const payload = word.slice('=?UTF-8?B?'.length, -'?='.length);
        expect(() => new TextDecoder('utf-8', { fatal: true }).decode(Buffer.from(payload, 'base64'))).not.toThrow();
      }
      // …and a mail client reassembles exactly what was written.
      expect(decodeHeader(lines.join('\r\n').replace(/^Subject: /, ''))).toBe(subject);
      expect(readMessage(raw).body).toBe(BODY);
    });
  }

  it('leaves a short or plain-ASCII subject on one line', () => {
    expect(subjectLines(buildRawMessage({ to: 'a\b.com', subject: 'IPP review — Maya', body: BODY }))).toHaveLength(1);
    const ascii = 'x'.repeat(120);
    expect(subjectLines(buildRawMessage({ to: 'a\b.com', subject: ascii, body: BODY }))).toEqual([`Subject: ${ascii}`]);
  });

  it('never lets a line break in the subject start a header of its own', () => {
    for (const subject of ['Hello\r\nBcc: spy\example.com', 'Hé\nBcc: spy\example.com']) {
      const head = buildRawMessage({ to: 'a\b.com', subject, body: BODY }).split('\r\n\r\n')[0];
      expect(head.split('\r\n').some((line) => /^bcc:/i.test(line))).toBe(false);
    }
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
