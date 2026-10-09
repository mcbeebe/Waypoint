/**
 * Who else was on an email (supabase/functions/_shared/recipients.ts). The
 * Edge Functions that store it have no CI, so the pure rules are pinned here.
 */
import { describe, it, expect } from 'vitest';
import {
  addressesIn,
  otherRecipients,
  ccForStorage,
  isMissingCcColumn,
  MAX_RECORDED,
} from '../../supabase/functions/_shared/recipients';

describe('addressesIn', () => {
  it('reads display-name and bare forms, lowercased', () => {
    expect(addressesIn('Ana Rivera <Ana@RC.org>, sam@home.net')).toEqual(['ana@rc.org', 'sam@home.net']);
  });

  it('does not split on a comma inside a quoted display name', () => {
    expect(addressesIn('"Rivera, Ana" <ana@rc.org>, "Lee, Sam" <sam@home.net>')).toEqual([
      'ana@rc.org',
      'sam@home.net',
    ]);
  });

  it('drops duplicates and entries that are not one plain address', () => {
    expect(addressesIn('ana@rc.org, undisclosed-recipients:;, ANA@rc.org, not an address')).toEqual([
      'ana@rc.org',
    ]);
  });

  it('is empty for a missing header', () => {
    expect(addressesIn('')).toEqual([]);
    expect(addressesIn(null)).toEqual([]);
    expect(addressesIn(undefined)).toEqual([]);
  });
});

describe('otherRecipients', () => {
  it('is the reply-all list: To and Cc minus the family and the sender', () => {
    expect(
      otherRecipients({
        from: 'Ana Rivera <ana@rc.org>',
        to: 'Parent <parent@gmail.com>, supervisor@rc.org',
        cc: 'Sam <sam@home.net>, ana@rc.org',
        self: 'Parent@Gmail.com',
      })
    ).toEqual(['supervisor@rc.org', 'sam@home.net']);
  });

  it('is null when nobody else was on it, so the column reads "none recorded"', () => {
    expect(
      otherRecipients({ from: 'ana@rc.org', to: 'parent@gmail.com', cc: '', self: 'parent@gmail.com' })
    ).toBeNull();
  });

  it('still excludes the sender when the family address is unknown', () => {
    expect(otherRecipients({ from: 'ana@rc.org', to: 'ana@rc.org, x@y.org', cc: null, self: '' })).toEqual([
      'x@y.org',
    ]);
  });

  it('is bounded for a mass mailing', () => {
    const to = Array.from({ length: 40 }, (_, i) => `p${i}@list.org`).join(', ');
    expect(otherRecipients({ from: 'a@b.org', to, cc: null, self: null })).toHaveLength(MAX_RECORDED);
  });
});

describe('ccForStorage', () => {
  it('stores null for no Cc, not an empty array', () => {
    expect(ccForStorage([])).toBeNull();
    expect(ccForStorage(null)).toBeNull();
    expect(ccForStorage(['sam@home.net'])).toEqual(['sam@home.net']);
  });
});

describe('isMissingCcColumn', () => {
  it('recognises PostgREST and Postgres missing-column errors for cc', () => {
    expect(
      isMissingCcColumn({
        code: 'PGRST204',
        message: "Could not find the 'cc' column of 'communications' in the schema cache",
      })
    ).toBe(true);
    expect(
      isMissingCcColumn({ code: '42703', message: 'column "cc" of relation "communications" does not exist' })
    ).toBe(true);
  });

  it('does not swallow other failures, so a real error is never retried away', () => {
    expect(isMissingCcColumn(null)).toBe(false);
    expect(isMissingCcColumn({ code: '42501', message: 'new row violates row-level security policy' })).toBe(false);
    expect(
      isMissingCcColumn({ code: 'PGRST204', message: "Could not find the 'read_at' column of 'communications'" })
    ).toBe(false);
    expect(isMissingCcColumn({ code: '23505', message: 'duplicate key: access denied' })).toBe(false);
  });
});
