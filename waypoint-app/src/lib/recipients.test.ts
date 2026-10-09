/**
 * Who else was on an email (supabase/functions/_shared/recipients.ts). The
 * Edge Functions that store it have no CI, so the pure rules are pinned here.
 */
import { describe, it, expect } from 'vitest';
import {
  addressesIn,
  otherRecipients,
  ccForStorage,
  headerValues,
  isMissingCcColumn,
  mailboxKey,
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

  // Each of these lost a real recipient in the first version (adversarial review).
  it('an escaped quote in a display name does not swallow the next address', () => {
    expect(addressesIn('"O\\"Brien, Pat" <p@x.org>, bob@x.org')).toEqual(['p@x.org', 'bob@x.org']);
  });

  it('keeps the members of a group and an address with a (comment)', () => {
    expect(addressesIn('Team: a@x.org, b@x.org;')).toEqual(['a@x.org', 'b@x.org']);
    expect(addressesIn('ana@rc.org (Ana Rivera)')).toEqual(['ana@rc.org']);
  });

  it('an unclosed bracket does not hide everyone after it', () => {
    expect(addressesIn('Bob <bob@x.org>, Ana <ana@rc.org, Cy <cy@x.org>')).toEqual([
      'bob@x.org',
      'ana@rc.org',
      'cy@x.org',
    ]);
  });

  it('an address-shaped display name is not counted as a recipient', () => {
    expect(addressesIn('"boss@rc.org" <assistant@rc.org>')).toEqual(['assistant@rc.org']);
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

  it('recognises the family under the spellings Gmail delivers to', () => {
    expect(
      otherRecipients({
        from: 'ana@rc.org',
        to: 'J.Doe@gmail.com, jdoe+school@googlemail.com, sam@home.net',
        cc: null,
        self: 'jdoe@gmail.com',
      })
    ).toEqual(['sam@home.net']);
  });

  it('is bounded for a mass mailing', () => {
    const to = Array.from({ length: 40 }, (_, i) => `p${i}@list.org`).join(', ');
    expect(otherRecipients({ from: 'a@b.org', to, cc: null, self: null })).toHaveLength(MAX_RECORDED);
  });
});

describe('ccForStorage', () => {
  it('stores null for no Cc, and lowercases like the synced side', () => {
    expect(ccForStorage([])).toBeNull();
    expect(ccForStorage(null)).toBeNull();
    expect(ccForStorage([' Sam@Home.net'])).toEqual(['sam@home.net']);
  });
});

describe('mailboxKey', () => {
  it('folds Gmail dots, +tags and googlemail.com, and leaves other domains exact', () => {
    expect(mailboxKey('J.Doe+iep@GoogleMail.com')).toBe('jdoe@gmail.com');
    expect(mailboxKey('j.doe+iep@district.org')).toBe('j.doe+iep@district.org');
  });
});

describe('headerValues', () => {
  it('joins a header that appears twice, case-insensitively', () => {
    expect(
      headerValues(
        [
          { name: 'To', value: 'a@x.org' },
          { name: 'Subject', value: 'Hi' },
          { name: 'TO', value: 'b@x.org' },
        ],
        'to'
      )
    ).toBe('a@x.org, b@x.org');
    expect(headerValues(undefined, 'Cc')).toBe('');
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
