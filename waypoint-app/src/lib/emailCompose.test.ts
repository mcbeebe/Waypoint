import { describe, it, expect } from 'vitest';
import { isMobileBrowser, composeTarget, mailtoUrl, gmailComposeUrl } from './emailCompose';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const ANDROID_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36';
const MAC_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36';
const IPAD_UA = MAC_UA; // iPadOS 13+ masquerades as a Mac

const OPTS = { subject: 'Request for IEP Meeting', body: 'Dear Ms. Waller,\n\nI am writing…' };

describe('isMobileBrowser', () => {
  it('detects iPhone and Android browsers', () => {
    expect(isMobileBrowser({ platformOS: 'web', userAgent: IPHONE_UA })).toBe(true);
    expect(isMobileBrowser({ platformOS: 'web', userAgent: ANDROID_UA })).toBe(true);
  });

  it('detects iPadOS pretending to be a Mac via touch points', () => {
    expect(isMobileBrowser({ platformOS: 'web', userAgent: IPAD_UA, maxTouchPoints: 5 })).toBe(true);
  });

  it('leaves a real desktop alone', () => {
    expect(isMobileBrowser({ platformOS: 'web', userAgent: MAC_UA, maxTouchPoints: 0 })).toBe(false);
  });

  it('is false on native, where the question does not apply', () => {
    expect(isMobileBrowser({ platformOS: 'ios' })).toBe(false);
  });
});

describe('composeTarget', () => {
  it('sends desktop web to Gmail compose', () => {
    const t = composeTarget(OPTS, { platformOS: 'web', userAgent: MAC_UA, maxTouchPoints: 0 });
    expect(t.kind).toBe('gmail');
    expect(t.url).toContain('mail.google.com');
    expect(t.label).toBe('Open in Gmail');
  });

  it('sends a phone browser to the mail app, NOT the Gmail interstitial', () => {
    const t = composeTarget(OPTS, { platformOS: 'web', userAgent: IPHONE_UA });
    expect(t.kind).toBe('mail');
    expect(t.url.startsWith('mailto:')).toBe(true);
    expect(t.url).not.toContain('mail.google.com');
  });

  it('sends native apps to the mail app', () => {
    expect(composeTarget(OPTS, { platformOS: 'ios' }).kind).toBe('mail');
    expect(composeTarget(OPTS, { platformOS: 'android' }).kind).toBe('mail');
  });
});

describe('url encoding', () => {
  it('encodes spaces as %20 in mailto (not "+"), and newlines as CRLF', () => {
    const url = mailtoUrl(OPTS);
    expect(url).not.toMatch(/\+/);
    expect(url).toContain('subject=Request%20for%20IEP%20Meeting');
    // RFC 2368: line breaks must be %0D%0A — Gmail iOS drops bare %0A and
    // flattens the whole letter into one paragraph
    expect(url).toContain('%0D%0A');
    expect(url).not.toMatch(/(?<!%0D)%0A/);
  });

  it('already-CRLF bodies are not double-escaped', () => {
    const url = mailtoUrl({ subject: 's', body: 'a\r\nb' });
    expect(url).toContain('body=a%0D%0Ab');
  });

  it('includes the recipient when there is one', () => {
    expect(mailtoUrl({ ...OPTS, to: 'teacher@school.org' })).toContain('mailto:teacher%40school.org?');
    expect(gmailComposeUrl({ ...OPTS, to: 'teacher@school.org' })).toContain('to=teacher%40school.org');
  });
});
