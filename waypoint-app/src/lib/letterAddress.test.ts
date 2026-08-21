import { describe, it, expect } from 'vitest';
import {
  extractSubject,
  buildSubject,
  pickRecipient,
  type AddressContact,
} from './letterAddress';

const CONTACTS: AddressContact[] = [
  { name: 'Keri Waller', email: 'kwaller@district.org', organization: 'school', role: 'Case Manager' },
  { name: 'Dr. Alicia Chen', email: 'achen@clinic.org', organization: 'medical' },
  { name: 'Sam Ortiz', email: null, organization: 'regional_center' },
  { name: 'Pat Nguyen', email: 'pat@rceb.org', organization: 'regional_center' },
];

const DRAFT = [
  'Subject: Request for IEP Meeting — Teddy Beebe',
  '',
  'Hi Keri,',
  '',
  'Could we add this wording to Teddy’s IEP at our next meeting?',
].join('\n');

describe('extractSubject', () => {
  it('pulls the subject line and removes it from the body', () => {
    const { subject, body } = extractSubject(DRAFT);
    expect(subject).toBe('Request for IEP Meeting — Teddy Beebe');
    expect(body.startsWith('Hi Keri,')).toBe(true);
    expect(body).not.toMatch(/^Subject:/m);
  });

  it('leaves a draft without one untouched', () => {
    const plain = 'Hi Keri,\n\nQuick question.';
    expect(extractSubject(plain)).toEqual({ subject: null, body: plain });
  });

  it('ignores a "Subject:" that appears inside the letter', () => {
    // Quoting an email thread must not hijack the compose window's subject
    const quoted = 'Hi Keri,\n\nYour email had Subject: Annual Review — please resend.';
    expect(extractSubject(quoted)).toEqual({ subject: null, body: quoted });

    const laterLine = 'Hi Keri,\n\nSubject: Annual Review\n\nwas what you sent.';
    expect(extractSubject(laterLine)).toEqual({ subject: null, body: laterLine });
  });
});

describe('buildSubject', () => {
  it('prefers the subject the draft wrote', () => {
    expect(
      buildSubject({ draftSubject: 'Request for IEP Meeting — Teddy Beebe', templateTitle: 'IEP Email' })
    ).toBe('Request for IEP Meeting — Teddy Beebe');
  });

  it('names the template and the child when the draft has none', () => {
    expect(
      buildSubject({ templateTitle: 'IEP Email', childFirstName: 'Teddy', familyLastName: 'Beebe' })
    ).toBe('IEP Email — Teddy Beebe');
  });

  it('falls back to the template alone rather than a dangling dash', () => {
    expect(buildSubject({ templateTitle: 'IEP Email' })).toBe('IEP Email');
    expect(buildSubject({ templateTitle: 'IEP Email', draftSubject: '   ' })).toBe('IEP Email');
  });
});

describe('pickRecipient', () => {
  it('addresses the person the letter greets by first name', () => {
    const match = pickRecipient(DRAFT, CONTACTS, 'school');
    expect(match.to).toEqual(['kwaller@district.org']);
    expect(match.reason).toBe('greeting');
    expect(match.contact?.name).toBe('Keri Waller');
  });

  it('matches a formal greeting by surname', () => {
    const formal = 'Dear Ms. Waller,\n\nI am writing to request…';
    expect(pickRecipient(formal, CONTACTS, 'school').to).toEqual(['kwaller@district.org']);
  });

  it('handles an honorific in the saved name too', () => {
    const formal = 'Dear Dr. Chen,\n\nThank you for seeing us.';
    expect(pickRecipient(formal, CONTACTS).contact?.name).toBe('Dr. Alicia Chen');
  });

  it('falls back to a contact at the right organization', () => {
    const noName = 'To whom it may concern,\n\nI am requesting records.';
    const match = pickRecipient(noName, CONTACTS, 'regional_center');
    expect(match.to).toEqual(['pat@rceb.org']);
    expect(match.reason).toBe('organization');
  });

  it('skips contacts with no email address', () => {
    // Sam Ortiz is the first regional_center contact but has no email
    expect(pickRecipient('Hi Sam,\n\nHello.', CONTACTS, 'regional_center').to).toEqual([
      'pat@rceb.org',
    ]);
  });

  it('returns nothing rather than guessing wrong', () => {
    expect(pickRecipient('Hi Taylor,\n\nHello.', CONTACTS).reason).toBe('none');
    expect(pickRecipient(DRAFT, []).to).toEqual([]);
  });
});
