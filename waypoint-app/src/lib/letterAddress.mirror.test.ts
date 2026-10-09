/**
 * The Letters screen checks Cc addresses as the parent types; the gmail Edge
 * Function checks them again before building the message
 * (supabase/functions/_shared/mime.ts). Two copies of one rule — this keeps
 * them identical, so the screen never accepts what the server refuses.
 */
import { describe, it, expect } from 'vitest';
import * as app from './letterAddress';
import * as shipped from '../../supabase/functions/_shared/mime';

const SAMPLES = [
  'sam@example.org', ' SAM@Example.org ', 'a.b+tag@sub.example.co', 'x@y.c', 'x@y.com.',
  'a@x.com\r\nBcc: c@z.com', 'a@x.com, b@y.com', 'Sam <sam@example.org>', 'not an email', '', '@x.com', 'a@',
];

describe('the app Cc rule mirrors the shipped one', () => {
  it('isEmailAddress agrees on every sample', () => {
    for (const s of SAMPLES) expect(app.isEmailAddress(s)).toBe(shipped.isEmailAddress(s));
  });
  it('the same limit', () => {
    expect(app.MAX_CC).toBe(shipped.MAX_CC);
  });
  it('anything addCc builds, parseCc accepts unchanged', () => {
    let list: string[] = [];
    for (const s of SAMPLES) {
      const r = app.addCc(list, s, 'sc@rceb.org');
      if (r.added) list = r.list;
    }
    expect(list.length).toBeGreaterThan(0);
    expect(shipped.parseCc(list, 'sc@rceb.org')).toEqual(list);
  });
});

describe('addCc', () => {
  it('refuses the addressee, duplicates, bad input and a sixth address', () => {
    expect(app.addCc([], 'SC@rceb.org', 'sc@rceb.org')).toMatchObject({ added: false, reason: 'duplicate' });
    expect(app.addCc(['sam@example.org'], 'Sam@example.org', null)).toMatchObject({ added: false, reason: 'duplicate' });
    expect(app.addCc([], 'a@x.com, b@y.com', null)).toMatchObject({ added: false, reason: 'invalid' });
    const five = ['a@x.org', 'b@x.org', 'c@x.org', 'd@x.org', 'e@x.org'];
    expect(app.addCc(five, 'f@x.org', null)).toMatchObject({ added: false, reason: 'full' });
    expect(app.addCc([], ' sam@example.org ', null)).toEqual({ added: true, list: ['sam@example.org'] });
  });
});
