import { describe, it, expect } from 'vitest';
import {
  fillKnownBlanks,
  analyzeBlanks,
  missingLetterFields,
  fieldForToken,
  sendReadiness,
  type LetterProfile,
} from './draftBlanks';

const FULL: LetterProfile = {
  parentFirstName: 'Sam',
  parentLastName: 'Rivera',
  email: 'sam@example.com',
  phone: '(510) 555-0134',
  childFirstName: 'Teddy',
  childGrade: '3rd',
  schoolName: 'Glenview Elementary',
  schoolDistrict: 'Oakland Unified',
  regionalCenter: 'Regional Center of the East Bay',
  insurance: 'Blue Shield',
};

const DRAFT = [
  'Subject: Request for IEP Meeting — Teddy [Last Name], Age 8',
  '',
  'Dear Ms. Waller,',
  '',
  'I am writing to request an IEP team meeting for my son, Teddy, who attends',
  '[school name] in the [grade] grade.',
  '',
  'I am available [list 2-3 dates/times that work].',
  '',
  'Sincerely,',
  'Sam [Last Name]',
  '[Phone number]',
].join('\n');

describe('fillKnownBlanks', () => {
  it('replaces every known placeholder with the saved value', () => {
    const { text, filled } = fillKnownBlanks(DRAFT, FULL);
    expect(text).toContain('Teddy Rivera, Age 8');
    expect(text).toContain('Glenview Elementary in the 3rd grade');
    expect(text).toContain('(510) 555-0134');
    expect(text).not.toContain('[Last Name]');
    expect(text).not.toContain('[school name]');
    expect(filled).toEqual(
      expect.arrayContaining(['Your last name', "Your child's school", "Your child's grade", 'Your phone number'])
    );
  });

  it('leaves blanks alone when the profile has no value', () => {
    const { text, filled } = fillKnownBlanks(DRAFT, { parentLastName: 'Rivera' });
    expect(text).toContain('Teddy Rivera');
    expect(text).toContain('[school name]'); // nothing saved → untouched
    expect(filled).toEqual(['Your last name']);
  });

  it('treats whitespace-only profile values as missing', () => {
    const { text } = fillKnownBlanks('Call me at [Phone number].', { phone: '   ' });
    expect(text).toBe('Call me at [Phone number].');
  });

  it('never touches the placeholders only the parent can answer', () => {
    const { text } = fillKnownBlanks(DRAFT, FULL);
    expect(text).toContain('[list 2-3 dates/times that work]');
  });

  it('matches the wording variants the model actually emits', () => {
    expect(fieldForToken('Your Last Name')?.key).toBe('parentLastName');
    expect(fieldForToken('phone')?.key).toBe('phone');
    expect(fieldForToken('Your Phone Number')?.key).toBe('phone');
    expect(fieldForToken('School Name')?.key).toBe('schoolName');
    expect(fieldForToken('current grade')?.key).toBe('childGrade');
    expect(fieldForToken("Child's Name")?.key).toBe('childFirstName');
    expect(fieldForToken('Insurance Provider')?.key).toBe('insurance');
    expect(fieldForToken('list 2-3 dates/times that work')).toBeNull();
  });
});

describe('analyzeBlanks', () => {
  it('splits remaining blanks into profile-fixable and parent-only', () => {
    const result = analyzeBlanks(DRAFT, { parentLastName: 'Rivera' });
    expect(result.fixableInProfile.map((f) => f.label)).toEqual(
      expect.arrayContaining(["Your child's school", "Your child's grade", 'Your phone number'])
    );
    expect(result.onlyYouKnow).toContain('[list 2-3 dates/times that work]');
    // Last name is saved, so it is not offered as a profile fix
    expect(result.fixableInProfile.some((f) => f.label === 'Your last name')).toBe(false);
  });

  it('dedupes repeated tokens', () => {
    const twice = 'Hi [Phone number], again [Phone number].';
    expect(analyzeBlanks(twice, {}).remaining).toEqual(['[Phone number]']);
  });

  it('reports nothing for a fully filled draft', () => {
    const { text } = fillKnownBlanks('Dear team, I am [Your Name].', FULL);
    const result = analyzeBlanks(text.replace('[Your Name]', 'Sam Rivera'), FULL);
    expect(result.remaining).toHaveLength(0);
    expect(result.fixableInProfile).toHaveLength(0);
  });
});

describe('missingLetterFields', () => {
  it('names the gaps worth nudging about', () => {
    const labels = missingLetterFields({ parentLastName: 'Rivera' }).map((f) => f.label);
    expect(labels).toEqual(
      expect.arrayContaining(['Your phone number', "Your child's school", "Your child's grade"])
    );
    expect(labels).not.toContain('Your last name');
  });

  it('is empty once the profile is complete', () => {
    expect(missingLetterFields(FULL)).toHaveLength(0);
  });
});

describe('sendReadiness — the "Send turns on when it is ready" gate', () => {
  const clean = 'Dear Ms. Ruiz, I am following up on my request. Thank you.';
  const withBlank = 'Dear Ms. Ruiz, please respond by [DATE] about [SERVICE]. Thank you.';

  it('a clean draft with a recipient can be sent directly', () => {
    const r = sendReadiness(clean, {}, true);
    expect(r).toEqual({ blanksLeft: 0, needsRecipient: false, canSend: true });
  });

  it('a draft with unfilled bracket blanks cannot be sent directly', () => {
    const r = sendReadiness(withBlank, {}, true);
    expect(r.blanksLeft).toBe(2);
    expect(r.canSend).toBe(false);
  });

  it('no recipient blocks a direct send even when the draft is clean', () => {
    const r = sendReadiness(clean, {}, false);
    expect(r.needsRecipient).toBe(true);
    expect(r.canSend).toBe(false);
  });

  it('a long descriptive placeholder is still a blank — no length cap lets it slip through', () => {
    const longFill =
      'Dear team, my child needs help [Describe your child\'s specific functional limitations and how the denied service directly addresses each one in detail]. Thank you.';
    const r = sendReadiness(longFill, {}, true);
    expect(r.blanksLeft).toBe(1);
    expect(r.canSend).toBe(false);
  });

  it('a blank that the profile can fill is no longer a blank', () => {
    // "[Child First Name]" resolves from the profile, so it is not left in the draft.
    const filled = fillKnownBlanks('Hello, this is about [Child First Name].', { childFirstName: 'Sofia' });
    expect(sendReadiness(filled.text, { childFirstName: 'Sofia' }, true).canSend).toBe(true);
  });
});
